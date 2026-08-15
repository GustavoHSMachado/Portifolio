<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Core\Config;
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
}
