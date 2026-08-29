<?php
declare(strict_types=1);

/**
 * DEPRECADO — mantido apenas para compatibilidade com arquivos ainda não migrados.
 * A conexão agora vive em src/Database.php (PDO + credenciais do .env).
 * Não adicione nada aqui; use Database::run() / Database::pdo().
 */

require_once __DIR__ . '/bootstrap.php';

trigger_error(
    'conexao.php está deprecado. Use Database::pdo() de src/Database.php.',
    E_USER_DEPRECATED
);
