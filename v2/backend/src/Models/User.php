<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;
use App\Support\Hash;

/**
 * Model de usuário. Toda escrita passa por aqui — nenhum controller monta SQL.
 * A senha nunca sai deste model em texto plano nem é serializada.
 */
final class User
{
    public const ROLE_USER  = 'user';
    public const ROLE_ADMIN = 'admin';

    public function __construct(private readonly Connection $db)
    {
    }

    /** @return array<string,mixed>|null */
    public function findById(int $id): ?array
    {
        return $this->db->first(
            'SELECT id, name, email, phone, role, email_verified_at, created_at, updated_at
             FROM users WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
    }

    /** Inclui o hash da senha — use somente no fluxo de autenticação. */
    public function findByEmailWithSecret(string $email): ?array
    {
        return $this->db->first(
            'SELECT id, name, email, phone, role, password_hash, email_verified_at,
                    failed_attempts, locked_until
             FROM users WHERE email = ? AND deleted_at IS NULL',
            [mb_strtolower($email)]
        );
    }

    public function emailExists(string $email): bool
    {
        return $this->db->first(
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [mb_strtolower($email)]
        ) !== null;
    }

    public function create(string $name, string $email, string $phone, string $password): int
    {
        $this->db->run(
            'INSERT INTO users (name, email, phone, password_hash, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [$name, mb_strtolower($email), $phone, Hash::make($password), self::ROLE_USER]
        );

        return $this->db->lastInsertId();
    }

    public function updateProfile(int $id, string $name, string $phone): void
    {
        $this->db->run(
            'UPDATE users SET name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
            [$name, $phone, $id]
        );
    }

    /** Troca a senha e invalida todas as sessões ativas do usuário. */
    public function updatePassword(int $id, string $newPassword): void
    {
        $this->db->run(
            'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW()
             WHERE id = ?',
            [Hash::make($newPassword), $id]
        );
    }

    public function markEmailVerified(int $id): void
    {
        $this->db->run(
            'UPDATE users SET email_verified_at = NOW(), updated_at = NOW()
             WHERE id = ? AND email_verified_at IS NULL',
            [$id]
        );
    }

    /** Trava progressiva da conta após tentativas falhas (defesa contra força bruta). */
    public function registerFailedAttempt(int $id, int $threshold = 5, int $lockMinutes = 15): void
    {
        $this->db->run(
            'UPDATE users
                SET failed_attempts = failed_attempts + 1,
                    locked_until = CASE WHEN failed_attempts + 1 >= ?
                                        THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
                                        ELSE locked_until END
              WHERE id = ?',
            [$threshold, $lockMinutes, $id]
        );
    }

    public function clearFailedAttempts(int $id): void
    {
        $this->db->run(
            'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
             WHERE id = ?',
            [$id]
        );
    }

    public function isLocked(array $user): bool
    {
        return $user['locked_until'] !== null
            && new \DateTimeImmutable($user['locked_until']) > new \DateTimeImmutable();
    }

    /** Remove campos sensíveis antes de devolver o usuário na API. */
    public static function toPublic(array $user): array
    {
        return [
            'id'             => (int) $user['id'],
            'name'           => $user['name'],
            'email'          => $user['email'],
            'phone'          => $user['phone'] ?? null,
            'role'           => $user['role'],
            'emailVerified'  => !empty($user['email_verified_at']),
            'createdAt'      => $user['created_at'] ?? null,
        ];
    }
}
