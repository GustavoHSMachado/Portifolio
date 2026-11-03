<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Models\AuditLog;
use App\Models\Content;
use App\Models\ProjectImage;
use App\Services\ImageStorage;
use App\Support\Validator;

/**
 * Fotos dos projetos, enviadas pelo painel.
 *
 * Todas as rotas daqui já passaram por Authenticate e RequireAdmin — e ainda
 * assim cada ação confere que a foto pertence ao projeto da URL. Sem isso,
 * trocar o id na requisição apagaria a foto de outro projeto, o que é
 * autorização correta aplicada ao objeto errado.
 *
 * O controller não abre arquivo nem monta SQL: valida o que chegou, chama o
 * ImageStorage para o disco e o ProjectImage para o banco.
 */
final class ProjectImageController
{
    public function __construct(
        private readonly Content $content,
        private readonly ProjectImage $images,
        private readonly ImageStorage $storage,
        private readonly AuditLog $audit,
    ) {
    }

    /** Pasta de destino, relativa à raiz pública da API. */
    private const PASTA = 'uploads/projetos';

    public function store(Request $request): Response
    {
        $projectId = $this->exigirProjeto($request);

        $data = Validator::make($request->body, [
            'alt' => 'required|max:160',
        ])->validated();

        $file = $request->file('foto');

        if ($file === null) {
            throw HttpException::validation(['foto' => ['Escolha uma imagem para enviar.']]);
        }

        // A capa não ocupa vaga na galeria: é a imagem do cartão, não mais uma
        // tela do carrossel. Por isso ela escapa da contagem logo abaixo.
        $capa = ($request->body['capa'] ?? null) === '1';

        /*
         * O limite é conferido antes de gravar o arquivo.
         *
         * Na ordem inversa, o nono envio deixaria a imagem em disco e recusaria
         * a linha no banco — um arquivo que ninguém exibe e ninguém apaga,
         * porque o painel só conhece o que está no banco.
         */
        if (!$capa && $this->images->countForProject($projectId) >= ProjectImage::MAXIMO_POR_PROJETO) {
            throw HttpException::validation([
                'foto' => [sprintf(
                    'Este projeto já tem %d fotos. Remova uma antes de enviar outra.',
                    ProjectImage::MAXIMO_POR_PROJETO
                )],
            ]);
        }

        $caminho = $this->storage->store($file, self::PASTA);

        /*
         * Se gravar a linha falhar, o arquivo já está em disco: apagá-lo aqui é
         * o que evita o órfão. Não há transação possível entre o banco e o
         * sistema de arquivos — o que existe é limpar o lado que já foi feito.
         */
        // Lida antes do INSERT, porque depois dele a capa antiga já terá sido
        // desmarcada e não haveria como saber qual apagar.
        $anterior = $capa ? $this->images->capaDoProjeto($projectId) : null;

        try {
            $id = $this->images->create($projectId, $caminho, $data['alt'], $capa);
        } catch (\Throwable $erro) {
            $this->storage->delete($caminho);

            throw $erro;
        }

        /*
         * Trocar a capa apaga a anterior, arquivo e linha.
         *
         * Guardar a antiga encheria o disco de imagens que nenhuma tela mostra
         * — ela não está na galeria nem no cartão. Isto roda depois do INSERT
         * da nova: se a gravação falhar, a capa velha continua valendo.
         */
        if ($capa && $anterior !== null) {
            $this->storage->delete((string) $anterior['path']);
            $this->images->delete((int) $anterior['id']);
        }

        $this->audit->record(
            AuditLog::CONTEUDO_SALVO,
            $request->userId(),
            $request->ip,
            $request->header('user-agent'),
            ['colecao' => 'project_images', 'id' => $id, 'projeto' => $projectId, 'capa' => $capa],
        );

        return Response::created($this->present([
            'id'         => $id,
            'project_id' => $projectId,
            'path'       => $caminho,
            'alt'        => $data['alt'],
            'position'   => $this->images->countForProject($projectId) - 1,
            'is_cover'   => $capa ? 1 : 0,
        ]), $capa ? 'Capa definida.' : 'Foto adicionada.');
    }

    /** Altera a descrição e a ordem. O arquivo em disco não muda. */
    public function update(Request $request): Response
    {
        $projectId = $this->exigirProjeto($request);
        $imagem = $this->exigirImagemDoProjeto($request, $projectId);

        $data = Validator::make($request->body, [
            'alt' => 'required|max:160',
        ])->validated();

        $position = (int) ($request->input('position') ?? $imagem['position']);

        $this->images->updateMeta((int) $imagem['id'], $data['alt'], max(0, $position));

        return Response::ok($this->present([
            ...$imagem,
            'alt'      => $data['alt'],
            'position' => max(0, $position),
        ]), 'Foto atualizada.');
    }

    public function destroy(Request $request): Response
    {
        $projectId = $this->exigirProjeto($request);
        $imagem = $this->exigirImagemDoProjeto($request, $projectId);

        /*
         * O arquivo sai antes da linha.
         *
         * Na ordem inversa, uma falha ao apagar o arquivo deixaria em disco algo
         * que o painel não lista mais — invisível e permanente. Deste lado, uma
         * falha depois do unlink deixa uma linha apontando para arquivo que não
         * existe, que o painel mostra e permite remover de novo.
         */
        $this->storage->delete((string) $imagem['path']);
        $this->images->delete((int) $imagem['id']);

        $this->audit->record(
            AuditLog::CONTEUDO_EXCLUIDO,
            $request->userId(),
            $request->ip,
            $request->header('user-agent'),
            ['colecao' => 'project_images', 'id' => (int) $imagem['id'], 'projeto' => $projectId],
        );

        return Response::noContent();
    }

    /* ------------------------------------------------------------------ */
    /* Apoio                                                               */
    /* ------------------------------------------------------------------ */

    private function exigirProjeto(Request $request): int
    {
        $projectId = (int) $request->attribute('id');

        $existe = array_filter(
            $this->content->allProjects(),
            static fn (array $projeto): bool => (int) $projeto['id'] === $projectId
        );

        if ($existe === []) {
            throw HttpException::notFound('Projeto não encontrado.');
        }

        return $projectId;
    }

    /**
     * @return array<string, mixed>
     */
    private function exigirImagemDoProjeto(Request $request, int $projectId): array
    {
        $imagem = $this->images->find((int) $request->attribute('imageId'));

        if ($imagem === null || (int) $imagem['project_id'] !== $projectId) {
            throw HttpException::notFound('Foto não encontrada.');
        }

        return $imagem;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function present(array $row): array
    {
        return [
            'id'       => (int) $row['id'],
            'path'     => (string) $row['path'],
            'url'      => $this->storage->publicUrl((string) $row['path']),
            'alt'      => (string) $row['alt'],
            'position' => (int) $row['position'],
            'isCover'  => (int) ($row['is_cover'] ?? 0) === 1,
        ];
    }
}
