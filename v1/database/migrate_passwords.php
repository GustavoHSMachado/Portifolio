<?php
declare(strict_types=1);

/**
 * Script de execução ÚNICA (via CLI): converte senhas em texto plano para hash.
 *
 *   php database/migrate_passwords.php
 *
 * Sem isso, ninguém consegue logar depois da refatoração, porque Auth::attempt()
 * usa password_verify() e as senhas antigas estão em texto plano no banco.
 * Faça backup antes.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Este script só pode ser executado via linha de comando.\n");
}

require_once __DIR__ . '/../bootstrap.php';

$rows = Database::run('SELECT id, senha FROM CADASTRO')->fetchAll();

$migrated = 0;
$skipped  = 0;

foreach ($rows as $row) {
    $info = password_get_info((string) $row['senha']);

    if ($info['algo'] !== null && $info['algo'] !== 0) {
        $skipped++; // já está hasheada
        continue;
    }

    Database::run('UPDATE CADASTRO SET senha = ? WHERE id = ?', [
        password_hash((string) $row['senha'], PASSWORD_DEFAULT),
        $row['id'],
    ]);
    $migrated++;
}

printf("Senhas convertidas: %d | já hasheadas: %d | total: %d%s", $migrated, $skipped, count($rows), PHP_EOL);
