<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Container de injeção de dependência minimalista com autowiring por reflexão.
 * Deliberadamente simples: 80 linhas resolvem o que este projeto precisa.
 * Regra do agente 02 — não adotar complexidade sem benefício comprovado.
 */
final class Container
{
    /** @var array<string, callable> */
    private array $factories = [];

    /** @var array<string, object> */
    private array $instances = [];

    public function bind(string $id, callable $factory): void
    {
        $this->factories[$id] = $factory;
    }

    public function singleton(string $id, callable $factory): void
    {
        $this->factories[$id] = function () use ($id, $factory) {
            return $this->instances[$id] ??= $factory($this);
        };
    }

    public function instance(string $id, object $object): void
    {
        $this->instances[$id] = $object;
        $this->factories[$id] = static fn () => $object;
    }

    public function has(string $id): bool
    {
        return isset($this->factories[$id]) || isset($this->instances[$id]) || class_exists($id);
    }

    /**
     * @template T of object
     * @param  class-string<T>|string $id
     * @return T|mixed
     */
    public function get(string $id): mixed
    {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        if (isset($this->factories[$id])) {
            return ($this->factories[$id])($this);
        }

        return $this->instances[$id] = $this->autowire($id);
    }

    private function autowire(string $class): object
    {
        if (!class_exists($class)) {
            throw new \RuntimeException("Serviço não registrado e classe inexistente: {$class}");
        }

        $reflection = new \ReflectionClass($class);

        if (!$reflection->isInstantiable()) {
            throw new \RuntimeException("Classe não instanciável: {$class}");
        }

        $constructor = $reflection->getConstructor();
        if ($constructor === null) {
            return new $class();
        }

        $args = [];
        foreach ($constructor->getParameters() as $param) {
            $type = $param->getType();

            if ($type instanceof \ReflectionNamedType && !$type->isBuiltin()) {
                $args[] = $this->get($type->getName());
                continue;
            }

            if ($param->isDefaultValueAvailable()) {
                $args[] = $param->getDefaultValue();
                continue;
            }

            throw new \RuntimeException(
                "Não foi possível resolver o parâmetro \${$param->getName()} de {$class}."
            );
        }

        return $reflection->newInstanceArgs($args);
    }
}
