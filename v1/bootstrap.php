<?php
declare(strict_types=1);

/**
 * Ponto único de inicialização da aplicação.
 * Todo arquivo PHP público deve começar com: require_once __DIR__ . '/bootstrap.php';
 */

require_once __DIR__ . '/src/Env.php';

Env::load(__DIR__ . '/.env');

// ---- Erros: nunca exibir stack trace em produção ----
$debug = Env::bool('APP_DEBUG', false);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// ---- Sessão endurecida ----
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ---- Cabeçalhos de segurança básicos ----
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: same-origin');
}

// ---- Autoload do Composer (PHPMailer) ----
$autoload = __DIR__ . '/vendor/autoload.php';
if (is_readable($autoload)) {
    require_once $autoload;
}

// ---- Classes da aplicação ----
require_once __DIR__ . '/src/Database.php';
require_once __DIR__ . '/src/Csrf.php';
require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/Mailer.php';
require_once __DIR__ . '/src/PasswordReset.php';
require_once __DIR__ . '/src/Validator.php';

/** Escape de saída — usar SEMPRE ao imprimir dado vindo do banco ou do usuário. */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/** Guarda mensagem de erro na sessão e redireciona. */
function redirect_with_error(string $message, string $to): never
{
    $_SESSION['error_message'] = $message;
    header('Location: ' . $to);
    exit();
}

/** Redireciona sem mensagem. */
function redirect(string $to): never
{
    header('Location: ' . $to);
    exit();
}
