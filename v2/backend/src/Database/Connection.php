<?php

declare(strict_types=1);

namespace App\Database;

use App\Core\Config;
use PDO;
use PDOException;
use PDOStatement;

/**
 * Conexão PDO única, lazy, com prepared statements reais.
 * Nenhuma query da aplicação concatena input do usuário.
 */
final class Connection
{
    private ?PDO $pdo = null;

    public function pdo(): PDO
    {
        if ($this->pdo instanceof PDO) {
            return $this->pdo;
        }

        $dsn = sprintf(
            '%s:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            Config::get('DB_DRIVER', 'mysql'),
            Config::get('DB_HOST', '127.0.0.1'),
            Config::get('DB_PORT', '3306'),
            Config::get('DB_NAME', 'portifolio'),
        );

        try {
            $this->pdo = new PDO(
                $dsn,
                Config::get('DB_USER', 'root'),
                Config::get('DB_PASS', ''),
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::ATTR_STRINGIFY_FETCHES  => false,
                ],
            );
        } catch (PDOException $e) {
            // Detalhe da conexão nunca chega ao cliente.
            throw new \RuntimeException('Falha ao conectar ao banco de dados.', 0, $e);
        }

        return $this->pdo;
    }

    /** @param array<int|string, mixed> $params */
    public function run(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);

        return $stmt;
    }

    /** @return array<string,mixed>|null */
    public function first(string $sql, array $params = []): ?array
    {
        $row = $this->run($sql, $params)->fetch();

        return $row === false ? null : $row;
    }

    /** @return list<array<string,mixed>> */
    public function all(string $sql, array $params = []): array
    {
        return $this->run($sql, $params)->fetchAll();
    }

    public function lastInsertId(): int
    {
        return (int) $this->pdo()->lastInsertId();
    }

    /** @template T @param callable():T $callback @return T */
    public function transaction(callable $callback): mixed
    {
        $pdo = $this->pdo();
        $pdo->beginTransaction();

        try {
            $result = $callback($this);
            $pdo->commit();

            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $e;
        }
    }

    /** Injeta uma conexão pronta — usado pelos testes de integração com SQLite/MySQL efêmero. */
    public function setPdo(PDO $pdo): void
    {
        $this->pdo = $pdo;
    }
}
