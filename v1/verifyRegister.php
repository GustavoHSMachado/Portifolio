<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('register.php');
}

Csrf::verifyOrFail();

$data = [
    'name'     => trim((string) ($_POST['name'] ?? '')),
    'tel'      => preg_replace('/\D/', '', (string) ($_POST['tel'] ?? '')),
    'email'    => trim((string) ($_POST['email'] ?? '')),
    'username' => trim((string) ($_POST['username'] ?? '')),
    'password' => (string) ($_POST['password'] ?? ''),
];

$errors = Validator::registration($data);
if ($errors !== []) {
    redirect_with_error(implode(' ', $errors), 'registerError.php');
}

// Duplicidade de login ou e-mail.
// (Bug corrigido: o código anterior usava $checkUSerStmt / $checkUerStmt — variáveis
// inexistentes, o que quebrava a verificação de usuário duplicado.)
$exists = Database::run(
    'SELECT id FROM CADASTRO WHERE login = ? OR email = ? LIMIT 1',
    [$data['username'], $data['email']]
)->fetch();

if ($exists) {
    redirect_with_error('Usuário ou e-mail já cadastrado.', 'registerError.php');
}

try {
    Database::run(
        'INSERT INTO CADASTRO (nome, tel, email, login, senha, admin) VALUES (?, ?, ?, ?, ?, 0)',
        [
            $data['name'],
            $data['tel'],
            $data['email'],
            $data['username'],
            password_hash($data['password'], PASSWORD_DEFAULT), // nunca em texto plano
        ]
    );
} catch (PDOException $e) {
    error_log('[REGISTER] ' . $e->getMessage());
    redirect_with_error('Erro ao cadastrar o usuário.', 'registerError.php');
}

$user = Database::run(
    'SELECT id, nome, login, admin FROM CADASTRO WHERE login = ? LIMIT 1',
    [$data['username']]
)->fetch();

Auth::login($user);
redirect('pageUser.php');
