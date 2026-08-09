<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Config;
use App\Core\Request;
use App\Core\Response;

/**
 * CORS com allowlist explícita — nunca "*" quando há credenciais.
 * A origem do front vem de CORS_ALLOWED_ORIGINS no .env.
 */
final class Cors implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $origin  = $request->header('origin');
        $allowed = Config::list('CORS_ALLOWED_ORIGINS');

        $isAllowed = $origin !== null && in_array($origin, $allowed, true);

        // Preflight: responde sem tocar no controller.
        $response = $request->method === 'OPTIONS'
            ? Response::noContent()
            : $next($request);

        if (!$isAllowed) {
            return $response;
        }

        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-CSRF-Token')
            ->withHeader('Access-Control-Expose-Headers', 'X-Request-Id, RateLimit-Remaining, RateLimit-Reset')
            ->withHeader('Access-Control-Max-Age', '600')
            ->withHeader('Vary', 'Origin');
    }
}
