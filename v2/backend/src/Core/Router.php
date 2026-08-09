<?php

declare(strict_types=1);

namespace App\Core;

use App\Http\Middleware\MiddlewareInterface;

/**
 * Roteador com pipeline de middlewares (padrão PSR-15 simplificado).
 *
 * Middlewares globais rodam em toda requisição; os de rota rodam depois,
 * na ordem declarada, e antes do controller.
 */
final class Router
{
    /** @var array<int, array{method:string, pattern:string, regex:string, params:string[], handler:array, middleware:string[]}> */
    private array $routes = [];

    /** @var string[] */
    private array $globalMiddleware = [];

    public function __construct(private readonly Container $container)
    {
    }

    /** @param string[] $middleware */
    public function get(string $path, array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    /** @param string[] $middleware */
    public function useGlobal(array $middleware): void
    {
        $this->globalMiddleware = [...$this->globalMiddleware, ...$middleware];
    }

    private function add(string $method, string $path, array $handler, array $middleware): void
    {
        $params = [];
        $regex = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            static function (array $m) use (&$params): string {
                $params[] = $m[1];

                return '([^/]+)';
            },
            $path
        );

        $this->routes[] = [
            'method'     => $method,
            'pattern'    => $path,
            'regex'      => '#^' . $regex . '$#',
            'params'     => $params,
            'handler'    => $handler,
            'middleware' => $middleware,
        ];
    }

    public function dispatch(Request $request): Response
    {
        $allowedMethods = [];

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $request->path, $matches)) {
                continue;
            }

            if ($route['method'] !== $request->method) {
                $allowedMethods[] = $route['method'];
                continue;
            }

            array_shift($matches);
            foreach ($route['params'] as $i => $name) {
                $request = $request->withAttribute($name, $matches[$i] ?? null);
            }

            return $this->runPipeline(
                $request,
                [...$this->globalMiddleware, ...$route['middleware']],
                $route['handler']
            );
        }

        // Preflight de CORS é respondido pelo middleware global.
        if ($request->method === 'OPTIONS') {
            return $this->runPipeline($request, $this->globalMiddleware, null);
        }

        if ($allowedMethods !== []) {
            return Response::error('Método não permitido para este recurso.', 405, code: 'method_not_allowed')
                ->withHeader('Allow', implode(', ', array_unique($allowedMethods)));
        }

        return Response::error('Recurso não encontrado.', 404, code: 'not_found');
    }

    /** @param string[] $middleware */
    private function runPipeline(Request $request, array $middleware, ?array $handler): Response
    {
        $next = function (Request $req) use ($handler): Response {
            if ($handler === null) {
                return Response::noContent();
            }

            [$class, $method] = $handler;
            $controller = $this->container->get($class);

            return $controller->{$method}($req);
        };

        foreach (array_reverse($middleware) as $middlewareClass) {
            $current = $next;
            $next = function (Request $req) use ($middlewareClass, $current): Response {
                /** @var MiddlewareInterface $instance */
                $instance = $this->container->get($middlewareClass);

                return $instance->handle($req, $current);
            };
        }

        return $next($request);
    }
}
