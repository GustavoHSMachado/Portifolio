<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Core\Config;
use App\Models\PasswordHistory;
use App\Models\RefreshToken;
use App\Models\User;
use App\Models\VerificationToken;
use App\Support\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\DatabaseTestCase;

/**
 * Integração sobre MySQL real, com as migrações de produção aplicadas.
 *
 * A versão anterior montava um schema equivalente à mão em SQLite. Isso trazia
 * dois problemas: o schema divergia das migrações sem ninguém perceber, e a
 * emissão de token precisava ser simulada com INSERT manual, porque o SQLite
 * não tem DATE_ADD — ou seja, o caminho de código que importa não era exercitado.
 */
final class AuthFlowTest extends DatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Config::set('JWT_SECRET', str_repeat('b', 64));
    }

    private function seedUser(
        string $email = 'gustavo@example.com',
        string $password = 'umaSenhaBoa123',
    ): int {
        $this->db->run(
            "INSERT INTO users (name, email, phone, password_hash, role, email_verified_at)
             VALUES (?, ?, ?, ?, 'user', NOW())",
            ['Gustavo', $email, '31986585208', Hash::make($password)]
        );

        return $this->db->lastInsertId();
    }

    #[Test]
    public function senha_nunca_e_persistida_em_texto_plano(): void
    {
        $this->seedUser(password: 'umaSenhaBoa123');

        $row = $this->db->first('SELECT password_hash FROM users LIMIT 1')
            ?? self::fail('o usuário semeado não foi encontrado');

        self::assertNotSame('umaSenhaBoa123', $row['password_hash']);
        self::assertTrue(Hash::verify('umaSenhaBoa123', (string) $row['password_hash']));
    }

    #[Test]
    public function token_de_reset_e_de_uso_unico(): void
    {
        $userId = $this->seedUser();
        $tokens = new VerificationToken($this->db);

        // Agora passa pelo issue() de verdade, e não por um INSERT simulado.
        $token = $tokens->issue($userId, VerificationToken::PURPOSE_PASSWORD_RESET, 30);

        $found = $tokens->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET);
        self::assertNotNull($found, 'token válido deveria ser encontrado');

        $tokens->consume((int) $found['id']);

        self::assertNull(
            $tokens->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET),
            'token consumido não pode ser reutilizado'
        );
    }

    #[Test]
    public function emitir_token_novo_invalida_o_anterior(): void
    {
        $userId = $this->seedUser();
        $tokens = new VerificationToken($this->db);

        $primeiro = $tokens->issue($userId, VerificationToken::PURPOSE_PASSWORD_RESET, 30);
        $segundo = $tokens->issue($userId, VerificationToken::PURPOSE_PASSWORD_RESET, 30);

        self::assertNull(
            $tokens->findValid($primeiro, VerificationToken::PURPOSE_PASSWORD_RESET),
            'pedir uma nova recuperação precisa derrubar o link anterior'
        );
        self::assertNotNull(
            $tokens->findValid($segundo, VerificationToken::PURPOSE_PASSWORD_RESET)
        );
    }

    #[Test]
    public function token_expirado_e_rejeitado(): void
    {
        $userId = $this->seedUser();
        $token = bin2hex(random_bytes(32));

        $this->db->run(
            "INSERT INTO verification_tokens (user_id, purpose, token_hash, expires_at)
             VALUES (?, 'password_reset', ?, DATE_SUB(NOW(), INTERVAL 1 MINUTE))",
            [$userId, hash('sha256', $token)]
        );

        self::assertNull(
            (new VerificationToken($this->db))
                ->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET)
        );
    }

    #[Test]
    public function token_de_proposito_errado_nao_serve(): void
    {
        $userId = $this->seedUser();
        $tokens = new VerificationToken($this->db);

        $token = $tokens->issue($userId, VerificationToken::PURPOSE_EMAIL_VERIFICATION, 30);

        self::assertNull($tokens->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET));
        self::assertNotNull($tokens->findValid($token, VerificationToken::PURPOSE_EMAIL_VERIFICATION));
    }

    #[Test]
    public function token_malformado_nao_toca_o_banco(): void
    {
        $tokens = new VerificationToken($this->db);

        self::assertNull($tokens->findValid("' OR 1=1 --", VerificationToken::PURPOSE_PASSWORD_RESET));
        self::assertNull($tokens->findValid('curto', VerificationToken::PURPOSE_PASSWORD_RESET));
    }

    #[Test]
    public function reuso_de_refresh_token_e_detectavel(): void
    {
        $userId = $this->seedUser();
        $familyId = bin2hex(random_bytes(16));
        $token = bin2hex(random_bytes(32));

        $this->db->run(
            'INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
            [$userId, $familyId, hash('sha256', $token)]
        );

        $refresh = new RefreshToken($this->db);
        $row = $refresh->find($token) ?? self::fail('o refresh token não foi encontrado');

        self::assertTrue($refresh->isUsable($row));

        $refresh->markRotated((int) $row['id']);

        $reused = $refresh->find($token) ?? self::fail('o token rotacionado sumiu do banco');

        self::assertNotNull($reused['rotated_at'], 'token rotacionado deve ficar marcado');
        self::assertFalse($refresh->isUsable($reused));
    }

    #[Test]
    public function revogar_familia_derruba_todos_os_tokens_da_sessao(): void
    {
        $userId = $this->seedUser();
        $familyId = bin2hex(random_bytes(16));
        $refresh = new RefreshToken($this->db);

        $tokens = [];

        foreach (range(1, 3) as $ignored) {
            $token = bin2hex(random_bytes(32));

            $this->db->run(
                'INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
                 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
                [$userId, $familyId, hash('sha256', $token)]
            );

            $tokens[] = $token;
        }

        $refresh->revokeFamily($familyId);

        foreach ($tokens as $token) {
            $row = $refresh->find($token) ?? self::fail('token da família sumiu do banco');

            self::assertFalse($refresh->isUsable($row));
        }
    }

    #[Test]
    public function to_public_nao_vaza_hash_de_senha(): void
    {
        $this->seedUser();

        $row = $this->db->first('SELECT * FROM users LIMIT 1')
            ?? self::fail('o usuário semeado não foi encontrado');

        $public = User::toPublic($row);

        self::assertArrayNotHasKey('password_hash', $public);
        self::assertArrayNotHasKey('failed_attempts', $public);
        self::assertArrayHasKey('email', $public);
    }

    #[Test]
    public function senha_ja_usada_e_reconhecida(): void
    {
        $userId  = $this->seedUser(password: 'PrimeiraS1!');
        $history = new PasswordHistory($this->db);

        $history->recordCurrent($userId);

        self::assertTrue(
            $history->wasUsed($userId, 'PrimeiraS1!'),
            'a senha em vigor precisa contar como já usada'
        );
        self::assertFalse(
            $history->wasUsed($userId, 'NuncaUsada9#'),
            'uma senha inédita não pode ser recusada'
        );
    }

    #[Test]
    public function historico_guarda_apenas_as_ultimas_senhas(): void
    {
        $userId  = $this->seedUser(password: 'Senha000!');
        $history = new PasswordHistory($this->db);
        $limite  = $history->size();

        // Uma a mais que o limite: a primeira precisa cair fora.
        $senhas = [];
        for ($i = 0; $i <= $limite; $i++) {
            $senha    = sprintf('Senha%03d!', $i);
            $senhas[] = $senha;

            $this->db->run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [Hash::make($senha), $userId]
            );
            $history->recordCurrent($userId);
        }

        $total = $this->db->first(
            'SELECT COUNT(*) AS total FROM password_history WHERE user_id = ?',
            [$userId]
        ) ?? self::fail('contagem do histórico falhou');

        self::assertSame($limite, (int) $total['total']);

        // A mais antiga saiu e pode voltar a ser usada; a mais recente, não.
        self::assertFalse($history->wasUsed($userId, $senhas[0]));
        self::assertTrue($history->wasUsed($userId, $senhas[count($senhas) - 1]));
    }
    #[Test]
    public function excluir_a_conta_libera_o_e_mail_para_um_novo_cadastro(): void
    {
        $users  = new User($this->db);
        $userId = $this->seedUser('quer-sair@example.com');

        self::assertTrue($users->emailExists('quer-sair@example.com'));

        $users->softDelete($userId);

        // Sem a anonimização, uq_users_email seguraria o endereço para sempre e
        // a pessoa nunca mais conseguiria voltar com o mesmo e-mail.
        self::assertFalse(
            $users->emailExists('quer-sair@example.com'),
            'o e-mail deveria voltar a ficar disponível após a exclusão'
        );

        self::assertNull($users->findById($userId), 'conta excluída não pode ser encontrada');
        self::assertNull(
            $users->findByEmailWithSecret('quer-sair@example.com'),
            'conta excluída não pode autenticar'
        );

        $row = $this->db->first('SELECT email, name, phone, deleted_at FROM users WHERE id = ?', [$userId])
            ?? self::fail('a linha deveria continuar existindo, para preservar as chaves estrangeiras');

        self::assertNotNull($row['deleted_at']);
        self::assertStringNotContainsString('quer-sair', (string) $row['email']);
        self::assertNull($row['phone'], 'o telefone é dado pessoal e sai junto');
    }

    #[Test]
    public function excluir_duas_contas_com_o_mesmo_e_mail_nao_colide(): void
    {
        $users = new User($this->db);

        // O caso que um indice unico composto com deleted_at nao resolveria.
        $primeiro = $this->seedUser('reincidente@example.com');
        $users->softDelete($primeiro);

        $segundo = $this->seedUser('reincidente@example.com');
        $users->softDelete($segundo);

        $excluidos = $this->db->first(
            'SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NOT NULL'
        ) ?? self::fail('consulta de contagem falhou');

        self::assertSame(2, (int) $excluidos['total']);
        self::assertFalse($users->emailExists('reincidente@example.com'));
    }
}
