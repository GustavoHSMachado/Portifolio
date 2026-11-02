<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Core\HttpException;
use App\Core\UploadedFile;
use RuntimeException;

/**
 * Grava imagem enviada pelo painel em disco e devolve o caminho relativo.
 *
 * Upload é a entrada mais explorada que uma aplicação oferece: o cliente
 * escolhe o nome, a extensão, o Content-Type e o conteúdo. Por isso aqui nada
 * do que ele manda é aproveitado para decidir onde o arquivo vai parar.
 *
 * As camadas, em ordem:
 *
 *   1. o erro que o próprio PHP reportou (arquivo maior que o limite, envio
 *      interrompido) sai antes de qualquer leitura;
 *   2. is_uploaded_file() garante que o caminho temporário veio de um upload
 *      desta requisição, e não de um valor forjado apontando para /etc/passwd;
 *   3. o tipo é lido dos bytes com finfo, nunca do Content-Type nem da extensão
 *      do nome enviado;
 *   4. getimagesize() confirma que o arquivo decodifica como imagem e dá as
 *      dimensões — um .php renomeado para .jpg passa pelos dois primeiros
 *      filtros e morre aqui;
 *   5. a extensão de destino vem do tipo detectado, e o nome é sorteado. Nome
 *      do cliente nunca toca o disco: é assim que "../../index.php" deixa de
 *      ser um problema, em vez de ser tratado com sanitização.
 *
 * O que NÃO é feito: reconstruir a imagem pixel a pixel para descartar
 * metadados. Isso exigiria a extensão GD, que não está instalada nem é
 * verificável no servidor de produção. O risco que sobra é um payload dentro do
 * EXIF, e ele é contido do outro lado: a pasta nega execução de PHP por
 * .htaccess e as respostas da API já saem com X-Content-Type-Options: nosniff,
 * então o navegador trata o arquivo como imagem e nada mais.
 */
class ImageStorage
{
    /**
     * Tipos aceitos e a extensão que cada um recebe em disco.
     *
     * Allowlist, e não bloqueio por lista negra: formato novo entra aqui de
     * propósito, depois de alguém decidir que entra. SVG fica fora por ser XML
     * com script dentro — servir SVG de terceiro é servir JavaScript.
     */
    private const TIPOS = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    /**
     * 2 MB, alinhado ao upload_max_filesize do PHP.
     *
     * Elevar aqui sem elevar o php.ini não serve de nada: o PHP descarta o
     * arquivo antes de o código rodar, e a requisição chega com
     * UPLOAD_ERR_INI_SIZE.
     */
    private const TAMANHO_MAXIMO = 2 * 1024 * 1024;

    /** Abaixo disso não é captura de tela, é ícone ou pixel de rastreio. */
    private const LARGURA_MINIMA = 320;

    /** Acima disso é foto de câmera sem tratamento; o site nunca exibe tão grande. */
    private const LARGURA_MAXIMA = 6000;

    /**
     * @param string $publicPath raiz pública da API, onde o servidor web serve estático
     */
    public function __construct(private readonly string $publicPath)
    {
    }

    /**
     * Valida, grava e devolve o caminho relativo à raiz pública.
     *
     * @param string $pasta subpasta dentro da raiz pública (ex.: uploads/projetos)
     *
     * @return string ex.: uploads/projetos/9f8e7d....webp
     */
    public function store(UploadedFile $file, string $pasta): string
    {
        if ($file->hasError()) {
            throw HttpException::validation(['foto' => [$file->errorMessage()]]);
        }

        if (!$this->veioDeUpload($file->temporaryPath)) {
            throw HttpException::validation(['foto' => ['O arquivo não chegou por um envio válido.']]);
        }

        if ($file->size > self::TAMANHO_MAXIMO) {
            throw HttpException::validation([
                'foto' => [sprintf('A imagem passa de %d MB.', intdiv(self::TAMANHO_MAXIMO, 1024 * 1024))],
            ]);
        }

        $extensao = self::TIPOS[$this->detectarTipo($file->temporaryPath)] ?? null;

        if ($extensao === null) {
            throw HttpException::validation([
                'foto' => ['Formato não aceito. Envie JPEG, PNG ou WebP.'],
            ]);
        }

        $this->exigirImagemLegivel($file->temporaryPath);

        $destino = $this->prepararPasta($pasta);
        $nome = bin2hex(random_bytes(16)) . '.' . $extensao;

        if (!$this->moverArquivo($file->temporaryPath, $destino . '/' . $nome)) {
            throw new RuntimeException('Não foi possível gravar a imagem.');
        }

        // 0644: o servidor web lê, mais ninguém escreve. move_uploaded_file usa
        // a máscara do processo, que no container é permissiva demais.
        chmod($destino . '/' . $nome, 0o644);

        return trim($pasta, '/') . '/' . $nome;
    }

    /**
     * URL pública do arquivo, montada a partir de APP_URL.
     *
     * Mora aqui, e não no controller, porque é a outra metade da mesma decisão:
     * o banco guarda caminho relativo para sobreviver a troca de domínio, então
     * alguém precisa saber qual é o domínio de agora. Dois controllers
     * apresentam imagem — o painel e a vitrine — e nenhum dos dois deve ter a
     * sua própria ideia de como a URL se forma.
     */
    public function publicUrl(string $caminhoRelativo): string
    {
        $base = rtrim((string) Config::get('APP_URL', ''), '/');

        return $base . '/' . ltrim($caminhoRelativo, '/');
    }

    /**
     * Apaga o arquivo de um caminho relativo guardado no banco.
     *
     * Tolera arquivo ausente: o registro do banco é a verdade sobre o que a
     * vitrine exibe, e travar a remoção porque o arquivo já sumiu deixaria uma
     * linha órfã impossível de apagar pelo painel.
     */
    public function delete(string $caminhoRelativo): void
    {
        $absoluto = $this->resolverDentroDaRaiz($caminhoRelativo);

        if ($absoluto !== null && is_file($absoluto)) {
            unlink($absoluto);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Costuras com o SAPI                                                 */
    /* ------------------------------------------------------------------ */

    /*
     * is_uploaded_file() e move_uploaded_file() só reconhecem arquivo que o
     * próprio PHP recebeu nesta requisição — é exatamente isso que as torna
     * úteis em produção e intestáveis fora de um servidor web. Isoladas em
     * métodos protegidos, o teste pode substituí-las e exercitar as validações
     * que vêm depois: o PHP renomeado para .jpg, o nome de cliente com "../",
     * o arquivo acima do limite. Sem esta costura, nenhuma delas teria teste —
     * e são elas que seguram o upload.
     *
     * A classe deixou de ser final por este motivo, e só por ele: nada em
     * produção a estende.
     */

    protected function veioDeUpload(string $caminho): bool
    {
        return is_uploaded_file($caminho);
    }

    protected function moverArquivo(string $origem, string $destino): bool
    {
        return move_uploaded_file($origem, $destino);
    }

    private function detectarTipo(string $caminho): string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);

        if ($finfo === false) {
            throw new RuntimeException('Não foi possível inspecionar o arquivo.');
        }

        $tipo = finfo_file($finfo, $caminho);
        finfo_close($finfo);

        return is_string($tipo) ? $tipo : '';
    }

    private function exigirImagemLegivel(string $caminho): void
    {
        $dimensoes = @getimagesize($caminho);

        if ($dimensoes === false) {
            throw HttpException::validation(['foto' => ['O arquivo não é uma imagem válida.']]);
        }

        [$largura] = $dimensoes;

        if ($largura < self::LARGURA_MINIMA || $largura > self::LARGURA_MAXIMA) {
            throw HttpException::validation([
                'foto' => [sprintf(
                    'A largura precisa ficar entre %d e %d pixels.',
                    self::LARGURA_MINIMA,
                    self::LARGURA_MAXIMA
                )],
            ]);
        }
    }

    /**
     * Garante a pasta de destino, recusando qualquer coisa fora da raiz pública.
     *
     * A subpasta vem do código, não da requisição, mas a checagem fica aqui
     * para que isso continue verdade no dia em que alguém a tornar configurável.
     */
    private function prepararPasta(string $pasta): string
    {
        if (preg_match('#^[a-z0-9]+(/[a-z0-9-]+)*$#', trim($pasta, '/')) !== 1) {
            throw new RuntimeException('Pasta de upload inválida.');
        }

        $destino = rtrim($this->publicPath, '/\\') . '/' . trim($pasta, '/');

        if (!is_dir($destino) && !mkdir($destino, 0o755, true) && !is_dir($destino)) {
            throw new RuntimeException('Não foi possível criar a pasta das imagens.');
        }

        return $destino;
    }

    /**
     * Converte caminho do banco em caminho absoluto, ou null se escapar da raiz.
     *
     * O valor vem do nosso próprio banco, mas quem apaga arquivo confere o
     * caminho duas vezes: basta um registro adulterado com "../../.env" para
     * que uma remoção de foto apague o segredo da aplicação.
     */
    private function resolverDentroDaRaiz(string $caminhoRelativo): ?string
    {
        $raiz = realpath($this->publicPath);

        if ($raiz === false) {
            return null;
        }

        $absoluto = realpath($raiz . '/' . ltrim($caminhoRelativo, '/\\'));

        if ($absoluto === false) {
            return null;
        }

        return str_starts_with($absoluto, $raiz . DIRECTORY_SEPARATOR) ? $absoluto : null;
    }
}
