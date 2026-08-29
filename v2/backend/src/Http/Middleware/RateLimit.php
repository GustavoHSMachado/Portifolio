<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Config;
use App\Core\Request;
use App\Core\Response;
use App\Services\RateLimiter;

/**
 * Rate limit persistente (banco), por IP + rota.
 * Persistente e não por sessão — na v1 o limite morria ao trocar de sessão.
 *
 * Os limites das rotas de autenticação estão em STRICT_RULES e cada um pode ser
 * sobrescrito por ambiente. Os padrões são os valores de produção: um ambiente
 * que não define nada continua protegido.
 */
final class RateLimit implements MiddlewareInterface
{
    /**
     * Rotas de autenticação: alvo de força bruta e de criação de contas em
     * massa, por isso limites bem mais apertados que o padrão global.
     *
     * O primeiro item é o sufixo da variável de ambiente que sobrescreve o par.
     * Registro em 3 por hora protege produção, mas inviabiliza suíte E2E
     * repetível — daí a possibilidade de afrouxar só onde faz sentido.
     *
     * @var array<string, array{string, int, int}>
     */
    private const STRICT_RULES = [
        '/api/v1/auth/login' => ['LOGIN', 5, 900],
        // O segundo fator é o alvo mais óbvio de força bruta do sistema: são
        // 7 dígitos, e quem chega aqui já acertou a senha. O contador por
        // código (VerificationToken::MAX_ATTEMPTS) limita as tentativas contra
        // uma conta; este limita as tentativas vindas de um mesmo endereço.
        '/api/v1/auth/login/verify'        => ['LOGIN_VERIFY', 10, 900],
        '/api/v1/auth/register'            => ['REGISTER', 3, 3600],
        '/api/v1/auth/forgot-password'     => ['FORGOT_PASSWORD', 3, 3600],
        '/api/v1/auth/reset-password'      => ['RESET_PASSWORD', 5, 3600],
        '/api/v1/auth/resend-verification' => ['RESEND_VERIFICATION', 3, 3600],
        // Formulário público de contato: alvo de robô de spam. Cinco por hora
        // é folgado para quem escreve de verdade e apertado para quem automatiza.
        '/api/v1/messages' => ['MESSAGES', 5, 3600],
    ];

    public function __construct(private readonly RateLimiter $limiter)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        if ($request->method === 'OPTIONS' || $this->isSonda($request->path)) {
            return $next($request);
        }

        [$max, $window] = $this->rulesFor($request->path);

        $key = sprintf('%s|%s|%s', $request->ip, $request->method, $request->path);
        $result = $this->limiter->hit($key, $max, $window);

        if (!$result->allowed) {
            /*
             * Resposta montada aqui, e não exceção, para o 429 sair com os
             * mesmos cabeçalhos das respostas permitidas. Lançando, o código
             * abaixo nunca roda e o cliente recebe o limite escrito em prosa,
             * em português, sem nada que uma biblioteca consiga ler. Retry-After
             * é o cabeçalho que a RFC 9110 define para isso.
             */
            return Response::error(
                sprintf('Muitas requisições. Tente novamente em %d segundos.', $result->retryAfter),
                429,
                code: 'rate_limited',
            )
                ->withHeader('Retry-After', (string) $result->retryAfter)
                ->withHeader('RateLimit-Limit', (string) $max)
                ->withHeader('RateLimit-Remaining', '0')
                ->withHeader('RateLimit-Reset', (string) $result->retryAfter);
        }

        return $next($request)
            ->withHeader('RateLimit-Limit', (string) $max)
            ->withHeader('RateLimit-Remaining', (string) $result->remaining)
            ->withHeader('RateLimit-Reset', (string) $result->retryAfter);
    }

    /**
     * Sondas de saúde não passam pelo contador.
     *
     * Dois motivos, e o segundo é o que importa. O primeiro é volume: um
     * orquestrador chama a sonda a cada poucos segundos e consumiria a cota
     * global sozinho.
     *
     * O segundo é a dependência invertida. O contador vive no banco, então
     * passar por aqui faz a sonda de liveness depender do banco. Com o banco
     * fora, /health devolvia 500 e o orquestrador concluía que o processo
     * morreu — reiniciando em laço um container saudável, no exato momento em
     * que o problema é outro. Liveness responde sobre o processo; quem responde
     * sobre as dependências é /health/ready, e ele já sabe fazer isso: tem um
     * try/catch que devolve 503 com o diagnóstico, e que nunca era alcançado
     * porque a exceção acontecia aqui, dois middlewares antes do controller.
     */
    private function isSonda(string $path): bool
    {
        return $path === '/health' || str_starts_with($path, '/health/');
    }

    /** @return array{int,int} [tentativas, janela em segundos] */
    private function rulesFor(string $path): array
    {
        if (isset(self::STRICT_RULES[$path])) {
            [$nome, $max, $janela] = self::STRICT_RULES[$path];

            return [
                Config::int("RATE_LIMIT_{$nome}_MAX", $max),
                Config::int("RATE_LIMIT_{$nome}_WINDOW", $janela),
            ];
        }

        return [
            Config::int('RATE_LIMIT_MAX', 120),
            Config::int('RATE_LIMIT_WINDOW', 60),
        ];
    }
}
