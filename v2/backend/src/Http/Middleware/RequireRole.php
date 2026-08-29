<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;

/**
 * RBAC. Deve rodar depois de Authenticate.
 * Na v1 qualquer usuário logado abria o painel admin — este middleware fecha isso.
 */
final class RequireRole implements MiddlewareInterface
{
    public function __construct(private readonly string $role = 'admin')
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        if ($request->attribute('user_id') === null) {
            throw HttpException::unauthorized();
        }

        if ($request->attribute('role') !== $this->role) {
            throw HttpException::forbidden('Você não tem permissão para acessar este recurso.');
        }

        return $next($request);
    }
}
