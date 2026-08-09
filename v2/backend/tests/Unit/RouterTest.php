<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Container;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class RouterTest extends TestCase
{
    private function request(string $method, string $path): Request
    {
        $_SERVER['REQUEST_METHOD'] = $method;
        $_SERVER['REQUEST_URI']    = $path;
        $_SERVER['REMOTE_ADDR']    = '127.0.0.1';
        $_POST = [];
        $_GET  = [];

        return Request::fromGlobals();
    }

    #[Test]
    public function resolve_rota_simples(): void
    {
        $router = new Router(new Container());
        $router->get('/ping', [RouterTestController::class, 'ping']);

        $response = $router->dispatch($this->request('GET', '/ping'));

        self::assertSame(200, $response->status);
        self::assertSame('pong', $response->payload['data']);
    }

    #[Test]
    public function extrai_parametro_da_url(): void
    {
        $router = new Router(new Container());
        $router->get('/users/{id}', [RouterTestController::class, 'show']);

        $response = $router->dispatch($this->request('GET', '/users/99'));

        self::assertSame('99', $response->payload['data']);
    }

    #[Test]
    public function rota_inexistente_devolve_404(): void
    {
        $router = new Router(new Container());

        self::assertSame(404, $router->dispatch($this->request('GET', '/nao-existe'))->status);
    }

    #[Test]
    public function metodo_errado_devolve_405(): void
    {
        $router = new Router(new Container());
        $router->post('/ping', [RouterTestController::class, 'ping']);

        $response = $router->dispatch($this->request('GET', '/ping'));

        self::assertSame(405, $response->status);
    }

    #[Test]
    public function middleware_pode_cortar_a_cadeia(): void
    {
        $router = new Router(new Container());
        $router->get('/protegido', [RouterTestController::class, 'ping'], [BlockingMiddleware::class]);

        $response = $router->dispatch($this->request('GET', '/protegido'));

        self::assertSame(401, $response->status);
    }
}

final class RouterTestController
{
    public function ping(Request $request): Response
    {
        return Response::ok('pong');
    }

    public function show(Request $request): Response
    {
        return Response::ok($request->attribute('id'));
    }
}

final class BlockingMiddleware implements \App\Http\Middleware\MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        return Response::error('bloqueado', 401);
    }
}
