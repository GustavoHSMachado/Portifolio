<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Emissão e verificação de JWT de acesso.
 *
 * Access token: curto (15 min), guardado só em memória no front.
 * Refresh token: opaco, httpOnly cookie, rotativo — ver RefreshToken model.
 * Essa separação evita XSS conseguir sessão persistente.
 */
final class TokenService
{
    private const ALGORITHM = 'HS256';

    /** @param array<string,mixed> $user */
    public function issueAccessToken(array $user): string
    {
        $now = time();
        $ttl = Config::int('JWT_ACCESS_TTL', 900); // 15 minutos

        return JWT::encode([
            'iss'            => Config::get('APP_URL', 'http://localhost:8000'),
            'aud'            => Config::get('FRONTEND_URL', 'http://localhost:3000'),
            'sub'            => (string) $user['id'],
            'iat'            => $now,
            'nbf'            => $now,
            'exp'            => $now + $ttl,
            'jti'            => bin2hex(random_bytes(8)),
            'role'           => $user['role'] ?? 'user',
            'email_verified' => !empty($user['email_verified_at']),
        ], $this->secret(), self::ALGORITHM);
    }

    /** @return array<string,mixed>|null claims válidas, ou null */
    public function verifyAccessToken(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret(), self::ALGORITHM));

            return (array) $decoded;
        } catch (\Throwable) {
            // Assinatura inválida, expirado, malformado — todos são "não autenticado".
            return null;
        }
    }

    public function accessTokenTtl(): int
    {
        return Config::int('JWT_ACCESS_TTL', 900);
    }

    private function secret(): string
    {
        $secret = (string) Config::get('JWT_SECRET', '');

        if (mb_strlen($secret) < 32) {
            throw new \RuntimeException(
                'JWT_SECRET deve ter no mínimo 32 caracteres. Gere com: openssl rand -hex 32'
            );
        }

        return $secret;
    }
}
