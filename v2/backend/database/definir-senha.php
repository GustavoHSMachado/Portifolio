<?php

declare(strict_types=1);

/**
 * Define ou troca a senha de uma conta, pelo terminal.
 *
 *   docker compose exec api php database/definir-senha.php
 *
 * Serve para quando a conta já existe — criada pelo create-admin.php ou
 * inserida direto no banco — e falta só a senha.
 *
 * A senha é digitada aqui, com o eco desligado, e nunca passa por argumento de
 * linha de comando: argumento fica no histórico do shell e aparece para
 * qualquer processo que liste a tabela de processos da máquina. O que vai para
 * o banco é o hash Argon2id; o valor digitado não sobra em lugar nenhum.
 */

use App\Core\Config;
use App\Database\Connection;
use App\Models\PasswordHistory;
use App\Support\Hash;
use App\Support\Validator;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

Config::boot(dirname(__DIR__));

function lerSegredo(string $rotulo): string
{
    echo $rotulo;

    $temStty = trim((string) shell_exec('command -v stty')) !== '';

    if ($temStty) {
        shell_exec('stty -echo');
    }

    $valor = trim((string) fgets(STDIN));

    if ($temStty) {
        shell_exec('stty echo');
        echo PHP_EOL;
    }

    return $valor;
}

$email = $argv[1] ?? (string) Config::get('ADMIN_EMAIL', '');

if ($email === '') {
    fwrite(STDERR, "Uso: php database/definir-senha.php [e-mail]\n");
    fwrite(STDERR, "Sem o argumento, usa o ADMIN_EMAIL do .env.\n");
    exit(1);
}

$db   = new Connection();
$user = $db->first('SELECT id, name FROM users WHERE email = ? AND deleted_at IS NULL', [mb_strtolower($email)]);

if ($user === null) {
    fwrite(STDERR, "Nenhuma conta ativa com o e-mail {$email}.\n");
    exit(1);
}

echo "Definindo a senha de {$user['name']} ({$email}).\n\n";

$senha = lerSegredo('Senha: ');
$confirmacao = lerSegredo('Confirme a senha: ');

if ($senha !== $confirmacao) {
    fwrite(STDERR, "As senhas não conferem.\n");
    exit(1);
}

// Mesma política da tela: o terminal não é atalho para uma senha mais fraca.
$validacao = Validator::make(
    ['password' => $senha, 'password_confirmation' => $confirmacao],
    ['password' => 'required|password|confirmed'],
);

if ($validacao->fails()) {
    foreach ($validacao->errors()['password'] ?? [] as $erro) {
        fwrite(STDERR, "  • {$erro}\n");
    }
    exit(1);
}

$userId = (int) $user['id'];

$db->run(
    'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
    [Hash::make($senha), $userId]
);

// A senha em vigor entra no histórico: é ela que "senha repetida" reconhece na
// primeira troca pela tela.
(new PasswordHistory($db))->recordCurrent($userId);

echo "\n✓ Senha definida.\n";
echo "  Entre em /entrar. A senha correta dispara um código de 7 dígitos no seu e-mail.\n";
