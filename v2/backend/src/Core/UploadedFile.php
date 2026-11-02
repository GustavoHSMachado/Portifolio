<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Um arquivo recebido por multipart/form-data.
 *
 * Existe para que o resto da aplicação não precise conhecer o formato de
 * $_FILES, que é o único lugar do PHP onde o nome, o tipo e o erro de um
 * arquivo chegam em arrays paralelos. Nada aqui valida o conteúdo: o que vem
 * no `clientName` e no `clientType` foi escolhido por quem enviou e serve
 * apenas para mensagem de erro. Quem decide se o arquivo é uma imagem é o
 * ImageStorage, lendo os bytes.
 */
final class UploadedFile
{
    private function __construct(
        /** Nome informado pelo cliente. Nunca use para gravar em disco. */
        public readonly string $clientName,
        /** Tipo informado pelo cliente. Nunca use para decidir a extensão. */
        public readonly string $clientType,
        public readonly string $temporaryPath,
        public readonly int $size,
        /** Uma das constantes UPLOAD_ERR_*. */
        public readonly int $error,
    ) {
    }

    /**
     * Monta a partir de uma entrada de $_FILES.
     *
     * Devolve null quando a entrada não tem a forma esperada — um cliente pode
     * mandar `foto[]` onde se espera `foto`, e aí os campos chegam como array.
     * Esse caso é entrada inválida, não erro de programação.
     *
     * @param array<string, mixed> $entry
     */
    public static function fromGlobalsEntry(array $entry): ?self
    {
        foreach (['name', 'type', 'tmp_name', 'size', 'error'] as $key) {
            if (!isset($entry[$key]) || is_array($entry[$key])) {
                return null;
            }
        }

        return new self(
            clientName:    (string) $entry['name'],
            clientType:    (string) $entry['type'],
            temporaryPath: (string) $entry['tmp_name'],
            size:          (int) $entry['size'],
            error:         (int) $entry['error'],
        );
    }

    public function hasError(): bool
    {
        return $this->error !== UPLOAD_ERR_OK;
    }

    /**
     * Mensagem para o erro que o próprio PHP reportou.
     *
     * UPLOAD_ERR_INI_SIZE e UPLOAD_ERR_FORM_SIZE merecem texto próprio porque
     * são os únicos que o visitante consegue resolver sozinho, reduzindo o
     * arquivo. Os demais são defeito de configuração ou de ambiente e não têm
     * o que explicar a quem está enviando.
     */
    public function errorMessage(): string
    {
        return match ($this->error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'O arquivo é maior do que o servidor aceita.',
            UPLOAD_ERR_PARTIAL                        => 'O envio foi interrompido antes de terminar.',
            UPLOAD_ERR_NO_FILE                        => 'Nenhum arquivo foi enviado.',
            default                                   => 'Não foi possível receber o arquivo.',
        };
    }
}
