<?php

declare(strict_types=1);

/**
 * Promove uma conta existente a administradora.
 *
 *   php database/promote-admin.php gustavo.hsmachado@gmail.com
 *
 * Existe como comando de terminal, e não como tela, de propósito: uma
 * interface para conceder privilégio administrativo é uma escada de escalação
 * de privilégio esperando alguém subir. Quem roda isto já tem acesso ao
 * servidor e ao banco — não está ganhando poder que não tivesse.
 *
 * O primeiro administrador precisa nascer daqui. Depois dele, promover outros
 * pela área autenticada seria uma decisão de produto, não uma necessidade.
 */

use App\Core\Config;
use App\Database\Connection;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

$email = $argv[1] ?? null;

if (!is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    fwrite(STDERR, "Uso: php database/promote-admin.php <e-mail>\n");
    exit(1);
}

Config::boot(dirname(__DIR__));

$db = new Connection();
$email = mb_strtolower($email);

$user = $db->first(
    'SELECT id, name, role, email_verified_at FROM users WHERE email = ? AND deleted_at IS NULL',
    [$email]
);

if ($user === null) {
    fwrite(STDERR, "Nenhuma conta ativa com o e-mail {$email}.\n");
    fwrite(STDERR, "Crie a conta pelo site primeiro, depois rode este comando.\n");
    exit(1);
}

if ($user['role'] === 'admin') {
    echo "{$email} já é administrador. Nada a fazer.\n";
    exit(0);
}

$db->run('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', ['admin', $user['id']]);

echo "✓ {$email} agora é administrador.\n";

if ($user['email_verified_at'] === null) {
    echo "  Atenção: o e-mail desta conta ainda não foi confirmado.\n";
}
