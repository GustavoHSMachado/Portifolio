<?php
declare(strict_types=1);

/**
 * Reset de senha por token de uso único e expiração.
 * Antes: o link enviava apenas ?email=... — qualquer pessoa podia trocar a senha
 * de qualquer conta chamando VerifyResetPassword.php diretamente (account takeover).
 */
final class PasswordReset
{
    private const TTL_MINUTES = 30;

    /** Cria um token e devolve o valor em claro (só o hash é persistido). */
    public static function create(string $email): string
    {
        $token     = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expires   = (new DateTimeImmutable('+' . self::TTL_MINUTES . ' minutes'))->format('Y-m-d H:i:s');

        Database::run('DELETE FROM password_resets WHERE email = ?', [$email]);
        Database::run(
            'INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)',
            [$email, $tokenHash, $expires]
        );

        return $token;
    }

    /** Valida o token e devolve o e-mail associado, ou null. */
    public static function validate(string $email, string $token): ?string
    {
        $row = Database::run(
            'SELECT email, token_hash, expires_at, used_at FROM password_resets WHERE email = ? LIMIT 1',
            [$email]
        )->fetch();

        if (!$row || $row['used_at'] !== null) {
            return null;
        }
        if (new DateTimeImmutable($row['expires_at']) < new DateTimeImmutable()) {
            return null;
        }
        if (!hash_equals($row['token_hash'], hash('sha256', $token))) {
            return null;
        }

        return $row['email'];
    }

    public static function consume(string $email): void
    {
        Database::run('UPDATE password_resets SET used_at = NOW() WHERE email = ?', [$email]);
    }
}
