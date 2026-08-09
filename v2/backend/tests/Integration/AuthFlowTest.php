<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Core\Config;
use App\Database\Connection;
use App\Models\RefreshToken;
use App\Models\User;
use App\Models\VerificationToken;
use App\Support\Hash;
use PDO;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Integração sobre SQLite em memória: exercita models e regras de token
 * sem depender de um MySQL rodando no CI.
 *
 * Limitação conhecida: as migrações reais são MySQL. O schema abaixo é o
 * equivalente SQLite e precisa ser mantido em sincronia — ver ADR-006 em
 * docs/ARQUITETURA.md. Testes que dependem de sintaxe MySQL específica
 * (DATE_ADD, ON DUPLICATE KEY) rodam no job `integration-mysql` do CI.
 */
final class AuthFlowTest extends TestCase
{
    private Connection $db;

    protected function setUp(): void
    {
        Config::set('JWT_SECRET', str_repeat('b', 64));

        $pdo = new PDO('sqlite::memory:', options: [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $pdo->exec(<<<'SQL'
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                email_verified_at TEXT,
                password_changed_at TEXT,
                failed_attempts INTEGER NOT NULL DEFAULT 0,
                locked_until TEXT,
                last_login_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT
            );
            CREATE TABLE verification_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                purpose TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                used_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                family_id TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                user_agent TEXT,
                ip_address TEXT,
                expires_at TEXT NOT NULL,
                rotated_at TEXT,
                revoked_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        SQL);

        $this->db = new Connection();
        $this->db->setPdo($pdo);
    }

    private function seedUser(string $email = 'gustavo@example.com', string $password = 'umaSenhaBoa123'): int
    {
        $this->db->run(
            "INSERT INTO users (name, email, phone, password_hash, role, email_verified_at)
             VALUES (?, ?, ?, ?, 'user', datetime('now'))",
            ['Gustavo', $email, '31986585208', Hash::make($password)]
        );

        return $this->db->lastInsertId();
    }

    #[Test]
    public function senha_nunca_e_persistida_em_texto_plano(): void
    {
        $this->seedUser(password: 'umaSenhaBoa123');

        $row = $this->db->first('SELECT password_hash FROM users LIMIT 1');

        self::assertNotSame('umaSenhaBoa123', $row['password_hash']);
        self::assertTrue(Hash::verify('umaSenhaBoa123', $row['password_hash']));
    }

    #[Test]
    public function token_de_reset_e_de_uso_unico(): void
    {
        $userId = $this->seedUser();

        // Emissão manual (a query do model usa DATE_ADD, que é MySQL).
        $token = bin2hex(random_bytes(32));
        $this->db->run(
            "INSERT INTO verification_tokens (user_id, purpose, token_hash, expires_at)
             VALUES (?, 'password_reset', ?, datetime('now', '+30 minutes'))",
            [$userId, hash('sha256', $token)]
        );

        $tokens = new VerificationToken($this->db);

        $found = $tokens->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET);
        self::assertNotNull($found, 'Token válido deveria ser encontrado');

        $tokens->consume((int) $found['id']);

        self::assertNull(
            $tokens->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET),
            'Token consumido não pode ser reutilizado'
        );
    }

    #[Test]
    public function token_expirado_e_rejeitado(): void
    {
        $userId = $this->seedUser();
        $token = bin2hex(random_bytes(32));

        $this->db->run(
            "INSERT INTO verification_tokens (user_id, purpose, token_hash, expires_at)
             VALUES (?, 'password_reset', ?, datetime('now', '-1 minute'))",
            [$userId, hash('sha256', $token)]
        );

        self::assertNull(
            (new VerificationToken($this->db))->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET)
        );
    }

    #[Test]
    public function token_de_proposito_errado_nao_serve(): void
    {
        $userId = $this->seedUser();
        $token = bin2hex(random_bytes(32));

        $this->db->run(
            "INSERT INTO verification_tokens (user_id, purpose, token_hash, expires_at)
             VALUES (?, 'email_verification', ?, datetime('now', '+30 minutes'))",
            [$userId, hash('sha256', $token)]
        );

        $tokens = new VerificationToken($this->db);

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
            "INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
             VALUES (?, ?, ?, datetime('now', '+30 days'))",
            [$userId, $familyId, hash('sha256', $token)]
        );

        $refresh = new RefreshToken($this->db);
        $row = $refresh->find($token);

        self::assertNotNull($row);
        self::assertTrue($refresh->isUsable($row));

        $refresh->markRotated((int) $row['id']);

        $reused = $refresh->find($token);
        self::assertNotNull($reused['rotated_at'], 'Token rotacionado deve ficar marcado');
        self::assertFalse($refresh->isUsable($reused));
    }

    #[Test]
    public function revogar_familia_derruba_todos_os_tokens_da_sessao(): void
    {
        $userId = $this->seedUser();
        $familyId = bin2hex(random_bytes(16));
        $refresh = new RefreshToken($this->db);

        $tokens = [];
        foreach (range(1, 3) as $i) {
            $t = bin2hex(random_bytes(32));
            $this->db->run(
                "INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
                 VALUES (?, ?, ?, datetime('now', '+30 days'))",
                [$userId, $familyId, hash('sha256', $t)]
            );
            $tokens[] = $t;
        }

        $refresh->revokeFamily($familyId);

        foreach ($tokens as $t) {
            self::assertFalse($refresh->isUsable($refresh->find($t)));
        }
    }

    #[Test]
    public function to_public_nao_vaza_hash_de_senha(): void
    {
        $this->seedUser();
        $row = $this->db->first('SELECT * FROM users LIMIT 1');

        $public = User::toPublic($row);

        self::assertArrayNotHasKey('password_hash', $public);
        self::assertArrayNotHasKey('failed_attempts', $public);
        self::assertArrayHasKey('email', $public);
    }
}
