<?php
declare(strict_types=1);

/**
 * Validação de entrada no servidor. Nunca confiar no cliente (agente 03/06).
 */
final class Validator
{
    public const PASSWORD_MIN = 8;

    /** @return string[] lista de erros (vazia = válido) */
    public static function registration(array $d): array
    {
        $errors = [];

        if (mb_strlen(trim($d['name'] ?? '')) < 3) {
            $errors[] = 'O nome deve ter ao menos 3 caracteres.';
        }
        if (!preg_match('/^\d{10,13}$/', (string) ($d['tel'] ?? ''))) {
            $errors[] = 'O telefone deve conter apenas números (10 a 13 dígitos).';
        }
        if (!filter_var($d['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'E-mail inválido.';
        }
        if (!preg_match('/^[A-Za-z0-9._-]{3,30}$/', (string) ($d['username'] ?? ''))) {
            $errors[] = 'Usuário deve ter de 3 a 30 caracteres (letras, números, ponto, hífen ou underscore).';
        }
        $errors = array_merge($errors, self::password((string) ($d['password'] ?? '')));

        return $errors;
    }

    /** @return string[] */
    public static function password(string $password): array
    {
        $errors = [];
        if (mb_strlen($password) < self::PASSWORD_MIN) {
            $errors[] = 'A senha deve ter no mínimo ' . self::PASSWORD_MIN . ' caracteres.';
        }
        if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
            $errors[] = 'A senha deve conter letras e números.';
        }
        return $errors;
    }
}
