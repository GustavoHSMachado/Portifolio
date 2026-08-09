<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * Atalho de RequireRole('admin') sem parâmetro de construtor,
 * para poder ser referenciado por nome de classe no roteador.
 */
final class RequireAdmin implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        return (new RequireRole('admin'))->handle($request, $next);
    }
}
