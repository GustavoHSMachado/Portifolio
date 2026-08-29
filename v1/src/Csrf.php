<?php
declare(strict_types=1);

/**
 * Proteção CSRF por token de sessão (OWASP - Synchronizer Token Pattern).
 */
final class Csrf
{
    private const KEY = '_csrf_token';

    public static function token(): string
    {
        if (empty($_SESSION[self::KEY])) {
            $_SESSION[self::KEY] = bin2hex(random_bytes(32));
        }
        return $_SESSION[self::KEY];
    }

    /** Campo hidden pronto para inserir no formulário. */
    public static function field(): string
    {
        return '<input type="hidden" name="' . self::KEY . '" value="' . htmlspecialchars(self::token(), ENT_QUOTES, 'UTF-8') . '" />';
    }

    public static function check(?string $token): bool
    {
        return is_string($token)
            && !empty($_SESSION[self::KEY])
            && hash_equals($_SESSION[self::KEY], $token);
    }

    /** Aborta a requisição se o token for inválido. */
    public static function verifyOrFail(): void
    {
        if (!self::check($_POST[self::KEY] ?? null)) {
            error_log('[CSRF] Token inválido em ' . ($_SERVER['REQUEST_URI'] ?? '?'));
            http_response_code(419);
            exit('Sessão expirada ou requisição inválida. Recarregue a página e tente novamente.');
        }
    }
}
