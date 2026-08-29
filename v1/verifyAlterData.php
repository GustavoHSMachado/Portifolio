<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

Auth::requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_with_error('Método de requisição inválido.', 'alterError.php');
}

Csrf::verifyOrFail();

$name     = trim((string) ($_POST['name'] ?? ''));
$tel      = preg_replace('/\D/', '', (string) ($_POST['tel'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

$errors = [];
if (mb_strlen($name) < 3) {
    $errors[] = 'O nome deve ter ao menos 3 caracteres.';
}
if (!preg_match('/^\d{10,13}$/', (string) $tel)) {
    $errors[] = 'O telefone deve conter apenas números (10 a 13 dígitos).';
}
// Senha é opcional: em branco significa "manter a atual".
if ($password !== '') {
    $errors = array_merge($errors, Validator::password($password));
}
if ($errors !== []) {
    redirect_with_error(implode(' ', $errors), 'alterError.php');
}

try {
    if ($password !== '') {
        Database::run(
            'UPDATE CADASTRO SET nome = ?, tel = ?, senha = ? WHERE id = ?',
            [$name, $tel, password_hash($password, PASSWORD_DEFAULT), $_SESSION['user_id']]
        );
    } else {
        Database::run(
            'UPDATE CADASTRO SET nome = ?, tel = ? WHERE id = ?',
            [$name, $tel, $_SESSION['user_id']]
        );
    }
} catch (PDOException $e) {
    error_log('[ALTER_DATA] ' . $e->getMessage());
    redirect_with_error('Erro ao alterar dados do usuário.', 'alterError.php');
}

$_SESSION['name'] = $name;
redirect('pageUser.php');
