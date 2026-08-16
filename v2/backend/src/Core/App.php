<?php

declare(strict_types=1);

namespace App\Core;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\Authenticate;
use App\Http\Middleware\Cors;
use App\Http\Middleware\ErrorHandler;
use App\Http\Middleware\RateLimit;
use App\Http\Middleware\RequestId;
use App\Http\Middleware\RequireVerifiedEmail;
use App\Http\Middleware\SecurityHeaders;

/**
 * Kernel da aplicação: monta o container, registra as rotas e despacha.
 */
final class App
{
    private Container $container;
    private Router $router;

    public function __construct(private readonly string $basePath)
    {
        Config::boot($this->basePath);

        $this->container = new Container();
        $this->router = new Router($this->container);
        $this->container->instance(Container::class, $this->container);

        $this->bootObservability();
        $this->registerRoutes();
    }

    /**
     * Ordem dos middlewares globais é intencional:
     * RequestId primeiro (todo log precisa de correlação), ErrorHandler logo depois
     * (para capturar falhas de todos os seguintes), CORS antes do rate limit
     * (o preflight não deve consumir cota).
     */
    /** @return list<class-string> */
    private function globalMiddleware(): array
    {
        return [
            RequestId::class,
            ErrorHandler::class,
            SecurityHeaders::class,
            Cors::class,
            RateLimit::class,
        ];
    }

    private function registerRoutes(): void
    {
        $this->router->useGlobal($this->globalMiddleware());

        $auth = [Authenticate::class];
        $verified = [Authenticate::class, RequireVerifiedEmail::class];

        // Saúde
        $this->router->get('/health', [HealthController::class, 'live']);
        $this->router->get('/health/ready', [HealthController::class, 'ready']);

        // Autenticação pública
        $this->router->post('/api/v1/auth/register', [AuthController::class, 'register']);
        $this->router->post('/api/v1/auth/login', [AuthController::class, 'login']);
        $this->router->post('/api/v1/auth/refresh', [AuthController::class, 'refresh']);
        $this->router->post('/api/v1/auth/logout', [AuthController::class, 'logout']);
        $this->router->post('/api/v1/auth/verify-email', [AuthController::class, 'verifyEmail']);
        $this->router->post('/api/v1/auth/resend-verification', [AuthController::class, 'resendVerification']);
        $this->router->post('/api/v1/auth/forgot-password', [AuthController::class, 'forgotPassword']);
        $this->router->post('/api/v1/auth/reset-password', [AuthController::class, 'resetPassword']);

        // Autenticado
        $this->router->post('/api/v1/auth/change-password', [AuthController::class, 'changePassword'], $auth);
        $this->router->get('/api/v1/me', [UserController::class, 'me'], $auth);
        $this->router->put('/api/v1/me', [UserController::class, 'updateProfile'], $verified);
    }

    private function bootObservability(): void
    {
        $dsn = Config::get('SENTRY_DSN');

        if ($dsn !== null && $dsn !== '' && class_exists(\Sentry\SentrySdk::class)) {
            \Sentry\init([
                'dsn'                => $dsn,
                'environment'        => Config::get('APP_ENV', 'production'),
                'release'            => Config::get('APP_VERSION', 'dev'),
                'traces_sample_rate' => (float) Config::get('SENTRY_TRACES_SAMPLE_RATE', '0.2'),
                'send_default_pii'   => false, // nunca enviar dados pessoais
            ]);
        }
    }

    public function run(): void
    {
        $this->router->dispatch(Request::fromGlobals())->send();
    }

    /** Exposto para os testes de integração montarem requisições sintéticas. */
    public function handle(Request $request): Response
    {
        return $this->router->dispatch($request);
    }

    public function container(): Container
    {
        return $this->container;
    }
}
