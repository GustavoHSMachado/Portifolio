<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Aceite dos documentos legais.
 *
 * A LGPD exige consentimento *demonstrável* (art. 8º, §1º). Registrar apenas
 * "aceitou = true" não cumpre isso: se o texto mudar, não há como provar a
 * qual versão o usuário consentiu. Por isso a versão faz parte do registro.
 */
final class LegalAcceptance
{
    public const DOC_TERMS = 'terms';
    public const DOC_PRIVACY = 'privacy';

    public function __construct(private readonly Connection $db)
    {
    }

    public function record(int $userId, string $document, string $version, string $ip, ?string $userAgent): void
    {
        $this->db->run(
            'INSERT INTO legal_acceptances (user_id, document, version, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE accepted_at = accepted_at',
            [$userId, $document, $version, $ip, mb_substr((string) $userAgent, 0, 255)]
        );
    }

    /** @return list<array<string,mixed>> */
    public function forUser(int $userId): array
    {
        return $this->db->all(
            'SELECT document, version, accepted_at FROM legal_acceptances
              WHERE user_id = ? ORDER BY accepted_at DESC',
            [$userId]
        );
    }

    /** O usuário já aceitou a versão vigente de ambos os documentos? */
    public function isCurrent(int $userId, string $termsVersion, string $privacyVersion): bool
    {
        $rows = $this->db->all(
            'SELECT document FROM legal_acceptances
              WHERE user_id = ?
                AND ((document = ? AND version = ?) OR (document = ? AND version = ?))',
            [$userId, self::DOC_TERMS, $termsVersion, self::DOC_PRIVACY, $privacyVersion]
        );

        return count($rows) === 2;
    }
}
