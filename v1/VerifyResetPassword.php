<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('resetPassword.php');
}

Csrf::verifyOrFail();

$email   = trim((string) ($_POST['email'] ?? ''));
$token   = (string) ($_POST['token'] ?? '');
$senha   = (string) ($_POST['newSenha'] ?? '');
$confirm = (string) ($_POST['confirmNewSenha'] ?? '');

if (!hash_equals($senha, $confirm)) {
    redirect_with_error('As senhas não coincidem.', 'resetPassword.php');
}

$errors = Validator::password($senha);
if ($errors !== []) {
    redirect_with_error(implode(' ', $errors), 'resetPassword.php');
}

// Sem token válido não há troca de senha (antes bastava saber o e-mail).
$validEmail = PasswordReset::validate($email, $token);
if ($validEmail === null) {
    redirect_with_error('Link de redefinição inválido ou expirado. Solicite um novo.', 'forgotUser.php');
}

try {
    Database::run(
        'UPDATE CADASTRO SET senha = ? WHERE email = ?',
        [password_hash($senha, PASSWORD_DEFAULT), $validEmail]
    );
    PasswordReset::consume($validEmail);
} catch (PDOException $e) {
    error_log('[RESET_PASSWORD] ' . $e->getMessage());
    redirect_with_error('Erro ao alterar a senha.', 'resetPassword.php');
}

$_SESSION['error_message'] = 'Senha alterada com sucesso. Faça login.';
redirect('login.php');
