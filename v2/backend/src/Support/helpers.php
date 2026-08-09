<?php

declare(strict_types=1);

if (!function_exists('base_path')) {
    /** Caminho absoluto a partir da raiz do backend. */
    function base_path(string $path = ''): string
    {
        return dirname(__DIR__, 2) . ($path !== '' ? '/' . ltrim($path, '/') : '');
    }
}

if (!function_exists('str_mask_email')) {
    /** Mascara e-mail para logs: gustavo@gmail.com -> g******@gmail.com */
    function str_mask_email(string $email): string
    {
        [$user, $domain] = array_pad(explode('@', $email, 2), 2, '');

        if ($user === '' || $domain === '') {
            return '[invalid]';
        }

        return mb_substr($user, 0, 1) . str_repeat('*', max(1, mb_strlen($user) - 1)) . '@' . $domain;
    }
}
