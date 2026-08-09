<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Exceção que o ErrorHandler converte diretamente em resposta HTTP.
 * Use para erros esperados; erros inesperados viram 500 sem vazar detalhes.
 */
class HttpException extends \RuntimeException
{
    /** @param array<string,string[]> $errors */
    public function __construct(
        string $message,
        private readonly int $status = 400,
        private readonly array $errors = [],
        private readonly ?string $errorCode = null,
    ) {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }

    /** @return array<string,string[]> */
    public function errors(): array
    {
        return $this->errors;
    }

    public function errorCode(): ?string
    {
        return $this->errorCode;
    }

    /** @param array<string,string[]> $errors */
    public static function validation(array $errors): self
    {
        return new self('Os dados enviados são inválidos.', 422, $errors, 'validation_failed');
    }

    public static function unauthorized(string $message = 'Não autenticado.'): self
    {
        return new self($message, 401, errorCode: 'unauthorized');
    }

    public static function forbidden(string $message = 'Acesso negado.'): self
    {
        return new self($message, 403, errorCode: 'forbidden');
    }

    public static function notFound(string $message = 'Recurso não encontrado.'): self
    {
        return new self($message, 404, errorCode: 'not_found');
    }

    public static function tooManyRequests(string $message = 'Muitas requisições. Tente novamente em instantes.'): self
    {
        return new self($message, 429, errorCode: 'rate_limited');
    }
}
