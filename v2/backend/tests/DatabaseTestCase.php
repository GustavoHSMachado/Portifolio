<?php

declare(strict_types=1);

namespace Tests;

use App\Core\Config;
use App\Database\Connection;
use App\Database\Migrator;
use PDO;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Base dos testes que tocam o banco.
 *
 * Roda contra MySQL real, aplicando as migrações de produção. A versão anterior
 * montava um schema equivalente à mão em SQLite, o que trazia dois problemas:
 * o schema divergia das migrações sem ninguém notar, e o código de produção usa
 * sintaxe MySQL (NOW(), DATE_ADD) que o SQLite não tem — três testes quebravam
 * por isso.
 *
 * O schema é aplicado uma vez por processo; os dados são limpos entre os testes.
 */
abstract class DatabaseTestCase extends TestCase
{
    protected Connection $db;

    private static bool $schemaReady = false;

    protected function setUp(): void
    {
        parent::setUp();

        Config::boot(dirname(__DIR__));

        $this->guardTestDatabase();

        $this->db = new Connection();

        if (!self::$schemaReady) {
            (new Migrator($this->db))->run();
            self::$schemaReady = true;
        }

        $this->truncateAll();
    }

    /**
     * Recusa rodar fora de um banco de teste.
     *
     * Esta classe dá TRUNCATE em todas as tabelas. Sem esta trava, um DB_NAME
     * herdado do ambiente — o container de desenvolvimento exporta
     * DB_NAME=portifolio — apagaria o banco de trabalho ao rodar a suíte.
     */
    private function guardTestDatabase(): void
    {
        $database = (string) Config::get('DB_NAME', '');

        if (!str_ends_with($database, '_test')) {
            throw new RuntimeException(sprintf(
                'Os testes de integração recusam rodar em "%s": o nome do banco precisa '
                . 'terminar em _test. Confira DB_NAME no phpunit.xml e no ambiente.',
                $database === '' ? '(vazio)' : $database
            ));
        }
    }

    /** Limpa os dados preservando o schema e o registro de migrações. */
    protected function truncateAll(): void
    {
        $pdo = $this->db->pdo();

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

        foreach ($this->dataTables() as $table) {
            $pdo->exec(sprintf('TRUNCATE TABLE `%s`', $table));
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    /**
     * Tabelas de dados do schema atual, exceto o controle de migrações.
     *
     * Lida do banco em vez de uma lista fixa: uma migração nova passa a ser
     * limpa sozinha, sem alguém precisar lembrar de atualizar esta classe.
     *
     * @return list<string>
     */
    private function dataTables(): array
    {
        $rows = $this->db->all(
            'SELECT table_name AS name
               FROM information_schema.tables
              WHERE table_schema = DATABASE()
                AND table_type = \'BASE TABLE\'
                AND table_name <> \'migrations\''
        );

        return array_map(static fn (array $row): string => (string) $row['name'], $rows);
    }

    /** Atalho para inspecionar o estado do banco dentro de uma asserção. */
    protected function pdo(): PDO
    {
        return $this->db->pdo();
    }
}
