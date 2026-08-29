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
    private ?string $requestId = null;

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

    /**
     * Passa a carimbar todo log desta requisição com o id de correlação.
     *
     * Campo mutável num singleton, e não clone imutável, de propósito. A versão
     * anterior devolvia um clone — e o clone nunca chegava a lugar nenhum: quando
     * o RequestId roda, ErrorHandler, AuthService, MailService e MessageController
     * já foram construídos com a instância original do container. Fazer o clone
     * alcançá-los exigiria reconfigurar o container no meio da requisição. Foi
     * por isso que o método existiu por meses sem um único chamador, e o
     * `request_id` nunca apareceu em log nenhum.
     *
     * O compartilhamento é seguro porque uma requisição PHP é um processo: não há
     * duas requisições dentro do mesmo Logger ao mesmo tempo.
     */
    public function setRequestId(string $requestId): void
    {
        $this->requestId = $requestId;
    }

    /** @param array<string, mixed> $context */
    public function info(string $message, array $context = []): void
    {
        $this->logger->info($message, $this->prepara($context));
    }

    /** @param array<string, mixed> $context */
    public function warning(string $message, array $context = []): void
    {
        $this->logger->warning($message, $this->prepara($context));
    }

    /** @param array<string, mixed> $context */
    public function error(string $message, array $context = []): void
    {
        $this->logger->error($message, $this->prepara($context));
    }

    /**
     * Acrescenta o id de correlação e então remove os segredos.
     *
     * O array_key_exists respeita quem já trouxe o próprio request_id — é o caso
     * do ErrorHandler, que o lê dos atributos da requisição e continua valendo.
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function prepara(array $context): array
    {
        if ($this->requestId !== null && !array_key_exists('request_id', $context)) {
            $context['request_id'] = $this->requestId;
        }

        return $this->redact($context);
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
