<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Services\RateLimiter;
use PHPUnit\Framework\Attributes\Test;
use Tests\DatabaseTestCase;

/**
 * O rate limit é a defesa contra força bruta e contra criação de contas em
 * massa. Na v1 ele vivia na sessão e caía ao trocar de sessão — inútil.
 *
 * Estes testes existem porque o ambiente local afrouxa os limites de
 * autenticação para permitir uma suíte E2E repetível. O comportamento em si
 * passa a ser provado aqui, com valores explícitos, e não pela configuração
 * de um ambiente.
 */
final class RateLimiterTest extends DatabaseTestCase
{
    private RateLimiter $limiter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->limiter = new RateLimiter($this->db);
    }

    #[Test]
    public function permite_ate_o_limite_e_bloqueia_a_tentativa_seguinte(): void
    {
        $chave = '10.0.0.1|POST|/api/v1/auth/register';

        for ($tentativa = 1; $tentativa <= 3; $tentativa++) {
            self::assertTrue(
                $this->limiter->hit($chave, 3, 3600)->allowed,
                "a tentativa {$tentativa} deveria passar"
            );
        }

        self::assertFalse(
            $this->limiter->hit($chave, 3, 3600)->allowed,
            'a quarta tentativa precisa ser bloqueada'
        );
    }

    #[Test]
    public function informa_quantas_tentativas_ainda_restam(): void
    {
        $chave = '10.0.0.2|POST|/api/v1/auth/login';

        self::assertSame(4, $this->limiter->hit($chave, 5, 900)->remaining);
        self::assertSame(3, $this->limiter->hit($chave, 5, 900)->remaining);
    }

    #[Test]
    public function diz_em_quanto_tempo_liberar(): void
    {
        $chave = '10.0.0.3|POST|/api/v1/auth/register';

        $this->limiter->hit($chave, 1, 3600);
        $bloqueado = $this->limiter->hit($chave, 1, 3600);

        self::assertFalse($bloqueado->allowed);
        self::assertGreaterThan(0, $bloqueado->retryAfter);
        self::assertLessThanOrEqual(3600, $bloqueado->retryAfter);
    }

    #[Test]
    public function libera_quando_a_janela_expira(): void
    {
        $chave = '10.0.0.4|POST|/api/v1/auth/register';

        $this->limiter->hit($chave, 1, 3600);
        self::assertFalse($this->limiter->hit($chave, 1, 3600)->allowed);

        // Envelhece a janela em vez de esperar uma hora pelo relógio.
        $this->db->run(
            'UPDATE rate_limits SET window_start = DATE_SUB(NOW(), INTERVAL 2 HOUR)
              WHERE bucket_key = ?',
            [hash('sha256', $chave)]
        );

        self::assertTrue(
            $this->limiter->hit($chave, 1, 3600)->allowed,
            'passada a janela, o contador precisa recomeçar'
        );
    }

    #[Test]
    public function contadores_de_chaves_diferentes_nao_se_misturam(): void
    {
        $vitima = '10.0.0.5|POST|/api/v1/auth/login';
        $terceiro = '10.0.0.6|POST|/api/v1/auth/login';

        $this->limiter->hit($vitima, 1, 900);
        self::assertFalse($this->limiter->hit($vitima, 1, 900)->allowed);

        // Um IP no limite não pode derrubar o acesso de outra pessoa.
        self::assertTrue($this->limiter->hit($terceiro, 1, 900)->allowed);
    }

    #[Test]
    public function o_contador_sobrevive_a_uma_nova_instancia(): void
    {
        $chave = '10.0.0.7|POST|/api/v1/auth/login';

        $this->limiter->hit($chave, 1, 900);

        // Persistido no banco, e não em memória ou sessão: trocar de sessão,
        // reiniciar o processo ou abrir outra aba não zera o contador.
        $outro = new RateLimiter($this->db);

        self::assertFalse($outro->hit($chave, 1, 900)->allowed);
    }

    #[Test]
    public function clear_zera_o_contador_da_chave(): void
    {
        $chave = '10.0.0.8|POST|/api/v1/auth/login';

        $this->limiter->hit($chave, 1, 900);
        self::assertFalse($this->limiter->hit($chave, 1, 900)->allowed);

        $this->limiter->clear($chave);

        self::assertTrue($this->limiter->hit($chave, 1, 900)->allowed);
    }
}
