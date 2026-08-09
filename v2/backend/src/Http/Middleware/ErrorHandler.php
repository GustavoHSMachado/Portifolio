<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Config;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Support\Logger;

/**
 * Último recurso: converte qualquer exceção em resposta JSON consistente.
 * Erros esperados (HttpException) devolvem a mensagem; o resto vira 500 genérico,
 * porque stack trace em produção é vazamento de informação (agente 06).
 */
final class ErrorHandler implements MiddlewareInterface
{
    public function __construct(private readonly Logger $logger)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        try {
            return $next($request);
        } catch (HttpException $e) {
            if ($e->status() >= 500) {
                $this->log($request, $e);
            }

            return Response::error($e->getMessage(), $e->status(), $e->errors(), $e->errorCode());
        } catch (\Throwable $e) {
            $this->log($request, $e);

            if (Config::isDebug()) {
                return Response::error($e->getMessage(), 500, [
                    'exception' => [$e::class],
                    'trace'     => array_slice(explode("\n", $e->getTraceAsString()), 0, 10),
                ], 'internal_error');
            }

            return Response::error(
                'Ocorreu um erro inesperado. A equipe foi notificada.',
                500,
                code: 'internal_error'
            );
        }
    }

    private function log(Request $request, \Throwable $e): void
    {
        $this->logger->error('Exceção não tratada', [
            'request_id' => $request->attribute('request_id'),
            'method'     => $request->method,
            'path'       => $request->path,
            'user_id'    => $request->attribute('user_id'),
            'exception'  => $e::class,
            'message'    => $e->getMessage(),
            'file'       => $e->getFile() . ':' . $e->getLine(),
        ]);

        // Sentry, quando o DSN estiver configurado.
        if (Config::get('SENTRY_DSN') && function_exists('\Sentry\captureException')) {
            \Sentry\captureException($e);
        }
    }
}
