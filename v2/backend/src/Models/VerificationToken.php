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
    public const PURPOSE_PASSWORD_RESET = 'password_reset';
    public const PURPOSE_LOGIN_2FA = 'login_2fa';

    /** Dígitos do código enviado por e-mail. */
    public const CODE_LENGTH = 7;

    /**
     * Tentativas por código antes de queimá-lo.
     *
     * Sete dígitos são 10 milhões de combinações — muito para um humano, pouco
     * para um script. O limite por IP não basta sozinho: quem distribui as
     * tentativas por vários endereços continua atacando a mesma conta. Este
     * contador vive no código, e não em quem tenta.
     */
    public const MAX_ATTEMPTS = 5;

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

    /**
     * Emite um código numérico curto, para ser digitado à mão.
     *
     * random_int é gerador criptográfico: um código de login previsível seria o
     * mesmo que não ter segundo fator. O valor é guardado em hash, como o token
     * longo — quem ler o banco não fica com o código na mão.
     *
     * Zeros à esquerda são preservados pelo str_pad, senão "0042181" viraria
     * "42181" e o usuário digitaria o que recebeu sem nunca conseguir entrar.
     */
    public function issueCode(int $userId, string $purpose, int $ttlMinutes): string
    {
        $maximo = (10 ** self::CODE_LENGTH) - 1;
        $code = str_pad((string) random_int(0, $maximo), self::CODE_LENGTH, '0', STR_PAD_LEFT);

        $this->db->run(
            'DELETE FROM verification_tokens WHERE user_id = ? AND purpose = ?',
            [$userId, $purpose]
        );

        $this->db->run(
            'INSERT INTO verification_tokens (user_id, purpose, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())',
            [$userId, $purpose, hash('sha256', $code), $ttlMinutes]
        );

        return $code;
    }

    /**
     * Valida um código numérico de um usuário conhecido.
     *
     * Diferente de findValid, que busca pelo token: um código de 7 dígitos não
     * é único no sistema, então a busca parte do usuário e do propósito.
     *
     * Cada tentativa errada incrementa o contador, e ao chegar em MAX_ATTEMPTS o
     * código é queimado — quem errou cinco vezes recomeça o fluxo em vez de
     * continuar tentando.
     *
     * @return array<string,mixed>|null o registro válido, ou null
     */
    public function findValidCode(int $userId, string $code, string $purpose): ?array
    {
        if (preg_match('/^\d{' . self::CODE_LENGTH . '}$/', $code) !== 1) {
            return null;
        }

        $row = $this->db->first(
            'SELECT id, user_id, token_hash, attempts, expires_at, used_at
               FROM verification_tokens
              WHERE user_id = ? AND purpose = ?
              LIMIT 1',
            [$userId, $purpose]
        );

        if ($row === null || $row['used_at'] !== null) {
            return null;
        }

        if (new \DateTimeImmutable($row['expires_at']) < new \DateTimeImmutable()) {
            return null;
        }

        if ((int) $row['attempts'] >= self::MAX_ATTEMPTS) {
            $this->consume((int) $row['id']);

            return null;
        }

        if (!hash_equals((string) $row['token_hash'], hash('sha256', $code))) {
            $this->db->run(
                'UPDATE verification_tokens SET attempts = attempts + 1 WHERE id = ?',
                [$row['id']]
            );

            return null;
        }

        return $row;
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

    /** Housekeeping — chamado por database/purge.php. */
    public function purgeExpired(int $graceDays = 7): int
    {
        return $this->db->run(
            'DELETE FROM verification_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$graceDays]
        )->rowCount();
    }
}
