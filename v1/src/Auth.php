<?php
declare(strict_types=1);

/**
 * Autenticação e autorização.
 * Antes: senha em texto plano + qualquer usuário logado acessava pageAdmin.php.
 * Agora: password_hash/password_verify, fixação de sessão mitigada e RBAC real.
 */
final class Auth
{
    /** Autentica o usuário. Retorna o registro em caso de sucesso, null caso contrário. */
    public static function attempt(string $login, string $password): ?array
    {
        $stmt = Database::run(
            'SELECT id, nome, login, senha, admin FROM CADASTRO WHERE login = ? LIMIT 1',
            [$login]
        );
        $user = $stmt->fetch();

        // Compara sempre, mesmo sem usuário, para evitar timing attack / enumeração.
        $hash = $user['senha'] ?? '$2y$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';

        if (!password_verify($password, $hash) || !$user) {
            return null;
        }

        // Migração transparente: se o hash estiver desatualizado, regrava.
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            Database::run('UPDATE CADASTRO SET senha = ? WHERE id = ?', [
                password_hash($password, PASSWORD_DEFAULT),
                $user['id'],
            ]);
        }

        return $user;
    }

    public static function login(array $user): void
    {
        session_regenerate_id(true); // mitiga session fixation
        $_SESSION['user_id']  = (int) $user['id'];
        $_SESSION['username'] = $user['login'];
        $_SESSION['name']     = $user['nome'];
        $_SESSION['is_admin'] = ((int) $user['admin']) === 1;
    }

    public static function check(): bool
    {
        return !empty($_SESSION['user_id']);
    }

    public static function isAdmin(): bool
    {
        return !empty($_SESSION['is_admin']);
    }

    public static function user(): ?array
    {
        if (!self::check()) {
            return null;
        }
        return Database::run(
            'SELECT id, nome, tel, email, login, admin FROM CADASTRO WHERE id = ? LIMIT 1',
            [$_SESSION['user_id']]
        )->fetch() ?: null;
    }

    public static function requireLogin(): void
    {
        if (!self::check()) {
            header('Location: login.php');
            exit();
        }
    }

    public static function requireAdmin(): void
    {
        self::requireLogin();
        if (!self::isAdmin()) {
            http_response_code(403);
            header('Location: pageUser.php');
            exit();
        }
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }
}
