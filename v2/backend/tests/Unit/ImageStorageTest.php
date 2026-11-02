<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\HttpException;
use App\Core\UploadedFile;
use App\Services\ImageStorage;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * O que o upload recusa, e o que ele faz com o que aceita.
 *
 * Cada teste aqui corresponde a uma forma conhecida de abusar de um formulário
 * de arquivo. Eles existem porque todas passariam pelo PHPStan, pelo lint e
 * pela revisão: o código "funciona" com qualquer um destes arquivos, e o que
 * muda é o que acontece depois.
 */
final class ImageStorageTest extends TestCase
{
    private string $raiz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->raiz = sys_get_temp_dir() . '/portifolio-uploads-' . bin2hex(random_bytes(6));
        mkdir($this->raiz, 0o755, true);
    }

    protected function tearDown(): void
    {
        $this->apagarRecursivo($this->raiz);

        parent::tearDown();
    }

    #[Test]
    public function grava_png_valido_com_nome_sorteado(): void
    {
        $caminho = $this->storage()->store($this->arquivo($this->png(400, 300), 'print.png'), 'uploads/projetos');

        self::assertMatchesRegularExpression('#^uploads/projetos/[0-9a-f]{32}\.png$#', $caminho);
        self::assertFileExists($this->raiz . '/' . $caminho);
    }

    /**
     * O nome do cliente não participa do nome em disco.
     *
     * Este é o caso que a sanitização costuma tentar resolver com str_replace.
     * Sortear o nome resolve por construção: não há o que escapar.
     */
    #[Test]
    public function ignora_o_nome_enviado_pelo_cliente(): void
    {
        $caminho = $this->storage()->store(
            $this->arquivo($this->png(400, 300), '../../../index.php'),
            'uploads/projetos'
        );

        self::assertStringNotContainsString('..', $caminho);
        self::assertStringNotContainsString('index', $caminho);
        self::assertStringEndsWith('.png', $caminho);
    }

    /**
     * PHP renomeado para .jpg, com o Content-Type "certo".
     *
     * Passa pela extensão e pelo cabeçalho; morre no finfo, que lê os bytes.
     */
    #[Test]
    public function recusa_php_disfarcado_de_imagem(): void
    {
        $this->expectException(HttpException::class);

        $this->storage()->store(
            $this->arquivo('<?php echo "oi"; ?>', 'foto.jpg', 'image/jpeg'),
            'uploads/projetos'
        );
    }

    /** SVG é XML com <script> dentro: servir SVG de terceiro é servir JavaScript. */
    #[Test]
    public function recusa_svg(): void
    {
        $this->expectException(HttpException::class);

        $this->storage()->store(
            $this->arquivo(
                '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
                'icone.svg',
                'image/svg+xml'
            ),
            'uploads/projetos'
        );
    }

    #[Test]
    public function recusa_imagem_menor_que_a_largura_minima(): void
    {
        $this->expectException(HttpException::class);

        $this->storage()->store($this->arquivo($this->png(64, 64), 'icone.png'), 'uploads/projetos');
    }

    #[Test]
    public function recusa_quando_o_php_reportou_erro(): void
    {
        $this->expectException(HttpException::class);

        $this->storage()->store(
            $this->arquivo($this->png(400, 300), 'print.png', 'image/png', UPLOAD_ERR_INI_SIZE),
            'uploads/projetos'
        );
    }

    /**
     * Caminho do banco com "../" não apaga arquivo fora da raiz pública.
     *
     * Só vale se alguém adulterar a tabela, mas é o tipo de defesa que custa
     * uma função e evita que uma remoção de foto apague o .env.
     */
    #[Test]
    public function delete_nao_escapa_da_raiz_publica(): void
    {
        $vizinho = dirname($this->raiz) . '/alvo-' . bin2hex(random_bytes(4)) . '.txt';
        file_put_contents($vizinho, 'não me apague');

        $this->storage()->delete('../' . basename($vizinho));

        self::assertFileExists($vizinho);

        unlink($vizinho);
    }

    #[Test]
    public function delete_remove_o_arquivo_de_dentro_da_raiz(): void
    {
        $storage = $this->storage();
        $caminho = $storage->store($this->arquivo($this->png(400, 300), 'print.png'), 'uploads/projetos');

        $storage->delete($caminho);

        self::assertFileDoesNotExist($this->raiz . '/' . $caminho);
    }

    /* ------------------------------------------------------------------ */
    /* Apoio                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * ImageStorage com as duas costuras do SAPI trocadas.
     *
     * `veioDeUpload` passa a aceitar arquivo comum e `moverArquivo` usa rename:
     * é o mínimo para o teste alcançar as validações, e nada além disso muda.
     */
    private function storage(): ImageStorage
    {
        return new class ($this->raiz) extends ImageStorage {
            protected function veioDeUpload(string $caminho): bool
            {
                return is_file($caminho);
            }

            protected function moverArquivo(string $origem, string $destino): bool
            {
                return rename($origem, $destino);
            }
        };
    }

    private function arquivo(
        string $conteudo,
        string $nome,
        string $tipo = 'image/png',
        int $erro = UPLOAD_ERR_OK,
    ): UploadedFile {
        $temporario = $this->raiz . '/tmp-' . bin2hex(random_bytes(6));
        file_put_contents($temporario, $conteudo);

        $file = UploadedFile::fromGlobalsEntry([
            'name'     => $nome,
            'type'     => $tipo,
            'tmp_name' => $temporario,
            'size'     => strlen($conteudo),
            'error'    => $erro,
        ]);

        self::assertNotNull($file, 'A entrada de $_FILES do teste está malformada.');

        return $file;
    }

    /**
     * PNG mínimo de verdade, montado byte a byte.
     *
     * Sem GD no container, não há imagecreate() para gerar a imagem — e um
     * arquivo com bytes aleatórios não passaria pelo finfo nem pelo
     * getimagesize, que é justamente o que estes testes precisam exercitar.
     * Então o cabeçalho IHDR é escrito à mão, com o CRC calculado.
     */
    private function png(int $largura, int $altura): string
    {
        $ihdr = pack('NN', $largura, $altura) . pack('C5', 8, 2, 0, 0, 0);

        return "\x89PNG\r\n\x1a\n"
            . $this->pngChunk('IHDR', $ihdr)
            // Um IDAT vazio basta: finfo e getimagesize leem o IHDR.
            . $this->pngChunk('IDAT', '')
            . $this->pngChunk('IEND', '');
    }

    private function pngChunk(string $tipo, string $dados): string
    {
        return pack('N', strlen($dados)) . $tipo . $dados . pack('N', crc32($tipo . $dados));
    }

    private function apagarRecursivo(string $caminho): void
    {
        if (!is_dir($caminho)) {
            return;
        }

        foreach (scandir($caminho) ?: [] as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $completo = $caminho . '/' . $item;
            is_dir($completo) ? $this->apagarRecursivo($completo) : unlink($completo);
        }

        rmdir($caminho);
    }
}
