<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Database\Migrator;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\DatabaseTestCase;

/**
 * Rollback de migração.
 *
 * Os testes rodam contra um diretório temporário, e não contra as migrações do
 * projeto: reverter as reais dentro da suíte derrubaria o schema que os outros
 * testes de integração precisam encontrar de pé.
 *
 * Cada teste usa um prefixo próprio no nome dos arquivos e apaga as próprias
 * linhas de `migrations` no tearDown. A limpeza da classe base não cobre essa
 * tabela — ela é preservada de propósito, para o schema ser aplicado uma vez
 * por processo —, então um teste que registrasse migrações e não as removesse
 * envenenaria o seguinte: `pending()` passaria a devolver vazio, `run()` não
 * criaria nada, e a falha apareceria longe da causa.
 */
final class MigratorRollbackTest extends DatabaseTestCase
{
    private string $dir;

    /** Prefixo único deste teste, usado no nome dos arquivos de migração. */
    private string $prefixo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prefixo = '2030_01_01_' . bin2hex(random_bytes(4));
        $this->dir = sys_get_temp_dir() . '/migracoes-' . $this->prefixo;

        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        $this->db->run('DELETE FROM migrations WHERE filename LIKE ?', [$this->prefixo . '%']);

        foreach (glob($this->dir . '/*.sql') ?: [] as $arquivo) {
            unlink($arquivo);
        }

        if (is_dir($this->dir)) {
            rmdir($this->dir);
        }

        $pdo = $this->db->pdo();
        $pdo->exec('DROP TABLE IF EXISTS teste_rollback_b');
        $pdo->exec('DROP TABLE IF EXISTS teste_rollback_a');

        parent::tearDown();
    }

    private function escrever(string $sufixo, string $conteudo): string
    {
        $nome = $this->prefixo . '_' . $sufixo . '.sql';

        file_put_contents($this->dir . '/' . $nome, $conteudo);

        return $nome;
    }

    private function migrator(): Migrator
    {
        return new Migrator($this->db, $this->dir);
    }

    private function tabelaExiste(string $tabela): bool
    {
        return $this->db->first(
            'SELECT 1 AS existe FROM information_schema.tables
              WHERE table_schema = DATABASE() AND table_name = ?',
            [$tabela]
        ) !== null;
    }

    /** As migrações deste teste que constam como aplicadas. */
    private function registradas(): int
    {
        $row = $this->db->first(
            'SELECT COUNT(*) AS total FROM migrations WHERE filename LIKE ?',
            [$this->prefixo . '%']
        );

        return (int) ($row['total'] ?? 0);
    }

    #[Test]
    public function reverte_o_ultimo_lote_na_ordem_inversa(): void
    {
        $this->escrever(
            '01_a',
            "CREATE TABLE teste_rollback_a (id INT PRIMARY KEY);\n"
            . "-- ROLLBACK: DROP TABLE teste_rollback_a;\n"
        );

        // B depende de A por chave estrangeira: se o rollback não for na ordem
        // inversa, o DROP de A falha e o teste acusa.
        $this->escrever(
            '02_b',
            "CREATE TABLE teste_rollback_b (\n"
            . "    id INT PRIMARY KEY,\n"
            . "    a_id INT NOT NULL,\n"
            . "    CONSTRAINT fk_b_a FOREIGN KEY (a_id) REFERENCES teste_rollback_a (id)\n"
            . ");\n"
            . "-- ROLLBACK: DROP TABLE teste_rollback_b;\n"
        );

        $migrator = $this->migrator();

        self::assertSame(2, $migrator->run());
        self::assertTrue($this->tabelaExiste('teste_rollback_a'));
        self::assertTrue($this->tabelaExiste('teste_rollback_b'));
        self::assertSame(2, $this->registradas());

        self::assertSame(2, $migrator->rollback());

        self::assertFalse($this->tabelaExiste('teste_rollback_a'));
        self::assertFalse($this->tabelaExiste('teste_rollback_b'));
        self::assertSame(0, $this->registradas(), 'o registro precisa sair junto');
    }

    #[Test]
    public function o_que_foi_revertido_pode_ser_aplicado_de_novo(): void
    {
        $this->escrever(
            '01_a',
            "CREATE TABLE teste_rollback_a (id INT PRIMARY KEY);\n"
            . "-- ROLLBACK: DROP TABLE teste_rollback_a;\n"
        );

        $migrator = $this->migrator();

        self::assertSame(1, $migrator->run());
        self::assertSame(1, $migrator->rollback());
        self::assertSame(0, $this->registradas());

        self::assertSame(1, $migrator->run(), 'a migração revertida volta a ficar pendente');
        self::assertTrue($this->tabelaExiste('teste_rollback_a'));
    }

    #[Test]
    public function recusa_o_lote_inteiro_quando_uma_migracao_nao_declara_volta(): void
    {
        $this->escrever(
            '01_a',
            "CREATE TABLE teste_rollback_a (id INT PRIMARY KEY);\n"
            . "-- ROLLBACK: DROP TABLE teste_rollback_a;\n"
        );

        // Sem comentário de rollback nenhum.
        $this->escrever('02_b', "CREATE TABLE teste_rollback_b (id INT PRIMARY KEY);\n");

        $migrator = $this->migrator();

        self::assertSame(2, $migrator->run());

        try {
            $migrator->rollback();
            self::fail('deveria recusar o lote com uma migração sem rollback');
        } catch (RuntimeException $e) {
            self::assertStringContainsString('não declara rollback', $e->getMessage());
        }

        // O ponto do teste: recusou ANTES de executar qualquer coisa. Meio lote
        // revertido deixa o banco num estado que nenhuma versão do código espera.
        self::assertTrue($this->tabelaExiste('teste_rollback_a'), 'nada pode ter sido executado');
        self::assertTrue($this->tabelaExiste('teste_rollback_b'));
        self::assertSame(2, $this->registradas(), 'o registro precisa continuar intacto');
    }

    #[Test]
    public function le_as_duas_convencoes_de_comentario(): void
    {
        $inline = $this->escrever(
            '01_inline',
            "CREATE TABLE teste_rollback_a (id INT PRIMARY KEY);\n"
            . "-- ROLLBACK: ALTER TABLE teste_rollback_a ADD COLUMN x INT NULL;\n"
            . "-- ROLLBACK: DROP TABLE teste_rollback_a;\n"
        );

        $bloco = $this->escrever(
            '02_bloco',
            "CREATE TABLE teste_rollback_b (id INT PRIMARY KEY);\n"
            . "\n"
            . "-- ROLLBACK\n"
            . "-- DELETE FROM teste_rollback_b;\n"
            . "-- DROP TABLE teste_rollback_b;\n"
        );

        $migrator = $this->migrator();

        self::assertSame(
            [
                'ALTER TABLE teste_rollback_a ADD COLUMN x INT NULL',
                'DROP TABLE teste_rollback_a',
            ],
            $migrator->rollbackStatementsIn($this->dir . '/' . $inline)
        );

        self::assertSame(
            [
                'DELETE FROM teste_rollback_b',
                'DROP TABLE teste_rollback_b',
            ],
            $migrator->rollbackStatementsIn($this->dir . '/' . $bloco)
        );
    }

    #[Test]
    public function todas_as_migracoes_do_projeto_declaram_rollback(): void
    {
        /*
         * Guarda de regressão, e o motivo dela: a migração 000015 foi escrita
         * sem comentário de rollback e ninguém notou, porque nada lia esse
         * comentário. Agora que o Migrator lê, uma migração nova sem volta
         * quebra este teste em vez de quebrar o deploy.
         */
        $migracoes = dirname(__DIR__, 2) . '/database/migrations';
        $reais = new Migrator($this->db, $migracoes);
        $arquivos = glob($migracoes . '/*.sql') ?: [];

        self::assertNotEmpty($arquivos);

        foreach ($arquivos as $arquivo) {
            self::assertNotEmpty(
                $reais->rollbackStatementsIn($arquivo),
                basename($arquivo) . ' não declara rollback'
            );
        }
    }
}
