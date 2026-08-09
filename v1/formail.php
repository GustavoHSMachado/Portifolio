<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('forgotUser.php');
}

Csrf::verifyOrFail();

$email = trim((string) ($_POST['email'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    redirect_with_error('O e-mail inserido não é válido.', 'forgotUser.php');
}

// Mensagem sempre igual, exista o e-mail ou não (evita enumeração de contas).
$genericMessage = 'Se este e-mail estiver cadastrado, você receberá um link de redefinição em instantes.';

// SQL Injection corrigido: antes era "WHERE email = '$email'" concatenado.
$user = Database::run('SELECT id, email FROM CADASTRO WHERE email = ? LIMIT 1', [$email])->fetch();

if ($user) {
    try {
        $token = PasswordReset::create($user['email']);
        $link  = rtrim((string) Env::get('APP_URL', ''), '/')
            . '/resetPassword.php?email=' . urlencode($user['email'])
            . '&token=' . urlencode($token);

        Mailer::send(
            $user['email'],
            'Recuperar Senha',
            'Olá, use o link abaixo para criar uma nova senha. Ele expira em 30 minutos.<br />'
            . '<a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '">Redefinir minha senha</a>'
        );
    } catch (Throwable $e) {
        error_log('[FORGOT] ' . $e->getMessage());
    }
}

redirect_with_error($genericMessage, 'forgotUser.php');
