<?php

declare(strict_types=1);

namespace App\Core;

use Dotenv\Dotenv;

/**
 * Configuração da aplicação. Toda leitura de ambiente passa por aqui.
 * Regra do agente 06: nenhum segredo no código.
 */
final class Config
{
    /** @var array<string, string|null> */
    private static array $cache = [];
    private static bool $booted = false;

    public static function boot(string $basePath): void
    {
        if (self::$booted) {
            return;
        }
        self::$booted = true;

        if (is_readable($basePath . '/.env')) {
            Dotenv::createImmutable($basePath)->safeLoad();
        }

        self::assertRequired();
    }

    /** Falha rápido no boot se um segredo obrigatório estiver ausente. */
    private static function assertRequired(): void
    {
        $required = ['APP_KEY', 'JWT_SECRET', 'DB_NAME'];
        $missing = [];

        foreach ($required as $key) {
            if (self::get($key) === null || self::get($key) === '') {
                $missing[] = $key;
            }
        }

        if ($missing !== []) {
            throw new \RuntimeException(
                'Configuração ausente no .env: ' . implode(', ', $missing)
                . '. Copie .env.example e preencha antes de subir a API.'
            );
        }
    }

    /**
     * Valor da chave no ambiente, ou o padrão de quem chamou.
     *
     * O cache guarda o que o AMBIENTE disse — nunca o padrão do chamador.
     * Misturar os dois fazia o primeiro chamador decidir o valor para todos os
     * seguintes: o Logger lê Config::get('APP_NAME') sem padrão e grava null, e
     * o HealthController pedindo Config::get('APP_NAME', 'portifolio-api')
     * recebia esse null de volta, com o próprio padrão descartado. O sintoma
     * era um "service": null no /health; o problema é que o valor de uma chave
     * passava a depender da ORDEM em que o código a lesse.
     *
     * Ausência é cacheada como null e continua sendo ausência: o padrão é
     * aplicado na leitura, não na gravação. Variável definida como string vazia
     * continua sendo string vazia, que é diferente de não definida — quem quiser
     * tratar as duas igual usa ?: em vez de ??, como o Logger já faz.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        if (!array_key_exists($key, self::$cache)) {
            // getenv devolve string|false; false é o único caso de "não definida".
            $bruto = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

            self::$cache[$key] = $bruto === false ? null : (string) $bruto;
        }

        return self::$cache[$key] ?? $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);

        return $value === null ? $default : in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
    }

    public static function int(string $key, int $default = 0): int
    {
        $value = self::get($key);

        return $value === null ? $default : (int) $value;
    }

    /** @return string[] */
    public static function list(string $key): array
    {
        return array_values(array_filter(array_map('trim', explode(',', (string) self::get($key, '')))));
    }

    public static function isProduction(): bool
    {
        return self::get('APP_ENV', 'production') === 'production';
    }

    public static function isDebug(): bool
    {
        return self::bool('APP_DEBUG', false) && !self::isProduction();
    }

    /** Apenas para testes. */
    public static function set(string $key, ?string $value): void
    {
        self::$cache[$key] = $value;
        $_ENV[$key] = $value;
    }
}
