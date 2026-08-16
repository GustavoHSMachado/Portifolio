<?php

declare(strict_types=1);

namespace App\Support;

use App\Core\Config;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger as Monolog;
use Monolog\LogRecord;
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
        // Config::get devolve null quando a chave existe vazia, e o Monolog não
        // aceita null em nenhum destes três pontos. O padrão precisa ser
        // aplicado aqui, não só no segundo argumento do get.
        $this->logger = new Monolog((string) (Config::get('APP_NAME') ?: 'portifolio-api'));

        $handler = new StreamHandler(
            (string) (Config::get('LOG_PATH') ?: 'php://stdout'),
            self::levelFrom((string) (Config::get('LOG_LEVEL') ?: 'info')),
        );
        $handler->setFormatter(new JsonFormatter());

        $this->logger->pushHandler($handler);
        $this->logger->pushProcessor(new PsrLogMessageProcessor());
    }

    /**
     * Traduz o LOG_LEVEL para o nível do Monolog.
     *
     * Level::fromName lança exceção com nome desconhecido — um LOG_LEVEL com
     * erro de digitação derrubaria a aplicação no boot, em troca de nada. Aqui
     * o desconhecido cai em info, que é o comportamento seguro.
     */
    private static function levelFrom(string $name): Level
    {
        return match (strtolower(trim($name))) {
            'debug'     => Level::Debug,
            'notice'    => Level::Notice,
            'warning'   => Level::Warning,
            'error'     => Level::Error,
            'critical'  => Level::Critical,
            'alert'     => Level::Alert,
            'emergency' => Level::Emergency,
            default     => Level::Info,
        };
    }

    public function withRequestId(string $requestId): self
    {
        $clone = clone $this;
        $clone->logger = $this->logger->withName($this->logger->getName());
        // O Monolog 3 entrega um LogRecord, não um array. Com a assinatura
        // antiga isto lançava TypeError na primeira linha de log — o recurso de
        // correlação nunca funcionou, e nunca foi notado porque nada o chamava.
        $clone->logger->pushProcessor(
            static fn (LogRecord $record): LogRecord => $record->with(
                extra: [...$record->extra, 'request_id' => $requestId],
            )
        );

        return $clone;
    }

    /** @param array<string, mixed> $context */
    public function info(string $message, array $context = []): void
    {
        $this->logger->info($message, $this->redact($context));
    }

    /** @param array<string, mixed> $context */
    public function warning(string $message, array $context = []): void
    {
        $this->logger->warning($message, $this->redact($context));
    }

    /** @param array<string, mixed> $context */
    public function error(string $message, array $context = []): void
    {
        $this->logger->error($message, $this->redact($context));
    }

    /**
     * Remove segredos antes de qualquer escrita.
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
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
