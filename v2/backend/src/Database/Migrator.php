<?php

declare(strict_types=1);

namespace App\Database;

use RuntimeException;

/**
 * Aplicação das migrações, idempotente e versionada.
 *
 * Vive aqui, e não dentro de database/migrate.php, para que a CLI e os testes
 * de integração usem o mesmo código. Enquanto o schema de teste era escrito à
 * mão em SQLite, ele divergia das migrações reais sem ninguém perceber — e um
 * teste passando contra um schema que não é o de produção não prova nada.
 *
 * As migrações são aplicadas em ordem alfabética; o prefixo de data no nome
 * garante a sequência.
 */
final class Migrator
{
    private readonly string $path;

    public function __construct(
        private readonly Connection $db,
        ?string $path = null,
    ) {
        $this->path = $path ?? dirname(__DIR__, 2) . '/database/migrations';
    }

    /** Cria a tabela de controle. Idempotente. */
    public function ensureControlTable(): void
    {
        $this->db->run(
            'CREATE TABLE IF NOT EXISTS migrations (
                id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
                filename   VARCHAR(255) NOT NULL,
                batch      INT UNSIGNED NOT NULL,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_migrations_filename (filename)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    /** @return list<string> nomes já aplicados */
    public function applied(): array
    {
        return array_column($this->db->all('SELECT filename FROM migrations'), 'filename');
    }

    /** @return list<string> caminhos ainda não aplicados, em ordem */
    public function pending(): array
    {
        $applied = $this->applied();
        $files = glob($this->path . '/*.sql') ?: [];
        sort($files);

        return array_values(array_filter(
            $files,
            static fn (string $file): bool => !in_array(basename($file), $applied, true)
        ));
    }

    /**
     * Divide o arquivo em comandos executáveis.
     *
     * Os comentários saem ANTES da divisão por ';'. Sem isso, o cabeçalho de
     * comentário no topo do arquivo fica colado no primeiro comando, o bloco
     * inteiro passa a "começar com --" e era descartado em silêncio: a migração
     * era marcada como aplicada sem criar nada, e o banco travava nesse estado
     * porque a lista de pendentes zerava.
     *
     * @return list<string>
     */
    public function statementsIn(string $file): array
    {
        $sql = file_get_contents($file) ?: '';
        $sql = preg_replace('/^[ \t]*--.*$/m', '', $sql) ?? $sql;

        return array_values(array_filter(
            array_map('trim', explode(';', $sql)),
            static fn (string $statement): bool => $statement !== ''
        ));
    }

    /**
     * Aplica uma migração e registra o nome.
     *
     * @return int quantidade de comandos executados
     */
    public function apply(string $file, int $batch): int
    {
        $statements = $this->statementsIn($file);

        if ($statements === []) {
            throw new RuntimeException(
                basename($file) . ': nenhum comando SQL encontrado no arquivo.'
            );
        }

        foreach ($statements as $statement) {
            $this->db->run($statement);
        }

        $this->db->run(
            'INSERT INTO migrations (filename, batch) VALUES (?, ?)',
            [basename($file), $batch]
        );

        return count($statements);
    }

    public function nextBatch(): int
    {
        return (int) ($this->db->first(
            'SELECT COALESCE(MAX(batch), 0) + 1 AS next FROM migrations'
        )['next'] ?? 1);
    }

    /**
     * Aplica tudo que estiver pendente.
     *
     * @param null|callable(string, int): void $onApplied recebe nome e nº de comandos
     * @return int quantidade de migrações aplicadas
     */
    public function run(?callable $onApplied = null): int
    {
        $this->ensureControlTable();

        $pending = $this->pending();

        if ($pending === []) {
            return 0;
        }

        $batch = $this->nextBatch();

        foreach ($pending as $file) {
            $count = $this->apply($file, $batch);

            if ($onApplied !== null) {
                $onApplied(basename($file), $count);
            }
        }

        return count($pending);
    }
}
