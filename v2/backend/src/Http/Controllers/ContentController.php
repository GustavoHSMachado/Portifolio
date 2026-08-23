<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Models\AuditLog;
use App\Models\Content;
use App\Models\SiteSettings;
use App\Support\Validator;

/**
 * Conteúdo do portfólio: leitura pública e edição pelo painel.
 *
 * A leitura devolve tudo numa resposta só. A home mostra perfil, formação,
 * experiência, habilidades e projetos na mesma tela — cinco requisições para
 * montar uma página seria desperdício de rede sem ganho nenhum.
 */
final class ContentController
{
    public function __construct(
        private readonly Content $content,
        private readonly SiteSettings $settings,
        private readonly AuditLog $audit,
    ) {
    }

    /* ------------------------------------------------------------------ */
    /* Público                                                             */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): Response
    {
        $profile = $this->content->profile();

        if ($profile === null) {
            throw HttpException::notFound('Conteúdo do portfólio ainda não foi cadastrado.');
        }

        /*
         * Os projetos saíram daqui em 23/08/2026.
         *
         * Eles passaram a exigir sessão, e esconder a seção só na tela não
         * protegeria nada: este endpoint é público e devolvia tudo — título,
         * estudo de caso e links — para quem abrisse a URL. Quem quer o
         * conteúdo pede ao servidor, não ao HTML.
         *
         * O que fica público é a contagem, que a home usa para dizer quantos
         * projetos existem lá dentro. Um número não conta nada sobre o trabalho
         * e é o que dá a quem chega uma razão para criar a conta.
         */
        return Response::ok([
            'profile'      => $this->presentProfile($profile),
            'education'    => array_map($this->presentEducation(...), $this->content->education()),
            'experiences'  => array_map($this->presentExperience(...), $this->content->experiences()),
            'skills'       => array_map($this->presentSkill(...), $this->content->skills()),
            'projectCount' => count($this->content->publishedProjects()),
            // A home renderiza no servidor e precisa dos ajustes junto do resto:
            // buscá-los depois faria a cor e os títulos chegarem em um segundo
            // render, com a página trocando de aparência na frente de quem lê.
            'settings'     => $this->settings->all(),
        ]);
    }

    /** Projetos completos, só para quem tem sessão. */
    public function projects(Request $request): Response
    {
        return Response::ok([
            'projects' => array_map($this->presentProject(...), $this->content->publishedProjects()),
        ]);
    }

    public function project(Request $request): Response
    {
        $slug = (string) $request->attribute('slug');
        $project = $this->content->projectBySlug($slug);

        if ($project === null || (int) ($project['published'] ?? 0) !== 1) {
            throw HttpException::notFound('Projeto não encontrado.');
        }

        return Response::ok($this->presentProject($project));
    }

    /* ------------------------------------------------------------------ */
    /* Painel — exige autenticação e papel de admin                        */
    /* ------------------------------------------------------------------ */

    public function adminIndex(Request $request): Response
    {
        $profile = $this->content->profile();

        return Response::ok([
            'profile'     => $profile === null ? null : $this->presentProfile($profile),
            'education'   => array_map($this->presentEducation(...), $this->content->education()),
            'experiences' => array_map($this->presentExperience(...), $this->content->experiences()),
            'skills'      => array_map($this->presentSkill(...), $this->content->skills()),
            // Inclui rascunhos: o painel precisa enxergar o que ainda não foi publicado.
            'projects' => array_map($this->presentProject(...), $this->content->allProjects()),
        ]);
    }

    public function updateProfile(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'fullName'          => 'required|max:120',
            'shortName'         => 'required|max:60',
            'role'              => 'required|max:120',
            'headline'          => 'required|max:160',
            'objective'         => 'max:255',
            'summary'           => 'required',
            'city'              => 'max:80',
            'state'             => 'max:2',
            'websiteUrl'        => 'url|max:255',
            'githubUrl'         => 'url|max:255',
            'linkedinUrl'       => 'url|max:255',
            'whatsappUrl'       => 'url|max:255',

        ])->validated();

        $this->content->updateProfile($data);

        $this->audit->record(
            AuditLog::CONTEUDO_SALVO,
            $request->userId(),
            $request->ip,
            $request->header('user-agent'),
            ['colecao' => 'profile'],
        );

        $profile = $this->content->profile();

        return Response::ok($profile === null ? null : $this->presentProfile($profile));
    }

    public function saveEducation(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'course'      => 'required|max:160',
            'institution' => 'required|max:160',
            'level'       => 'required|max:20',
            'status'      => 'required|max:20',
        ])->validated();

        $colecaoAuditada = 'education';
        $id = $this->content->save('education', [
            'course'       => $data['course'],
            'institution'  => $data['institution'],
            'level'        => $this->oneOf($data['level'], ['tecnico', 'graduacao', 'pos_graduacao', 'mestrado', 'doutorado', 'curso'], 'level'),
            'status'       => $this->oneOf($data['status'], ['concluido', 'em_andamento'], 'status'),
            'completed_at' => $this->monthOrNull($request->body['completedAt'] ?? null),
            'position'     => (int) ($request->body['position'] ?? 0),
        ], $this->idFrom($request));

        $this->audit->record(
            AuditLog::CONTEUDO_SALVO,
            $request->userId(),
            $request->ip,
            $request->header("user-agent"),
            ["colecao" => $colecaoAuditada, "id" => $id],
        );

        return Response::ok(["id" => $id]);
    }

    public function saveExperience(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'company'     => 'required|max:160',
            'role'        => 'required|max:160',
            'description' => 'required',
            'startedAt'   => 'required',
        ])->validated();

        $started = $this->monthOrNull($data['startedAt']);

        if ($started === null) {
            throw HttpException::validation(['startedAt' => ['Informe o mês de início no formato AAAA-MM.']]);
        }

        $ended = $this->monthOrNull($request->body['endedAt'] ?? null);

        // Um fim anterior ao início produz período negativo na tela, e o erro
        // só apareceria para quem lesse o currículo com atenção.
        if ($ended !== null && $ended < $started) {
            throw HttpException::validation(['endedAt' => ['A saída não pode ser anterior à entrada.']]);
        }

        $colecaoAuditada = 'experiences';
        $id = $this->content->save('experiences', [
            'company'     => $data['company'],
            'role'        => $data['role'],
            'description' => $data['description'],
            'started_at'  => $started,
            'ended_at'    => $ended,
            'position'    => (int) ($request->body['position'] ?? 0),
        ], $this->idFrom($request));

        $this->audit->record(
            AuditLog::CONTEUDO_SALVO,
            $request->userId(),
            $request->ip,
            $request->header("user-agent"),
            ["colecao" => $colecaoAuditada, "id" => $id],
        );

        return Response::ok(["id" => $id]);
    }

    public function saveSkill(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'name'     => 'required|max:80',
            'category' => 'required|max:60',
            'evidence' => 'max:400',
        ])->validated();

        $colecaoAuditada = 'skills';
        $id = $this->content->save('skills', [
            'name'     => $data['name'],
            'category' => $data['category'],
            'evidence' => $data['evidence'] ?? null,
            'position' => (int) ($request->body['position'] ?? 0),
        ], $this->idFrom($request));

        $this->audit->record(
            AuditLog::CONTEUDO_SALVO,
            $request->userId(),
            $request->ip,
            $request->header("user-agent"),
            ["colecao" => $colecaoAuditada, "id" => $id],
        );

        return Response::ok(["id" => $id]);
    }

    public function saveProject(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'slug'          => 'required|alpha_dash|max:120',
            'title'         => 'required|max:160',
            'summary'       => 'required|max:255',
            'repositoryUrl' => 'url|max:255',
            'demoUrl'       => 'url|max:255',
        ])->validated();

        $stack = $request->body['stack'] ?? [];

        $colecaoAuditada = 'projects';
        $id = $this->content->save('projects', [
            'slug'      => $data['slug'],
            'title'     => $data['title'],
            'summary'   => $data['summary'],
            'problem'   => $request->body['problem'] ?? null,
            'decisions' => $request->body['decisions'] ?? null,
            'result'    => $request->body['result'] ?? null,
            'stack'     => is_array($stack) && $stack !== []
                ? json_encode(array_values($stack), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
                : null,
            'repository_url' => $data['repositoryUrl'] ?? null,
            'demo_url'       => $data['demoUrl'] ?? null,
            'published'      => empty($request->body['published']) ? 0 : 1,
            'position'       => (int) ($request->body['position'] ?? 0),
        ], $this->idFrom($request));

        $this->audit->record(
            AuditLog::CONTEUDO_SALVO,
            $request->userId(),
            $request->ip,
            $request->header("user-agent"),
            ["colecao" => $colecaoAuditada, "id" => $id],
        );

        return Response::ok(["id" => $id]);
    }

    public function destroy(Request $request): Response
    {
        $collection = (string) $request->attribute('collection');
        $id = (int) $request->attribute('id');

        if (!in_array($collection, ['education', 'experiences', 'skills', 'projects'], true)) {
            throw HttpException::notFound('Coleção desconhecida.');
        }

        if (!$this->content->delete($collection, $id)) {
            throw HttpException::notFound('Registro não encontrado.');
        }

        $this->audit->record(
            AuditLog::CONTEUDO_EXCLUIDO,
            $request->userId(),
            $request->ip,
            $request->header('user-agent'),
            ['colecao' => $collection, 'id' => $id],
        );

        return Response::noContent();
    }

    /* ------------------------------------------------------------------ */
    /* Apresentação                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function presentProfile(array $row): array
    {
        return [
            'fullName'          => $row['full_name'],
            'shortName'         => $row['short_name'],
            'role'              => $row['role'],
            'headline'          => $row['headline'],
            'objective'         => $row['objective'],
            'summary'           => $row['summary'],
            'city'              => $row['city'],
            'state'             => $row['state'],
            'websiteUrl'        => $row['website_url'],
            'githubUrl'         => $row['github_url'],
            'linkedinUrl'       => $row['linkedin_url'],
            'whatsappUrl'       => $row['whatsapp_url'],
            'resumePath'        => $row['resume_path'],

        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function presentEducation(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'course'      => $row['course'],
            'institution' => $row['institution'],
            'level'       => $row['level'],
            'status'      => $row['status'],
            'completedAt' => $this->asMonth($row['completed_at'] ?? null),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function presentExperience(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'company'     => $row['company'],
            'role'        => $row['role'],
            'description' => $row['description'],
            'startedAt'   => $this->asMonth($row['started_at'] ?? null),
            'endedAt'     => $this->asMonth($row['ended_at'] ?? null),
            'current'     => ($row['ended_at'] ?? null) === null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function presentSkill(array $row): array
    {
        return [
            'id'       => (int) $row['id'],
            'name'     => $row['name'],
            'category' => $row['category'],
            'evidence' => $row['evidence'],
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function presentProject(array $row): array
    {
        $stack = $row['stack'] ?? null;

        return [
            'id'            => (int) $row['id'],
            'slug'          => $row['slug'],
            'title'         => $row['title'],
            'summary'       => $row['summary'],
            'problem'       => $row['problem'],
            'decisions'     => $row['decisions'],
            'result'        => $row['result'],
            'stack'         => is_string($stack) ? json_decode($stack, true) : [],
            'repositoryUrl' => $row['repository_url'],
            'demoUrl'       => $row['demo_url'],
            'published'     => isset($row['published']) ? (int) $row['published'] === 1 : true,
            'position'      => isset($row['position']) ? (int) $row['position'] : 0,
        ];
    }

    /* ------------------------------------------------------------------ */
    /* Apoio                                                               */
    /* ------------------------------------------------------------------ */

    private function idFrom(Request $request): ?int
    {
        $id = $request->attribute('id');

        return $id === null ? null : (int) $id;
    }

    /** Aceita AAAA-MM e grava o dia 1: o currículo tem precisão de mês. */
    private function monthOrNull(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        return preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value) === 1 ? "{$value}-01" : null;
    }

    private function asMonth(mixed $date): ?string
    {
        return is_string($date) && $date !== '' ? substr($date, 0, 7) : null;
    }

    /**
     * @param list<string> $allowed
     * @throws HttpException
     */
    private function oneOf(mixed $value, array $allowed, string $field): string
    {
        if (!is_string($value) || !in_array($value, $allowed, true)) {
            throw HttpException::validation([
                $field => ['Valor inválido. Use um entre: ' . implode(', ', $allowed) . '.'],
            ]);
        }

        return $value;
    }
}
