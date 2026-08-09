<?php

declare(strict_types=1);

namespace App\Services;

use App\Database\Connection;

/**
 * Rate limiter de janela fixa, persistido no banco.
 *
 * Escolha consciente: o projeto não tem Redis. Janela fixa em MySQL resolve
 * o caso de uso (força bruta em login) sem adicionar infra. Se o tráfego crescer,
 * trocar por Redis + sliding window é uma mudança localizada nesta classe.
 */
final class RateLimiter
{
    public function __construct(private readonly Connection $db)
    {
    }

    public function hit(string $key, int $maxAttempts, int $windowSeconds): RateLimitResult
    {
        $hash = hash('sha256', $key);
        $now  = new \DateTimeImmutable();

        $row = $this->db->first(
            'SELECT id, attempts, window_start FROM rate_limits WHERE bucket_key = ? LIMIT 1',
            [$hash]
        );

        if ($row === null) {
            $this->db->run(
                'INSERT INTO rate_limits (bucket_key, attempts, window_start)
                 VALUES (?, 1, NOW())
                 ON DUPLICATE KEY UPDATE attempts = attempts + 1',
                [$hash]
            );

            return new RateLimitResult(true, $maxAttempts - 1, $windowSeconds);
        }

        $windowStart = new \DateTimeImmutable($row['window_start']);
        $elapsed     = $now->getTimestamp() - $windowStart->getTimestamp();

        if ($elapsed >= $windowSeconds) {
            $this->db->run(
                'UPDATE rate_limits SET attempts = 1, window_start = NOW() WHERE id = ?',
                [$row['id']]
            );

            return new RateLimitResult(true, $maxAttempts - 1, $windowSeconds);
        }

        $attempts   = (int) $row['attempts'] + 1;
        $retryAfter = $windowSeconds - $elapsed;

        if ($attempts > $maxAttempts) {
            return new RateLimitResult(false, 0, $retryAfter);
        }

        $this->db->run('UPDATE rate_limits SET attempts = ? WHERE id = ?', [$attempts, $row['id']]);

        return new RateLimitResult(true, $maxAttempts - $attempts, $retryAfter);
    }

    public function clear(string $key): void
    {
        $this->db->run('DELETE FROM rate_limits WHERE bucket_key = ?', [hash('sha256', $key)]);
    }

    /** Housekeeping — chamado por cron. */
    public function purge(int $olderThanSeconds = 86400): int
    {
        return $this->db->run(
            'DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL ? SECOND)',
            [$olderThanSeconds]
        )->rowCount();
    }
}
