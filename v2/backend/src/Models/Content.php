<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Conteúdo do portfólio: perfil, formação, experiência, habilidades e projetos.
 *
 * Um model para as cinco tabelas de propósito. São dados de leitura pública que
 * aparecem sempre juntos, na mesma página — separar em cinco classes criaria
 * cerimônia sem ganho, e a home faria cinco consultas para montar uma tela.
 *
 * Escrita e leitura administrativa ficam nos métodos de mutação, usados apenas
 * pelo painel autenticado.
 */
final class Content
{
    public function __construct(private readonly Connection $db)
    {
    }

    /* ------------------------------------------------------------------ */
    /* Leitura pública                                                     */
    /* ------------------------------------------------------------------ */

    /** @return array<string, mixed>|null */
    public function profile(): ?array
    {
        return $this->db->first(
            'SELECT full_name, short_name, role, headline, objective, summary,
                    city, state, website_url, github_url, linkedin_url, whatsapp_url,
                    resume_path
               FROM profile WHERE id = 1'
        );
    }

    /** @return list<array<string, mixed>> */
    public function education(): array
    {
        return $this->db->all(
            'SELECT id, course, institution, level, status, completed_at
               FROM education ORDER BY position, completed_at DESC'
        );
    }

    /** @return list<array<string, mixed>> */
    public function experiences(): array
    {
        return $this->db->all(
            'SELECT id, company, role, description, started_at, ended_at
               FROM experiences ORDER BY position, started_at DESC'
        );
    }

    /** @return list<array<string, mixed>> */
    public function skills(): array
    {
        return $this->db->all(
            'SELECT id, name, category, evidence
               FROM skills ORDER BY position, name'
        );
    }

    /**
     * Projetos publicados, para o site.
     *
     * @return list<array<string, mixed>>
     */
    public function publishedProjects(): array
    {
        return $this->db->all(
            'SELECT id, slug, title, summary, problem, decisions, result,
                    stack, repository_url, demo_url
               FROM projects WHERE published = 1 ORDER BY position, id'
        );
    }

    /**
     * Todos os projetos, inclusive rascunhos. Só para o painel.
     *
     * @return list<array<string, mixed>>
     */
    public function allProjects(): array
    {
        return $this->db->all(
            'SELECT id, slug, title, summary, problem, decisions, result,
                    stack, repository_url, demo_url, published, position
               FROM projects ORDER BY position, id'
        );
    }

    /** @return array<string, mixed>|null */
    public function projectBySlug(string $slug): ?array
    {
        return $this->db->first(
            'SELECT id, slug, title, summary, problem, decisions, result,
                    stack, repository_url, demo_url, published
               FROM projects WHERE slug = ?',
            [$slug]
        );
    }

    /* ------------------------------------------------------------------ */
    /* Escrita — apenas pelo painel                                        */
    /* ------------------------------------------------------------------ */

    /** @param array<string, mixed> $data */
    public function updateProfile(array $data): void
    {
        $this->db->run(
            'UPDATE profile
                SET full_name = ?, short_name = ?, role = ?, headline = ?,
                    objective = ?, summary = ?, city = ?, state = ?,
                    website_url = ?, github_url = ?, linkedin_url = ?, whatsapp_url = ?,
                    updated_at = NOW()
              WHERE id = 1',
            [
                $data['fullName'], $data['shortName'], $data['role'], $data['headline'],
                $data['objective'] ?? null, $data['summary'],
                $data['city'] ?? null, $data['state'] ?? null,
                $data['websiteUrl'] ?? null, $data['githubUrl'] ?? null,
                $data['linkedinUrl'] ?? null, $data['whatsappUrl'] ?? null,
            ]
        );
    }

    /**
     * Cria ou atualiza um registro de uma das coleções.
     *
     * @param array<string, mixed> $data colunas já validadas pelo controller
     * @return int id do registro
     */
    public function save(string $table, array $data, ?int $id = null): int
    {
        $columns = array_keys($data);

        if ($id === null) {
            $this->db->run(
                sprintf(
                    'INSERT INTO %s (%s) VALUES (%s)',
                    $this->table($table),
                    implode(', ', $columns),
                    implode(', ', array_fill(0, count($columns), '?'))
                ),
                array_values($data)
            );

            return $this->db->lastInsertId();
        }

        $this->db->run(
            sprintf(
                'UPDATE %s SET %s WHERE id = ?',
                $this->table($table),
                implode(', ', array_map(static fn (string $c): string => "{$c} = ?", $columns))
            ),
            [...array_values($data), $id]
        );

        return $id;
    }

    public function delete(string $table, int $id): bool
    {
        return $this->db
            ->run(sprintf('DELETE FROM %s WHERE id = ?', $this->table($table)), [$id])
            ->rowCount() > 0;
    }

    /**
     * Valida o nome da tabela contra uma allowlist.
     *
     * save() e delete() montam SQL com o nome da tabela, que nao pode ser
     * parametrizado por prepared statement. Sem esta allowlist, qualquer valor
     * que chegasse aqui viraria injecao — e foi exatamente esse tipo de
     * concatenacao que abriu a falha de SQL Injection na v1.
     */
    private function table(string $table): string
    {
        return match ($table) {
            'education'   => 'education',
            'experiences' => 'experiences',
            'skills'      => 'skills',
            'projects'    => 'projects',
            // Sem este default o match lançaria UnhandledMatchError, que vira
            // 500 sem explicacao. Falhar aqui e erro de programacao, nao de
            // entrada — e precisa dizer isso em voz alta.
            default => throw new \InvalidArgumentException(
                sprintf('Tabela "%s" não faz parte do conteúdo editável.', $table)
            ),
        };
    }
}
