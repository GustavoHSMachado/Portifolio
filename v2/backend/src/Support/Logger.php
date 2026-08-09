<?php

declare(strict_types=1);

namespace App\Support;

use App\Core\Config;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger as Monolog;
use Monolog\Processor\PsrLogMessageProcessor;

/**
 * Log estruturado em JSON com correlation id.
 * Regra do agente 10: logs não expõem segredos e eventos críticos são rastreáveis.
 */
final class Logger
{
    private const REDACTED = '[REDACTED]';

    private const SENSITIVE_KEYS = [
        'password', 'senha', 'password_confirmation', 'token', 'access_token',
        'refresh_token', 'authorization', 'secret', 'api_key', 'jwt', 'cookie',
    ];

    private Monolog $logger;

    public function __construct()
    {
        $this->logger = new Monolog(Config::get('APP_NAME', 'portifolio-api'));

        $handler = new StreamHandler(
            Config::get('LOG_PATH', 'php://stdout'),
            Level::fromName(Config::get('LOG_LEVEL', 'info')),
        );
        $handler->setFormatter(new JsonFormatter());

        $this->logger->pushHandler($handler);
        $this->logger->pushProcessor(new PsrLogMessageProcessor());
    }

    public function withRequestId(string $requestId): self
    {
        $clone = clone $this;
        $clone->logger = $this->logger->withName($this->logger->getName());
        $clone->logger->pushProcessor(static function (array $record) use ($requestId): array {
            $record['extra']['request_id'] = $requestId;

            return $record;
        });

        return $clone;
    }

    public function info(string $message, array $context = []): void
    {
        $this->logger->info($message, $this->redact($context));
    }

    public function warning(string $message, array $context = []): void
    {
        $this->logger->warning($message, $this->redact($context));
    }

    public function error(string $message, array $context = []): void
    {
        $this->logger->error($message, $this->redact($context));
    }

    /** Remove segredos antes de qualquer escrita. */
    private function redact(array $context): array
    {
        foreach ($context as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), self::SENSITIVE_KEYS, true)) {
                $context[$key] = self::REDACTED;
                continue;
            }
            if (is_array($value)) {
                $context[$key] = $this->redact($value);
            }
        }

        return $context;
    }
}
