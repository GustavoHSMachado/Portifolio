<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/** Mensagens de sugestão ou dúvida enviadas pelo formulário público. */
final class Message
{
    public function __construct(private readonly Connection $db)
    {
    }

    public function create(
        string $name,
        string $email,
        ?string $subject,
        string $body,
        string $ip,
        ?string $userAgent,
    ): int {
        $this->db->run(
            'INSERT INTO messages (name, email, subject, body, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [
                $name,
                mb_strtolower($email),
                $subject,
                $body,
                $ip,
                $userAgent === null ? null : mb_substr($userAgent, 0, 255),
            ]
        );

        return $this->db->lastInsertId();
    }

    /** @return list<array<string,mixed>> */
    public function recent(int $limit = 50): array
    {
        return $this->db->all(
            'SELECT id, name, email, subject, body, status, created_at
               FROM messages
              ORDER BY created_at DESC, id DESC
              LIMIT ' . max(1, $limit)
        );
    }

    public function markRead(int $id): void
    {
        $this->db->run(
            "UPDATE messages SET status = 'lida' WHERE id = ? AND status = 'nova'",
            [$id]
        );
    }

    /**
     * Housekeeping — chamado por database/purge.php.
     *
     * Mensagem guardada para sempre e-mail e IP de quem escreveu uma vez, o que
     * a LGPD não espera de um formulário de contato. Um ano cobre a consulta
     * que alguém possa retomar meses depois.
     */
    public function purgeOld(int $days = 365): int
    {
        return $this->db->run(
            'DELETE FROM messages WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$days]
        )->rowCount();
    }
}
