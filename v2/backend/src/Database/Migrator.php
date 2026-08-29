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

    /** O número do último lote aplicado, ou null se não há nenhum. */
    public function lastBatch(): ?int
    {
        $row = $this->db->first('SELECT MAX(batch) AS ultimo FROM migrations');

        return $row === null || $row['ultimo'] === null ? null : (int) $row['ultimo'];
    }

    /**
     * Os comandos que desfazem uma migração, lidos do comentário do arquivo.
     *
     * Duas convenções coexistem no diretório, e as duas são aceitas porque
     * ambas já estão escritas — impor uma terceira só criaria trabalho de
     * migrar as quinze existentes:
     *
     *     -- ROLLBACK: DROP TABLE users;          (uma linha, pode repetir)
     *
     *     -- ROLLBACK                             (cabeçalho e o bloco abaixo)
     *     -- DROP TABLE IF EXISTS projects;
     *     -- DROP TABLE IF EXISTS skills;
     *
     * Devolve lista vazia quando o arquivo não declara volta. Quem chama
     * precisa tratar isso como recusa, e não como "nada a fazer": marcar uma
     * migração como revertida sem executar nada deixaria o registro mentindo
     * sobre o estado real do banco.
     *
     * @return list<string>
     */
    public function rollbackStatementsIn(string $file): array
    {
        $linhas = preg_split('/\R/', file_get_contents($file) ?: '') ?: [];
        $comandos = [];
        $dentroDoBloco = false;

        foreach ($linhas as $linha) {
            $linha = trim($linha);

            // -- ROLLBACK: <sql>
            if (preg_match('/^--\s*ROLLBACK\s*:\s*(.+)$/i', $linha, $m) === 1) {
                $comandos[] = trim($m[1]);
                $dentroDoBloco = false;
                continue;
            }

            // -- ROLLBACK  (cabeçalho de bloco)
            if (preg_match('/^--\s*ROLLBACK\s*$/i', $linha) === 1) {
                $dentroDoBloco = true;
                continue;
            }

            if (!$dentroDoBloco) {
                continue;
            }

            // Dentro do bloco: cada linha de comentário é um comando; linha em
            // branco ou qualquer outra coisa encerra.
            if (preg_match('/^--\s*(.+)$/', $linha, $m) === 1) {
                $comandos[] = trim($m[1]);
                continue;
            }

            $dentroDoBloco = false;
        }

        return array_values(array_filter(
            array_map(static fn (string $c): string => rtrim(trim($c), ';'), $comandos),
            static fn (string $c): bool => $c !== ''
        ));
    }

    /**
     * Desfaz o último lote aplicado, na ordem inversa.
     *
     * ATENÇÃO, e isto precisa ficar escrito junto do código: rollback só é
     * seguro para migração ESTRUTURAL ADITIVA — criar tabela, criar coluna,
     * criar índice. Migração que apaga ou transforma dado não tem volta por
     * SQL: o DROP devolve a estrutura, nunca o conteúdo. Para essas, a única
     * resposta é o dump prévio, e é por isso que o docs/DEPLOY.md exige um
     * antes de todo deploy com migração.
     *
     * Recusa o lote inteiro, sem executar nada, se qualquer migração dele não
     * declarar rollback. Meio lote revertido é pior que nenhum: deixa o banco
     * num estado que nem o código novo nem o velho esperam.
     *
     * @param null|callable(string, int): void $onRolledBack recebe nome e nº de comandos
     * @return int quantidade de migrações revertidas
     */
    public function rollback(?callable $onRolledBack = null): int
    {
        $this->ensureControlTable();

        $batch = $this->lastBatch();

        if ($batch === null) {
            return 0;
        }

        $registros = $this->db->all(
            'SELECT filename FROM migrations WHERE batch = ? ORDER BY filename DESC',
            [$batch]
        );

        $plano = [];
        $semVolta = [];

        foreach ($registros as $registro) {
            $nome = (string) $registro['filename'];
            $caminho = $this->path . '/' . $nome;

            if (!is_file($caminho)) {
                throw new RuntimeException(
                    "{$nome}: registrado como aplicado, mas o arquivo não existe mais. "
                    . 'Reverter às cegas apagaria estrutura sem saber qual.'
                );
            }

            $comandos = $this->rollbackStatementsIn($caminho);

            if ($comandos === []) {
                $semVolta[] = $nome;
                continue;
            }

            $plano[] = ['nome' => $nome, 'comandos' => $comandos];
        }

        if ($semVolta !== []) {
            throw new RuntimeException(
                'Este lote não pode ser revertido: ' . implode(', ', $semVolta)
                . ' não declara rollback. Acrescente um comentário "-- ROLLBACK: ..." '
                . 'no arquivo, ou restaure o dump.'
            );
        }

        foreach ($plano as $item) {
            foreach ($item['comandos'] as $comando) {
                $this->db->run($comando);
            }

            $this->db->run('DELETE FROM migrations WHERE filename = ?', [$item['nome']]);

            if ($onRolledBack !== null) {
                $onRolledBack($item['nome'], count($item['comandos']));
            }
        }

        return count($plano);
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
