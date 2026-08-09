<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Config;
use App\Services\TokenService;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class TokenServiceTest extends TestCase
{
    private TokenService $service;

    protected function setUp(): void
    {
        Config::set('JWT_SECRET', str_repeat('a', 64));
        Config::set('JWT_ACCESS_TTL', '900');
        Config::set('APP_URL', 'http://api.test');
        Config::set('FRONTEND_URL', 'http://front.test');

        $this->service = new TokenService();
    }

    /** @return array<string,mixed> */
    private function user(array $overrides = []): array
    {
        return array_merge([
            'id'                => 42,
            'role'              => 'user',
            'email_verified_at' => '2026-08-01 10:00:00',
        ], $overrides);
    }

    #[Test]
    public function emite_e_verifica_token(): void
    {
        $token  = $this->service->issueAccessToken($this->user());
        $claims = $this->service->verifyAccessToken($token);

        self::assertNotNull($claims);
        self::assertSame('42', $claims['sub']);
        self::assertSame('user', $claims['role']);
        self::assertTrue($claims['email_verified']);
    }

    #[Test]
    public function token_adulterado_e_rejeitado(): void
    {
        $token = $this->service->issueAccessToken($this->user());
        [$header, $payload, $signature] = explode('.', $token);

        // Troca o papel para admin e mantém a assinatura antiga.
        $forged = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        $forged['role'] = 'admin';
        $newPayload = rtrim(strtr(base64_encode(json_encode($forged)), '+/', '-_'), '=');

        self::assertNull($this->service->verifyAccessToken("{$header}.{$newPayload}.{$signature}"));
    }

    #[Test]
    public function token_expirado_e_rejeitado(): void
    {
        Config::set('JWT_ACCESS_TTL', '-10'); // já nasce vencido
        $token = (new TokenService())->issueAccessToken($this->user());

        self::assertNull($this->service->verifyAccessToken($token));

        Config::set('JWT_ACCESS_TTL', '900');
    }

    #[Test]
    public function lixo_nao_derruba_a_aplicacao(): void
    {
        self::assertNull($this->service->verifyAccessToken('nao-e-um-jwt'));
        self::assertNull($this->service->verifyAccessToken(''));
    }

    #[Test]
    public function segredo_curto_e_recusado(): void
    {
        Config::set('JWT_SECRET', 'curto');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/32 caracteres/');

        (new TokenService())->issueAccessToken($this->user());
    }
}
