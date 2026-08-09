<?php

declare(strict_types=1);

namespace App\Support;

use App\Core\Config;

/**
 * Hashing de senha centralizado. Argon2id quando disponível, bcrypt como fallback.
 * Nenhum outro ponto do código chama password_hash diretamente.
 */
final class Hash
{
    public static function make(string $plain): string
    {
        return password_hash($plain, self::algorithm(), self::options());
    }

    public static function verify(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }

    public static function needsRehash(string $hash): bool
    {
        return password_needs_rehash($hash, self::algorithm(), self::options());
    }

    /**
     * Consome tempo mesmo quando o usuário não existe, para que o tempo de resposta
     * do login não revele se um e-mail está cadastrado (timing attack).
     */
    public static function burn(): void
    {
        password_verify('dummy', '$2y$12$C6UzMDM.H6dfI/f/IKcEeO.jGFOaBRHqGBpFTAcXbYUzvJRXcVdCu');
    }

    private static function algorithm(): string
    {
        return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    }

    /** @return array<string,int> */
    private static function options(): array
    {
        if (defined('PASSWORD_ARGON2ID')) {
            return [
                'memory_cost' => Config::int('ARGON_MEMORY', 65536),
                'time_cost'   => Config::int('ARGON_TIME', 4),
                'threads'     => Config::int('ARGON_THREADS', 2),
            ];
        }

        return ['cost' => Config::int('BCRYPT_COST', 12)];
    }
}
