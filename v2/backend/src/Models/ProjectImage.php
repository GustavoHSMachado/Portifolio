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
            'SELECT id, project_id, path, alt, position, is_cover
               FROM project_images WHERE project_id = ? ORDER BY is_cover DESC, position, id',
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
                'SELECT id, project_id, path, alt, position, is_cover
                   FROM project_images WHERE project_id IN (%s) ORDER BY is_cover DESC, position, id',
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
            'SELECT id, project_id, path, alt, position, is_cover FROM project_images WHERE id = ?',
            [$id]
        );
    }

    /**
     * Quantas fotos da GALERIA o projeto tem.
     *
     * A capa fica de fora: ela não disputa as 8 vagas, porque não é uma tela
     * a mais no carrossel — é a imagem que representa o projeto no cartão.
     */
    public function countForProject(int $projectId): int
    {
        $linha = $this->db->first(
            'SELECT COUNT(*) AS total FROM project_images WHERE project_id = ? AND is_cover = 0',
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
    public function create(int $projectId, string $path, string $alt, bool $capa = false): int
    {
        $linha = $this->db->first(
            'SELECT MAX(position) AS ultima FROM project_images WHERE project_id = ?',
            [$projectId]
        );

        $proxima = $linha === null || $linha['ultima'] === null ? 0 : ((int) $linha['ultima']) + 1;

        $this->db->run(
            'INSERT INTO project_images (project_id, path, alt, position, is_cover) VALUES (?, ?, ?, ?, ?)',
            [$projectId, $path, $alt, $proxima, $capa ? 1 : 0]
        );

        $id = $this->db->lastInsertId();

        if ($capa) {
            $this->desmarcarOutrasCapas($projectId, $id);
        }

        return $id;
    }

    /**
     * A capa atual do projeto, ou null se ele ainda não tem uma.
     *
     * @return array<string, mixed>|null
     */
    public function capaDoProjeto(int $projectId): ?array
    {
        return $this->db->first(
            'SELECT id, project_id, path, alt, position, is_cover
               FROM project_images WHERE project_id = ? AND is_cover = 1 LIMIT 1',
            [$projectId]
        );
    }

    /**
     * Promove uma foto a capa e rebaixa a anterior.
     *
     * Não há índice único garantindo uma capa só por projeto — o MySQL não
     * tem índice parcial, e um UNIQUE sobre (project_id, is_cover) proibiria
     * duas fotos comuns no mesmo projeto. A unicidade é mantida aqui.
     */
    public function marcarComoCapa(int $id, int $projectId): void
    {
        $this->db->run(
            'UPDATE project_images SET is_cover = 1 WHERE id = ? AND project_id = ?',
            [$id, $projectId]
        );

        $this->desmarcarOutrasCapas($projectId, $id);
    }

    private function desmarcarOutrasCapas(int $projectId, int $manter): void
    {
        $this->db->run(
            'UPDATE project_images SET is_cover = 0 WHERE project_id = ? AND id <> ?',
            [$projectId, $manter]
        );
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
