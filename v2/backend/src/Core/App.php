<?php

declare(strict_types=1);

namespace App\Core;

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\Authenticate;
use App\Http\Middleware\Cors;
use App\Http\Middleware\ErrorHandler;
use App\Http\Middleware\RateLimit;
use App\Http\Middleware\RequestId;
use App\Http\Middleware\RequireAdmin;
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
     * Ordem dos middlewares globais é intencional.
     *
     * RequestId primeiro, porque todo log precisa de correlação. Cors logo
     * depois, envolvendo o ErrorHandler. RateLimit por último, para o preflight
     * não consumir cota.
     *
     * O Cors precisa vir ANTES do ErrorHandler, e não depois. Um middleware só
     * enxerga a resposta que o seguinte devolve — e quando alguém lança
     * exceção, quem a converte em resposta é o ErrorHandler. Com o Cors abaixo
     * dele, essa resposta subia sem passar pelo Cors: 401, 404, 422 e 429 saíam
     * todos sem Access-Control-Allow-Origin.
     *
     * O efeito era invisível no servidor e grave no navegador. Sem o cabeçalho,
     * o navegador recusa entregar a resposta ao JavaScript e o fetch rejeita
     * como falha de rede. Toda mensagem de erro da API — "senha incorreta",
     * "muitas tentativas", "link expirado" — chegava ao usuário como "Não
     * conseguimos falar com o servidor", que não ajuda a resolver nenhuma
     * delas.
     */
    /** @return list<class-string> */
    private function globalMiddleware(): array
    {
        return [
            RequestId::class,
            Cors::class,
            ErrorHandler::class,
            SecurityHeaders::class,
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
        // Segundo passo do login: o código de 7 dígitos enviado por e-mail.
        $this->router->post('/api/v1/auth/login/verify', [AuthController::class, 'verifyLoginCode']);
        $this->router->post('/api/v1/auth/refresh', [AuthController::class, 'refresh']);
        $this->router->post('/api/v1/auth/logout', [AuthController::class, 'logout']);
        $this->router->post('/api/v1/auth/verify-email', [AuthController::class, 'verifyEmail']);
        $this->router->post('/api/v1/auth/resend-verification', [AuthController::class, 'resendVerification']);
        $this->router->post('/api/v1/auth/forgot-password', [AuthController::class, 'forgotPassword']);
        $this->router->post('/api/v1/auth/reset-password', [AuthController::class, 'resetPassword']);

        // Autenticado
        $this->router->post('/api/v1/auth/change-password/request', [AuthController::class, 'requestPasswordChange'], $auth);
        $this->router->post('/api/v1/auth/change-password', [AuthController::class, 'changePassword'], $auth);
        $this->router->get('/api/v1/me', [UserController::class, 'me'], $auth);
        $this->router->put('/api/v1/me', [UserController::class, 'updateProfile'], $verified);

        // Conteúdo do portfólio — leitura pública, sem autenticação.
        // Público: perfil, formação, experiência, habilidades e a contagem de
        // projetos. Os projetos em si exigem sessão desde 23/08/2026.
        $this->router->get('/api/v1/content', [ContentController::class, 'index']);
        $this->router->get('/api/v1/projects', [ContentController::class, 'projects'], $auth);

        // Envio de sugestões e dúvidas. A leitura fica com as demais rotas
        // administrativas, abaixo, onde $admin já existe.
        $this->router->post('/api/v1/messages', [MessageController::class, 'store']);
        $this->router->get('/api/v1/projects/{slug}', [ContentController::class, 'project'], $auth);

        // Painel de conteúdo. RequireAdmin e não apenas Authenticate: qualquer
        // conta confirmada poderia reescrever o portfólio inteiro de outra forma.
        $admin = [Authenticate::class, RequireAdmin::class];

        $this->router->get('/api/v1/admin/content', [ContentController::class, 'adminIndex'], $admin);

        // Aparência e textos da home.
        $this->router->get('/api/v1/admin/settings', [SettingsController::class, 'index'], $admin);
        $this->router->put('/api/v1/admin/settings', [SettingsController::class, 'update'], $admin);

        // Acompanhamento: contas cadastradas e o que aconteceu no sistema.
        $this->router->get('/api/v1/admin/users', [AdminController::class, 'users'], $admin);
        $this->router->get('/api/v1/admin/audit', [AdminController::class, 'auditLog'], $admin);

        // Gestão de contas. Precisa vir antes do delete curinga logo abaixo,
        // que casaria /admin/users/{id} e devolveria "coleção desconhecida".
        $this->router->post('/api/v1/admin/users/{id}/lock', [AdminController::class, 'lockUser'], $admin);
        $this->router->post('/api/v1/admin/users/{id}/unlock', [AdminController::class, 'unlockUser'], $admin);
        $this->router->delete('/api/v1/admin/users/{id}', [AdminController::class, 'deleteUser'], $admin);

        // Caixa de entrada das mensagens do site.
        $this->router->get('/api/v1/admin/messages', [MessageController::class, 'index'], $admin);
        $this->router->post('/api/v1/admin/messages/{id}/read', [MessageController::class, 'markRead'], $admin);
        $this->router->put('/api/v1/admin/profile', [ContentController::class, 'updateProfile'], $admin);

        $this->router->post('/api/v1/admin/education', [ContentController::class, 'saveEducation'], $admin);
        $this->router->put('/api/v1/admin/education/{id}', [ContentController::class, 'saveEducation'], $admin);

        $this->router->post('/api/v1/admin/experiences', [ContentController::class, 'saveExperience'], $admin);
        $this->router->put('/api/v1/admin/experiences/{id}', [ContentController::class, 'saveExperience'], $admin);

        $this->router->post('/api/v1/admin/skills', [ContentController::class, 'saveSkill'], $admin);
        $this->router->put('/api/v1/admin/skills/{id}', [ContentController::class, 'saveSkill'], $admin);

        $this->router->post('/api/v1/admin/projects', [ContentController::class, 'saveProject'], $admin);
        $this->router->put('/api/v1/admin/projects/{id}', [ContentController::class, 'saveProject'], $admin);

        $this->router->delete('/api/v1/admin/{collection}/{id}', [ContentController::class, 'destroy'], $admin);
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
