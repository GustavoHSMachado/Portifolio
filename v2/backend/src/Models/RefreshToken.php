<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Refresh tokens rotativos com detecção de reuso.
 *
 * Se um token já rotacionado for reapresentado, isso indica roubo:
 * toda a família de tokens daquele dispositivo é revogada de imediato.
 */
final class RefreshToken
{
    public function __construct(private readonly Connection $db)
    {
    }

    public function issue(int $userId, string $familyId, int $ttlDays, ?string $userAgent, string $ip): string
    {
        $token = bin2hex(random_bytes(32));

        $this->db->run(
            'INSERT INTO refresh_tokens
                (user_id, family_id, token_hash, user_agent, ip_address, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW())',
            [$userId, $familyId, hash('sha256', $token), mb_substr((string) $userAgent, 0, 255), $ip, $ttlDays]
        );

        return $token;
    }

    /** @return array<string,mixed>|null */
    public function find(string $token): ?array
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return null;
        }

        return $this->db->first(
            'SELECT id, user_id, family_id, revoked_at, rotated_at, expires_at
               FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
            [hash('sha256', $token)]
        );
    }

    public function markRotated(int $id): void
    {
        $this->db->run('UPDATE refresh_tokens SET rotated_at = NOW() WHERE id = ?', [$id]);
    }

    /** Revoga a família inteira — usado no logout e na detecção de reuso. */
    public function revokeFamily(string $familyId): void
    {
        $this->db->run(
            'UPDATE refresh_tokens SET revoked_at = NOW()
              WHERE family_id = ? AND revoked_at IS NULL',
            [$familyId]
        );
    }

    public function revokeAllForUser(int $userId): void
    {
        $this->db->run(
            'UPDATE refresh_tokens SET revoked_at = NOW()
              WHERE user_id = ? AND revoked_at IS NULL',
            [$userId]
        );
    }

    /** @param array<string, mixed> $row */
    public function isUsable(array $row): bool
    {
        return $row['revoked_at'] === null
            && $row['rotated_at'] === null
            && new \DateTimeImmutable($row['expires_at']) > new \DateTimeImmutable();
    }
}
