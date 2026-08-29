<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Services\TokenService;

/**
 * Exige um access token JWT válido e injeta user_id/role na request.
 */
final class Authenticate implements MiddlewareInterface
{
    public function __construct(private readonly TokenService $tokens)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null) {
            throw HttpException::unauthorized('Token de acesso ausente.');
        }

        $claims = $this->tokens->verifyAccessToken($token);

        if ($claims === null) {
            throw HttpException::unauthorized('Token de acesso inválido ou expirado.');
        }

        return $next(
            $request
                ->withAttribute('user_id', (int) $claims['sub'])
                ->withAttribute('role', (string) ($claims['role'] ?? 'user'))
                ->withAttribute('email_verified', (bool) ($claims['email_verified'] ?? false))
        );
    }
}
