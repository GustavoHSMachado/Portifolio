<?php

declare(strict_types=1);

/**
 * Cria (ou promove) a conta administradora.
 *
 *   docker compose exec api php database/create-admin.php
 *
 * Existe porque o cadastro público está fechado: sem esta porta, um banco vazio
 * não teria como ganhar o primeiro administrador. Ela é de terminal, e não de
 * tela, pelo mesmo motivo do promote-admin.php — quem roda isto já tem acesso
 * ao servidor e ao banco, e não está ganhando poder que não tivesse.
 *
 * A senha é digitada aqui, com o eco desligado, e nunca passa por argumento de
 * linha de comando: argumento fica no histórico do shell e aparece para
 * qualquer processo que liste a tabela de processos da máquina.
 *
 * O e-mail precisa ser o de ADMIN_EMAIL. Ver RequireAdmin: role de admin no
 * banco só vale para a conta nomeada ali.
 */

use App\Core\Config;
use App\Database\Connection;
use App\Support\Hash;
use App\Support\Validator;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

Config::boot(dirname(__DIR__));

/** Lê do terminal sem mostrar o que é digitado. */
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

function ler(string $rotulo): string
{
    echo $rotulo;

    return trim((string) fgets(STDIN));
}

$emailConfigurado = (string) Config::get('ADMIN_EMAIL', '');

if ($emailConfigurado === '') {
    fwrite(STDERR, "Defina ADMIN_EMAIL no .env antes de criar o administrador.\n");
    exit(1);
}

echo "Criando o administrador de {$emailConfigurado}.\n\n";

$db = new Connection();
$nome = ler('Nome completo: ');

if (mb_strlen($nome) < 3) {
    fwrite(STDERR, "Nome muito curto.\n");
    exit(1);
}

/*
 * O telefone entra aqui pela mesma razão que entra no cadastro pela tela: é o
 * canal de retorno quando alguém procura pelo site. Antes o script gravava
 * NULL, e a conta do dono nascia com menos dados que a de um visitante.
 *
 * A regra é a mesma do formulário — só dígitos, com DDD, entre 10 e 13 —, e a
 * validação vive na mesma classe, para o terminal não virar a porta larga.
 */
$telefone = ler('Telefone com DDD (só números): ');

$validacaoTelefone = Validator::make(
    ['phone' => $telefone],
    ['phone' => 'required|digits|between:10,13'],
);

if ($validacaoTelefone->fails()) {
    foreach ($validacaoTelefone->errors()['phone'] ?? [] as $erro) {
        fwrite(STDERR, "  • {$erro}\n");
    }
    exit(1);
}

$senha = lerSegredo('Senha: ');
$senhaConfirmada = lerSegredo('Confirme a senha: ');

if ($senha !== $senhaConfirmada) {
    fwrite(STDERR, "As senhas não conferem.\n");
    exit(1);
}

// Mesma política da tela: o terminal não é atalho para uma senha mais fraca.
$validacao = Validator::make(
    ['password' => $senha, 'password_confirmation' => $senhaConfirmada],
    ['password' => 'required|password|confirmed'],
);

if ($validacao->fails()) {
    foreach ($validacao->errors()['password'] ?? [] as $erro) {
        fwrite(STDERR, "  • {$erro}\n");
    }
    exit(1);
}

$existente = $db->first('SELECT id FROM users WHERE email = ?', [$emailConfigurado]);

if ($existente !== null) {
    $db->run(
        "UPDATE users
            SET name = ?, phone = ?, password_hash = ?, role = 'admin', email_verified_at = NOW(),
                deleted_at = NULL, failed_attempts = 0, locked_until = NULL, updated_at = NOW()
          WHERE id = ?",
        [$nome, $telefone, Hash::make($senha), $existente['id']]
    );

    echo "\n✓ Conta de {$emailConfigurado} atualizada e promovida a administradora.\n";
} else {
    $db->run(
        "INSERT INTO users (name, email, phone, password_hash, role, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', NOW(), NOW(), NOW())",
        [$nome, $emailConfigurado, $telefone, Hash::make($senha)]
    );

    echo "\n✓ Administrador criado: {$emailConfigurado}\n";
}

echo "  O e-mail já entra confirmado — quem roda este script controla o banco.\n";
echo "  Entre em /entrar. A senha correta dispara um código de 7 dígitos no seu e-mail.\n";
