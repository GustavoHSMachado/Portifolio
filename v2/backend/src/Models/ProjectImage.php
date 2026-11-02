<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Fotos de um projeto. Guarda caminho, nunca o binário.
 *
 * Sem regra de negócio aqui: quem decide se o arquivo é uma imagem aceitável é
 * o ImageStorage, e quem autoriza é o middleware. Este model só lê e escreve.
 */
final class ProjectImage
{
    /** Quantas fotos um projeto pode ter. Vitrine, não álbum. */
    public const MAXIMO_POR_PROJETO = 8;

    public function __construct(private readonly Connection $db)
    {
    }

    /**
     * Fotos de um projeto, na ordem de exibição.
     *
     * @return list<array<string, mixed>>
     */
    public function forProject(int $projectId): array
    {
        return $this->db->all(
            'SELECT id, project_id, path, alt, position
               FROM project_images WHERE project_id = ? ORDER BY position, id',
            [$projectId]
        );
    }

    /**
     * Fotos de vários projetos numa consulta só.
     *
     * A vitrine lista todos os projetos de uma vez; buscar as fotos projeto por
     * projeto seria uma consulta por cartão — o N+1 clássico, que só aparece
     * quando o portfólio cresce.
     *
     * @param list<int> $projectIds
     *
     * @return array<int, list<array<string, mixed>>> indexado por project_id
     */
    public function groupedByProject(array $projectIds): array
    {
        if ($projectIds === []) {
            return [];
        }

        // Os ids vêm de linhas já lidas do banco, mas o placeholder é montado
        // pela contagem e os valores seguem vinculados: nenhum id entra no SQL
        // por concatenação.
        $marcadores = implode(', ', array_fill(0, count($projectIds), '?'));

        $linhas = $this->db->all(
            sprintf(
                'SELECT id, project_id, path, alt, position
                   FROM project_images WHERE project_id IN (%s) ORDER BY position, id',
                $marcadores
            ),
            array_map(static fn (int $id): int => $id, $projectIds)
        );

        $agrupado = [];
        foreach ($linhas as $linha) {
            $agrupado[(int) $linha['project_id']][] = $linha;
        }

        return $agrupado;
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        return $this->db->first(
            'SELECT id, project_id, path, alt, position FROM project_images WHERE id = ?',
            [$id]
        );
    }

    public function countForProject(int $projectId): int
    {
        $linha = $this->db->first(
            'SELECT COUNT(*) AS total FROM project_images WHERE project_id = ?',
            [$projectId]
        );

        return (int) ($linha['total'] ?? 0);
    }

    /**
     * Grava a foto no fim da fila do projeto.
     *
     * A posição é calculada em duas consultas, e não numa subconsulta sobre a
     * própria project_images: o MySQL recusa ler a tabela que o INSERT está
     * escrevendo. Duas fotos enviadas no mesmo instante podem receber a mesma
     * posição — e isso é inofensivo, porque o desempate do ORDER BY é o id.
     */
    public function create(int $projectId, string $path, string $alt): int
    {
        $linha = $this->db->first(
            'SELECT MAX(position) AS ultima FROM project_images WHERE project_id = ?',
            [$projectId]
        );

        $proxima = $linha === null || $linha['ultima'] === null ? 0 : ((int) $linha['ultima']) + 1;

        $this->db->run(
            'INSERT INTO project_images (project_id, path, alt, position) VALUES (?, ?, ?, ?)',
            [$projectId, $path, $alt, $proxima]
        );

        return $this->db->lastInsertId();
    }

    public function updateMeta(int $id, string $alt, int $position): void
    {
        $this->db->run(
            'UPDATE project_images SET alt = ?, position = ? WHERE id = ?',
            [$alt, $position, $id]
        );
    }

    public function delete(int $id): bool
    {
        return $this->db
            ->run('DELETE FROM project_images WHERE id = ?', [$id])
            ->rowCount() > 0;
    }
}
