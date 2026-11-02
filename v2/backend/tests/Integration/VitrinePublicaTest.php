<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Core\App;
use App\Core\Request;
use PHPUnit\Framework\Attributes\Test;
use Tests\DatabaseTestCase;

/**
 * A vitrine de projetos, vista por quem não tem conta.
 *
 * A listagem exigiu sessão de 23/08/2026 a 01/11/2026. Ao abri-la, a pergunta
 * deixou de ser "quem está autenticado" e passou a ser "o que está publicado":
 * é published = 1 que segura rascunho, e é isso que estes testes travam. Sem
 * eles, devolver allProjects() em vez de publishedProjects() passaria no
 * PHPStan, no lint e no olho de quem revisa.
 */
final class VitrinePublicaTest extends DatabaseTestCase
{
    private function request(string $path): Request
    {
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = $path;
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        $_POST = [];
        $_GET = [];

        // Sem Authorization: é exatamente o visitante anônimo que importa aqui.
        unset($_SERVER['HTTP_AUTHORIZATION']);

        return Request::fromGlobals();
    }

    private function seedProject(string $slug, string $title, int $published): void
    {
        $this->db->run(
            'INSERT INTO projects (slug, title, summary, stack, repository_url, demo_url, published, position)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [
                $slug,
                $title,
                'Resumo de ' . $title,
                '["PHP 8.3"]',
                'https://github.com/GustavoHSMachado/' . $slug,
                $published === 1 ? 'https://exemplo.test' : null,
                $published,
            ]
        );
    }

    /** O id do projeto recém-semeado. Falha o teste se o seed não gravou. */
    private function projectId(string $slug): int
    {
        $linha = $this->db->first('SELECT id FROM projects WHERE slug = ?', [$slug]);

        self::assertNotNull($linha, sprintf('O projeto "%s" não foi semeado.', $slug));

        return (int) $linha['id'];
    }

    private function seedImage(int $projectId, string $path, string $alt, int $position): void
    {
        $this->db->run(
            'INSERT INTO project_images (project_id, path, alt, position) VALUES (?, ?, ?, ?)',
            [$projectId, $path, $alt, $position]
        );
    }

    #[Test]
    public function lista_projetos_sem_sessao(): void
    {
        $this->seedProject('no-ar', 'Projeto no ar', 1);

        $response = (new App(dirname(__DIR__, 2)))->handle($this->request('/api/v1/projects'));

        self::assertSame(200, $response->status);

        $projetos = $response->payload['data']['projects'];

        self::assertCount(1, $projetos);
        self::assertSame('no-ar', $projetos[0]['slug']);
    }

    #[Test]
    public function rascunho_nao_aparece_na_listagem(): void
    {
        $this->seedProject('no-ar', 'Projeto no ar', 1);
        $this->seedProject('em-construcao', 'Projeto em construção', 0);

        $response = (new App(dirname(__DIR__, 2)))->handle($this->request('/api/v1/projects'));

        $slugs = array_column($response->payload['data']['projects'], 'slug');

        self::assertSame(['no-ar'], $slugs);
    }

    #[Test]
    public function rascunho_nao_abre_pelo_endereco_direto(): void
    {
        $this->seedProject('em-construcao', 'Projeto em construção', 0);

        $response = (new App(dirname(__DIR__, 2)))
            ->handle($this->request('/api/v1/projects/em-construcao'));

        self::assertSame(404, $response->status);
    }

    /**
     * As fotos saem com a URL montada, não só o caminho do banco.
     *
     * O banco guarda caminho relativo para sobreviver a troca de domínio; se a
     * API devolvesse só ele, cada tela teria de inventar o domínio por conta —
     * e no site isso significaria NEXT_PUBLIC_API_URL, que é congelada no
     * build.
     */
    #[Test]
    public function lista_as_fotos_do_projeto_com_url_absoluta(): void
    {
        $this->seedProject('no-ar', 'Projeto no ar', 1);
        $this->seedImage($this->projectId('no-ar'), 'uploads/projetos/abc123.webp', 'Tela inicial', 0);

        $response = (new App(dirname(__DIR__, 2)))->handle($this->request('/api/v1/projects'));

        $fotos = $response->payload['data']['projects'][0]['images'];

        self::assertCount(1, $fotos);
        self::assertSame('uploads/projetos/abc123.webp', $fotos[0]['path']);
        self::assertSame('Tela inicial', $fotos[0]['alt']);
        self::assertStringEndsWith('/uploads/projetos/abc123.webp', $fotos[0]['url']);
        self::assertStringStartsWith('http', $fotos[0]['url']);
    }

    /** Foto de rascunho não vaza: o projeto inteiro fica fora da listagem. */
    #[Test]
    public function fotos_de_rascunho_nao_aparecem(): void
    {
        $this->seedProject('em-construcao', 'Projeto em construção', 0);
        $this->seedImage(
            $this->projectId('em-construcao'),
            'uploads/projetos/segredo.webp',
            'Tela não publicada',
            0
        );

        $response = (new App(dirname(__DIR__, 2)))->handle($this->request('/api/v1/projects'));

        self::assertSame([], $response->payload['data']['projects']);
    }

    /** As fotos vêm na ordem definida no painel, não na ordem de envio. */
    #[Test]
    public function fotos_respeitam_a_ordem_definida(): void
    {
        $this->seedProject('no-ar', 'Projeto no ar', 1);
        $projectId = $this->projectId('no-ar');

        $this->seedImage($projectId, 'uploads/projetos/terceira.webp', 'Terceira', 2);
        $this->seedImage($projectId, 'uploads/projetos/primeira.webp', 'Primeira', 0);
        $this->seedImage($projectId, 'uploads/projetos/segunda.webp', 'Segunda', 1);

        $response = (new App(dirname(__DIR__, 2)))->handle($this->request('/api/v1/projects'));

        $alts = array_column($response->payload['data']['projects'][0]['images'], 'alt');

        self::assertSame(['Primeira', 'Segunda', 'Terceira'], $alts);
    }
}
