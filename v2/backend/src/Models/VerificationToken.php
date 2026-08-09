<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Tokens de uso único para confirmação de e-mail e redefinição de senha.
 *
 * Decisões de segurança:
 * - 32 bytes de entropia (256 bits) via random_bytes;
 * - só o SHA-256 do token é persistido — vazar o banco não permite usar os tokens;
 * - expiração curta e consumo único (used_at);
 * - comparação com hash_equals (tempo constante).
 */
final class VerificationToken
{
    public const PURPOSE_EMAIL_VERIFICATION = 'email_verification';
    public const PURPOSE_PASSWORD_RESET     = 'password_reset';

    public function __construct(private readonly Connection $db)
    {
    }

    /** Cria o token e devolve o valor em claro (única oportunidade de lê-lo). */
    public function issue(int $userId, string $purpose, int $ttlMinutes): string
    {
        $token = bin2hex(random_bytes(32));

        // Um token ativo por propósito: emitir um novo invalida o anterior.
        $this->db->run(
            'DELETE FROM verification_tokens WHERE user_id = ? AND purpose = ?',
            [$userId, $purpose]
        );

        $this->db->run(
            'INSERT INTO verification_tokens (user_id, purpose, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())',
            [$userId, $purpose, hash('sha256', $token), $ttlMinutes]
        );

        return $token;
    }

    /** @return array<string,mixed>|null o registro válido, ou null */
    public function findValid(string $token, string $purpose): ?array
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return null;
        }

        $row = $this->db->first(
            'SELECT id, user_id, token_hash, expires_at, used_at
               FROM verification_tokens
              WHERE token_hash = ? AND purpose = ?
              LIMIT 1',
            [hash('sha256', $token), $purpose]
        );

        if ($row === null || $row['used_at'] !== null) {
            return null;
        }

        if (new \DateTimeImmutable($row['expires_at']) < new \DateTimeImmutable()) {
            return null;
        }

        // Redundante com o WHERE, mas mantém a comparação em tempo constante explícita.
        if (!hash_equals($row['token_hash'], hash('sha256', $token))) {
            return null;
        }

        return $row;
    }

    public function consume(int $tokenId): void
    {
        $this->db->run(
            'UPDATE verification_tokens SET used_at = NOW() WHERE id = ? AND used_at IS NULL',
            [$tokenId]
        );
    }

    /** Housekeeping — chamado por cron. */
    public function purgeExpired(): int
    {
        return $this->db->run(
            'DELETE FROM verification_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY)'
        )->rowCount();
    }
}
