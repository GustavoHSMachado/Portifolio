<?php

declare(strict_types=1);

/**
 * Migrador mínimo, idempotente e versionado.
 *
 *   php database/migrate.php            # aplica pendentes
 *   php database/migrate.php --status   # lista o que falta
 *
 * Deliberadamente simples: registra o que já rodou em `migrations` e aplica o resto
 * em ordem alfabética (o prefixo de data garante a sequência).
 */

use App\Core\Config;
use App\Database\Connection;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

Config::boot(dirname(__DIR__));

$db = new Connection();
$db->run(
    'CREATE TABLE IF NOT EXISTS migrations (
        id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
        filename   VARCHAR(255) NOT NULL,
        batch      INT UNSIGNED NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

$applied = array_column($db->all('SELECT filename FROM migrations'), 'filename');
$files   = glob(__DIR__ . '/migrations/*.sql') ?: [];
sort($files);

$pending = array_values(array_filter(
    $files,
    static fn (string $f): bool => !in_array(basename($f), $applied, true)
));

if (in_array('--status', $argv, true)) {
    printf("Aplicadas: %d | Pendentes: %d%s", count($applied), count($pending), PHP_EOL);
    foreach ($pending as $file) {
        echo "  [ ] " . basename($file) . PHP_EOL;
    }
    exit(0);
}

if ($pending === []) {
    echo "Nada a migrar. Banco atualizado.\n";
    exit(0);
}

$batch = (int) ($db->first('SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM migrations')['b'] ?? 1);

foreach ($pending as $file) {
    $name = basename($file);
    echo "→ {$name}... ";

    try {
        $sql = file_get_contents($file) ?: '';

        // Os comentários saem ANTES da divisão por ';'. Sem isso, o cabeçalho de
        // comentário no topo do arquivo fica colado no primeiro comando, o bloco
        // inteiro passa a "começar com --" e era descartado em silêncio: a
        // migração era marcada como aplicada sem criar nada, e o banco travava
        // nesse estado porque as pendentes zeravam.
        $sql = preg_replace('/^[ \t]*--.*$/m', '', $sql) ?? $sql;

        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            static fn (string $s): bool => $s !== ''
        );

        if ($statements === []) {
            throw new RuntimeException('nenhum comando SQL encontrado no arquivo');
        }

        foreach ($statements as $statement) {
            $db->run($statement);
        }

        $db->run('INSERT INTO migrations (filename, batch) VALUES (?, ?)', [$name, $batch]);
        echo "ok (" . count($statements) . " comando(s))\n";
    } catch (Throwable $e) {
        echo "FALHOU\n";
        fwrite(STDERR, "  {$e->getMessage()}\n");
        fwrite(STDERR, "  Migração interrompida. Corrija e rode novamente.\n");
        exit(1);
    }
}

printf("%d migração(ões) aplicada(s) no batch %d.%s", count($pending), $batch, PHP_EOL);
