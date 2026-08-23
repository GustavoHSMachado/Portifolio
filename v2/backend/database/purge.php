<?php

declare(strict_types=1);

/**
 * Expurgo dos dados perecíveis.
 *
 *   php database/purge.php             # apaga e informa quanto saiu
 *   php database/purge.php --dry-run   # só conta, não apaga
 *   php database/purge.php --test-data # remove também as contas do E2E
 *
 * Três tabelas crescem sozinhas e nunca encolhiam: refresh_tokens ganha uma
 * linha a cada rotação — uma a cada quinze minutos por sessão ativa —,
 * verification_tokens acumula convites e pedidos de senha já usados, e
 * rate_limits guarda um contador por bucket de IP e rota.
 *
 * Os métodos de limpeza existiam desde o início, com o comentário "chamado por
 * cron", mas nenhum cron os chamava. Este script é esse chamador.
 *
 * Como agendar em produção (o container não sobe cron por conta própria):
 *
 *   0 4 * * *  docker compose exec -T api php database/purge.php
 *
 * Rodar mais de uma vez no mesmo dia não faz mal: apagar o que já não existe
 * simplesmente não encontra nada.
 *
 * As janelas de retenção saem do .env — ver PURGE_* em .env.example.
 */

use App\Core\Config;
use App\Database\Connection;
use App\Models\AuditLog;
use App\Models\Message;
use App\Models\RefreshToken;
use App\Models\VerificationToken;
use App\Services\RateLimiter;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

Config::boot(dirname(__DIR__));

$dryRun   = in_array('--dry-run', $argv, true);
$testData = in_array('--test-data', $argv, true);
$db       = new Connection();

/*
 * --test-data existe porque a suíte E2E cadastra contas de verdade, pela tela,
 * contra a mesma API e o mesmo banco do dia a dia. Cada rodada completa deixa
 * algumas dezenas para trás: depois das rodadas de hoje havia 112 contas na
 * tabela, todas de teste e nenhuma real.
 *
 * O alvo é o domínio @portifolio.local, reservado por definição e usado apenas
 * pelos testes. As tabelas dependentes saem junto por ON DELETE CASCADE.
 *
 * A trava de APP_ENV é o que impede o comando de existir onde não deveria: em
 * produção nenhum endereço legítimo termina em .local, mas um script que apaga
 * usuários em massa não é algo que se deixe ao alcance por engano.
 */
if ($testData && Config::get('APP_ENV') === 'production') {
    fwrite(STDERR, "--test-data não roda com APP_ENV=production.\n");
    exit(1);
}

/** Conta o que o expurgo apagaria, para o modo de simulação. */
$contar = static function (string $sql, array $params) use ($db): int {
    $row = $db->first($sql, $params);

    return (int) ($row['total'] ?? 0);
};

$refreshDays      = Config::int('PURGE_REFRESH_TOKENS_DAYS', 30);
$verificationDays = Config::int('PURGE_VERIFICATION_TOKENS_DAYS', 7);
$rateLimitSeconds = Config::int('PURGE_RATE_LIMITS_SECONDS', 86400);
$messageDays      = Config::int('PURGE_MESSAGES_DAYS', 365);
$auditDays        = Config::int('PURGE_AUDIT_DAYS', 180);

$alvos = [
    'refresh_tokens' => [
        'contar' => static fn (): int => $contar(
            'SELECT COUNT(*) AS total FROM refresh_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$refreshDays]
        ),
        'apagar' => static fn (): int => (new RefreshToken($db))->purgeExpired($refreshDays),
        'criterio' => sprintf('expirados há mais de %d dia(s)', $refreshDays),
    ],
    'verification_tokens' => [
        'contar' => static fn (): int => $contar(
            'SELECT COUNT(*) AS total FROM verification_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$verificationDays]
        ),
        'apagar' => static fn (): int => (new VerificationToken($db))->purgeExpired($verificationDays),
        'criterio' => sprintf('expirados há mais de %d dia(s)', $verificationDays),
    ],
    'messages' => [
        'contar' => static fn (): int => $contar(
            'SELECT COUNT(*) AS total FROM messages WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$messageDays]
        ),
        'apagar' => static fn (): int => (new Message($db))->purgeOld($messageDays),
        'criterio' => sprintf('recebidas há mais de %d dia(s)', $messageDays),
    ],
    'audit_log' => [
        'contar' => static fn (): int => $contar(
            'SELECT COUNT(*) AS total FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$auditDays]
        ),
        'apagar' => static fn (): int => (new AuditLog($db))->purgeOld($auditDays),
        'criterio' => sprintf('eventos anteriores a %d dia(s)', $auditDays),
    ],
    'rate_limits' => [
        'contar' => static fn (): int => $contar(
            'SELECT COUNT(*) AS total FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL ? SECOND)',
            [$rateLimitSeconds]
        ),
        'apagar' => static fn (): int => (new RateLimiter($db))->purge($rateLimitSeconds),
        'criterio' => sprintf('janelas anteriores a %d segundo(s)', $rateLimitSeconds),
    ],
];

if ($testData) {
    $alvos['users (E2E)'] = [
        'contar' => static fn (): int => $contar(
            "SELECT COUNT(*) AS total FROM users WHERE email LIKE '%@portifolio.local'",
            []
        ),
        'apagar' => static fn (): int => $db
            ->run("DELETE FROM users WHERE email LIKE '%@portifolio.local'")
            ->rowCount(),
        'criterio' => 'contas criadas pela suíte E2E',
    ];
}

$total = 0;

foreach ($alvos as $tabela => $alvo) {
    try {
        $quantidade = $dryRun ? ($alvo['contar'])() : ($alvo['apagar'])();
    } catch (Throwable $e) {
        fwrite(STDERR, sprintf('FALHOU em %s: %s%s', $tabela, $e->getMessage(), PHP_EOL));
        exit(1);
    }

    $total += $quantidade;

    printf(
        '%-22s %6d linha(s) %s  (%s)%s',
        $tabela,
        $quantidade,
        $dryRun ? 'a apagar' : 'apagada(s)',
        $alvo['criterio'],
        PHP_EOL
    );
}

printf(
    '%s%d linha(s) no total.%s',
    $dryRun ? '[simulação] ' : '',
    $total,
    PHP_EOL
);
