<?php

declare(strict_types=1);

namespace App\Core;

use App\Http\Middleware\MiddlewareInterface;

/**
 * Roteador com pipeline de middlewares (padrão PSR-15 simplificado).
 *
 * Middlewares globais rodam em toda requisição; os de rota rodam depois,
 * na ordem declarada, e antes do controller.
 *
 * @phpstan-type RouteHandler array{class-string, string}
 * @phpstan-type MiddlewareList list<class-string>
 * @phpstan-type Route array{
 *     method: string,
 *     pattern: string,
 *     regex: string,
 *     params: list<string>,
 *     handler: RouteHandler,
 *     middleware: MiddlewareList
 * }
 */
final class Router
{
    /** @var list<Route> */
    private array $routes = [];

    /** @var MiddlewareList */
    private array $globalMiddleware = [];

    public function __construct(private readonly Container $container)
    {
    }

    /**
     * @param RouteHandler $handler
     * @param MiddlewareList $middleware
     */
    public function get(string $path, array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    /**
     * @param RouteHandler $handler
     * @param MiddlewareList $middleware
     */
    public function post(string $path, array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    /**
     * @param RouteHandler $handler
     * @param MiddlewareList $middleware
     */
    public function put(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    /**
     * @param RouteHandler $handler
     * @param MiddlewareList $middleware
     */
    public function patch(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    /**
     * @param RouteHandler $handler
     * @param MiddlewareList $middleware
     */
    public function delete(string $path, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    /** @param MiddlewareList $middleware */
    public function useGlobal(array $middleware): void
    {
        $this->globalMiddleware = [...$this->globalMiddleware, ...$middleware];
    }

    /**
     * @param RouteHandler $handler
     * @param MiddlewareList $middleware
     */
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

        /*
         * 404 e 405 também passam pelo pipeline global.
         *
         * Antes elas eram devolvidas direto daqui, sem middleware nenhum: saíam
         * sem CORS, sem cabeçalho de segurança e sem id de correlação. Para o
         * navegador, uma resposta de erro sem Access-Control-Allow-Origin é uma
         * resposta que ele não entrega ao JavaScript — o fetch rejeita como
         * falha de rede, e some a informação de que a rota simplesmente não
         * existe, que é o que faria alguém encontrar o erro de digitação.
         */
        if ($allowedMethods !== []) {
            $permitidos = implode(', ', array_unique($allowedMethods));

            return $this->runPipeline(
                $request,
                $this->globalMiddleware,
                null,
                static fn (): Response => Response::error(
                    'Método não permitido para este recurso.',
                    405,
                    code: 'method_not_allowed'
                )->withHeader('Allow', $permitidos),
            );
        }

        return $this->runPipeline(
            $request,
            $this->globalMiddleware,
            null,
            static fn (): Response => Response::error('Recurso não encontrado.', 404, code: 'not_found'),
        );
    }

    /**
     * @param MiddlewareList $middleware
     * @param RouteHandler|null $handler
     * @param (callable(): Response)|null $fallback resposta final quando não há handler
     */
    private function runPipeline(
        Request $request,
        array $middleware,
        ?array $handler,
        ?callable $fallback = null,
    ): Response {
        $next = function (Request $req) use ($handler, $fallback): Response {
            if ($handler === null) {
                return $fallback !== null ? $fallback() : Response::noContent();
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
