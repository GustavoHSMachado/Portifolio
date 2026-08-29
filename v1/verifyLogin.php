<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('login.php');
}

Csrf::verifyOrFail();

$username = trim((string) ($_POST['username'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    redirect_with_error('Informe usuário e senha.', 'loginError.php');
}

// Rate limiting simples por sessão (agente 06): 5 tentativas / 15 min.
$now      = time();
$attempts = $_SESSION['login_attempts'] ?? ['count' => 0, 'first' => $now];
if ($now - $attempts['first'] > 900) {
    $attempts = ['count' => 0, 'first' => $now];
}
if ($attempts['count'] >= 5) {
    redirect_with_error('Muitas tentativas. Tente novamente em alguns minutos.', 'loginError.php');
}

$user = Auth::attempt($username, $password);

if ($user === null) {
    $attempts['count']++;
    $_SESSION['login_attempts'] = $attempts;
    // Mensagem genérica: não revela se o usuário existe.
    redirect_with_error('Usuário ou senha incorretos.', 'loginError.php');
}

unset($_SESSION['login_attempts']);
Auth::login($user);

redirect(Auth::isAdmin() ? 'pageAdmin.php' : 'pageUser.php');
