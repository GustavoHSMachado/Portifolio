<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Representação imutável da requisição HTTP.
 * Nenhum controller deve tocar em $_POST / $_GET / $_SERVER diretamente.
 */
final class Request
{
    private array $attributes = [];

    private function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public readonly array $cookies,
        public readonly string $ip,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = '/' . trim(parse_url($uri, PHP_URL_PATH) ?: '/', '/');

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = $_SERVER['CONTENT_TYPE'];
        }

        $body = $_POST;
        $contentType = $headers['content-type'] ?? '';
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input') ?: '';
            $decoded = json_decode($raw, true);
            $body = is_array($decoded) ? $decoded : [];
        }

        return new self(
            method:  $method,
            path:    $path,
            query:   $_GET,
            body:    $body,
            headers: $headers,
            cookies: $_COOKIE,
            ip:      self::resolveIp(),
        );
    }

    /** IP real, respeitando proxy apenas se TRUSTED_PROXIES permitir. */
    private static function resolveIp(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $trusted = array_filter(explode(',', (string) Config::get('TRUSTED_PROXIES', '')));

        if ($trusted !== [] && in_array($remote, array_map('trim', $trusted), true)) {
            $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            $first = trim(explode(',', $forwarded)[0] ?? '');
            if (filter_var($first, FILTER_VALIDATE_IP)) {
                return $first;
            }
        }

        return $remote;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function string(string $key, string $default = ''): string
    {
        $value = $this->input($key, $default);

        return is_scalar($value) ? trim((string) $value) : $default;
    }

    public function header(string $name, ?string $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization', '');

        return preg_match('/^Bearer\s+(.+)$/i', (string) $auth, $m) ? $m[1] : null;
    }

    public function cookie(string $name, ?string $default = null): ?string
    {
        return $this->cookies[$name] ?? $default;
    }

    public function withAttribute(string $key, mixed $value): self
    {
        $clone = clone $this;
        $clone->attributes[$key] = $value;

        return $clone;
    }

    public function attribute(string $key, mixed $default = null): mixed
    {
        return $this->attributes[$key] ?? $default;
    }

    public function userId(): ?int
    {
        $id = $this->attribute('user_id');

        return $id === null ? null : (int) $id;
    }
}
