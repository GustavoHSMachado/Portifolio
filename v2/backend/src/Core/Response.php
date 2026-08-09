<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Resposta HTTP. Sempre JSON — o front consome só a API REST.
 */
final class Response
{
    /** @param array<string,string> $headers */
    private function __construct(
        public readonly int $status,
        public readonly mixed $payload,
        public readonly array $headers = [],
        public readonly array $cookies = [],
    ) {
    }

    public static function json(mixed $data, int $status = 200, array $headers = []): self
    {
        return new self($status, $data, $headers);
    }

    public static function ok(mixed $data = null, ?string $message = null): self
    {
        return self::json(array_filter([
            'data'    => $data,
            'message' => $message,
        ], static fn ($v) => $v !== null), 200);
    }

    public static function created(mixed $data = null, ?string $message = null): self
    {
        return self::json(array_filter([
            'data'    => $data,
            'message' => $message,
        ], static fn ($v) => $v !== null), 201);
    }

    public static function noContent(): self
    {
        return new self(204, null);
    }

    /**
     * Erro no formato RFC 7807 (Problem Details) simplificado.
     *
     * @param array<string,string[]> $errors
     */
    public static function error(
        string $message,
        int $status = 400,
        array $errors = [],
        ?string $code = null,
    ): self {
        return self::json(array_filter([
            'error'  => $message,
            'code'   => $code,
            'errors' => $errors ?: null,
        ], static fn ($v) => $v !== null), $status);
    }

    public function withHeader(string $name, string $value): self
    {
        return new self($this->status, $this->payload, [...$this->headers, $name => $value], $this->cookies);
    }

    public function withCookie(
        string $name,
        string $value,
        int $expires,
        bool $httpOnly = true,
        string $sameSite = 'Strict',
        string $path = '/',
    ): self {
        $cookie = compact('name', 'value', 'expires', 'httpOnly', 'sameSite', 'path');

        return new self($this->status, $this->payload, $this->headers, [...$this->cookies, $cookie]);
    }

    public function send(): void
    {
        if (headers_sent()) {
            return;
        }

        http_response_code($this->status);

        foreach ($this->headers as $name => $value) {
            header("{$name}: {$value}", true);
        }

        foreach ($this->cookies as $c) {
            setcookie($c['name'], $c['value'], [
                'expires'  => $c['expires'],
                'path'     => $c['path'],
                'secure'   => Config::bool('APP_SECURE_COOKIES', true),
                'httponly' => $c['httpOnly'],
                'samesite' => $c['sameSite'],
            ]);
        }

        if ($this->status === 204 || $this->payload === null) {
            return;
        }

        header('Content-Type: application/json; charset=utf-8', true);
        echo json_encode(
            $this->payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    }
}
