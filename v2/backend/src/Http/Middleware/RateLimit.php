<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Config;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Services\RateLimiter;

/**
 * Rate limit persistente (banco), por IP + rota.
 * Persistente e não por sessão — na v1 o limite morria ao trocar de sessão.
 *
 * Limites por rota vêm de RATE_LIMIT_RULES; o padrão global protege o resto.
 */
final class RateLimit implements MiddlewareInterface
{
    public function __construct(private readonly RateLimiter $limiter)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        if ($request->method === 'OPTIONS') {
            return $next($request);
        }

        [$max, $window] = $this->rulesFor($request->path);

        $key = sprintf('%s|%s|%s', $request->ip, $request->method, $request->path);
        $result = $this->limiter->hit($key, $max, $window);

        if (!$result->allowed) {
            throw HttpException::tooManyRequests(
                sprintf('Muitas requisições. Tente novamente em %d segundos.', $result->retryAfter)
            );
        }

        return $next($request)
            ->withHeader('RateLimit-Limit', (string) $max)
            ->withHeader('RateLimit-Remaining', (string) $result->remaining)
            ->withHeader('RateLimit-Reset', (string) $result->retryAfter);
    }

    /** @return array{int,int} [tentativas, janela em segundos] */
    private function rulesFor(string $path): array
    {
        // Rotas de autenticação são alvo de força bruta — limite bem mais apertado.
        $strict = [
            '/api/v1/auth/login'               => [5, 900],
            '/api/v1/auth/register'            => [3, 3600],
            '/api/v1/auth/forgot-password'     => [3, 3600],
            '/api/v1/auth/reset-password'      => [5, 3600],
            '/api/v1/auth/resend-verification' => [3, 3600],
        ];

        if (isset($strict[$path])) {
            return $strict[$path];
        }

        return [
            Config::int('RATE_LIMIT_MAX', 120),
            Config::int('RATE_LIMIT_WINDOW', 60),
        ];
    }
}
