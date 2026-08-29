<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Support\Logger;

/**
 * Correlation ID: todo log e toda resposta carregam o mesmo identificador,
 * permitindo rastrear uma requisição do front até o banco (agente 10).
 */
final class RequestId implements MiddlewareInterface
{
    public const HEADER = 'X-Request-Id';

    public function __construct(private readonly Logger $logger)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        $incoming = $request->header('x-request-id');
        $requestId = ($incoming !== null && preg_match('/^[A-Za-z0-9\-]{8,64}$/', $incoming) === 1)
            ? $incoming
            : bin2hex(random_bytes(16));

        // Sem esta linha o id só existia no cabeçalho da resposta: saía para o
        // cliente e não entrava em log nenhum, que é metade da correlação.
        $this->logger->setRequestId($requestId);

        return $next($request->withAttribute('request_id', $requestId))
            ->withHeader(self::HEADER, $requestId);
    }
}
