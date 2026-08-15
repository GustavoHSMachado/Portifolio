<?php

declare(strict_types=1);

/**
 * Migrador — interface de linha de comando.
 *
 *   php database/migrate.php            # aplica pendentes
 *   php database/migrate.php --status   # lista o que falta
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
