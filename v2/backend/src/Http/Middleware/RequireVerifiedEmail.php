<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;

/**
 * Bloqueia ações sensíveis enquanto o e-mail não foi confirmado por token.
 */
final class RequireVerifiedEmail implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        if ($request->attribute('email_verified') !== true) {
            throw new HttpException(
                'Confirme seu e-mail para continuar.',
                403,
                errorCode: 'email_not_verified'
            );
        }

        return $next($request);
    }
}
