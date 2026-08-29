<?php

declare(strict_types=1);

/**
 * Migrador — interface de linha de comando.
 *
 *   php database/migrate.php              # aplica pendentes
 *   php database/migrate.php --status     # lista o que falta
 *   php database/migrate.php --rollback   # desfaz o último lote aplicado
 *
 * A lógica vive em App\Database\Migrator, compartilhada com os testes de
 * integração, para que o schema exercitado nos testes seja exatamente o de
 * produção.
 */

use App\Core\Config;
use App\Database\Connection;
use App\Database\Migrator;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

Config::boot(dirname(__DIR__));

$migrator = new Migrator(new Connection());
$migrator->ensureControlTable();

if (in_array('--status', $argv, true)) {
    $pending = $migrator->pending();

    printf(
        'Aplicadas: %d | Pendentes: %d%s',
        count($migrator->applied()),
        count($pending),
        PHP_EOL
    );

    foreach ($pending as $file) {
        echo '  [ ] ' . basename($file) . PHP_EOL;
    }

    exit(0);
}

if (in_array('--rollback', $argv, true)) {
    $batch = $migrator->lastBatch();

    if ($batch === null) {
        echo "Não há migração aplicada para desfazer.\n";
        exit(0);
    }

    /*
     * Confirmação interativa, e sem atalho por argumento.
     *
     * Rollback apaga estrutura, e estrutura leva dado junto. A trava é a mesma
     * ideia do purge.php --test-data: quem estiver rodando isto por engano tem
     * uma chance de parar. Fora de um terminal (sem STDIN), o comando recusa em
     * vez de assumir que pode seguir — script de CI não deve reverter banco
     * sozinho.
     */
    if (!stream_isatty(STDIN)) {
        fwrite(STDERR, "--rollback exige um terminal interativo. Recusando.\n");
        exit(1);
    }

    echo "Isto vai desfazer o lote {$batch}.\n";
    echo "Rollback devolve a ESTRUTURA, nunca o CONTEÚDO: o que for apagado se perde.\n";
    echo "Você tem um dump recente? (ver docs/DEPLOY.md)\n\n";
    echo 'Digite "reverter" para continuar: ';

    if (trim((string) fgets(STDIN)) !== 'reverter') {
        echo "Cancelado. Nada foi alterado.\n";
        exit(0);
    }

    try {
        $revertidas = $migrator->rollback(static function (string $name, int $statements): void {
            echo "← {$name}... desfeito ({$statements} comando(s))" . PHP_EOL;
        });
    } catch (Throwable $e) {
        fwrite(STDERR, 'FALHOU: ' . $e->getMessage() . PHP_EOL);
        exit(1);
    }

    printf('%d migração(ões) revertida(s).%s', $revertidas, PHP_EOL);
    exit(0);
}

try {
    $applied = $migrator->run(static function (string $name, int $statements): void {
        echo "→ {$name}... ok ({$statements} comando(s))" . PHP_EOL;
    });
} catch (Throwable $e) {
    fwrite(STDERR, 'FALHOU: ' . $e->getMessage() . PHP_EOL);
    fwrite(STDERR, '  Migração interrompida. Corrija e rode novamente.' . PHP_EOL);
    exit(1);
}

echo $applied === 0
    ? "Nada a migrar. Banco atualizado.\n"
    : sprintf('%d migração(ões) aplicada(s).%s', $applied, PHP_EOL);
