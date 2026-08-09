<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * Correlation ID: todo log e toda resposta carregam o mesmo identificador,
 * permitindo rastrear uma requisição do front até o banco (agente 10).
 */
final class RequestId implements MiddlewareInterface
{
    public const HEADER = 'X-Request-Id';

    public function handle(Request $request, callable $next): Response
    {
        $incoming = $request->header('x-request-id');
        $requestId = ($incoming !== null && preg_match('/^[A-Za-z0-9\-]{8,64}$/', $incoming) === 1)
            ? $incoming
            : bin2hex(random_bytes(16));

        return $next($request->withAttribute('request_id', $requestId))
            ->withHeader(self::HEADER, $requestId);
    }
}
