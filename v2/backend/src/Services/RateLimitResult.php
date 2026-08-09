<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Resultado de uma checagem de rate limit.
 *
 * Usa propriedades readonly promovidas em vez de `readonly class` para manter
 * compatibilidade de análise com PHP 8.1 nas ferramentas locais — o comportamento
 * é equivalente e o alvo de execução continua sendo 8.3.
 */
final class RateLimitResult
{
    public function __construct(
        public readonly bool $allowed,
        public readonly int $remaining,
        public readonly int $retryAfter,
    ) {
    }
}
