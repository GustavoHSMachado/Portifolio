# Estado atual — Portifolio v2

> Retrato de 10/09/2026, feito a partir do código, das migrations, do CI e do
> histórico do Git. Fontes complementares: `docs/ESTADO-ATUAL.md` (detalhe até
> 29/08/2026) e `relatorio de trabalho/homologacao-producao/`.

---

## 1. Onde o projeto está

A refatoração está **concluída e publicada**. As fases 0 a 6 foram fechadas, o
merge da `dev` na `master` já aconteceu e o sistema está no ar desde
**30/08/2026**:

| Parte | Onde | Endereço |
|---|---|---|
| Site (Next 16) | Vercel, branch `master` | `gustavohsmachado.com.br` |
| API (PHP 8.3) | Hostinger, site próprio | `api.gustavohsmachado.com.br` |
| Banco | Hostinger | `u388588792_portifolio` |

O que corre hoje é manutenção, não mais construção.

---

## 2. Git

- Branch de trabalho: `dev`. Produção: `master`.
- A `dev` foi sincronizada com a `master` em 01/11/2026 (avanço direto para
  `47c8ed6`); as duas estão no mesmo ponto. A `dev` costuma ficar atrás quando
  um merge é feito direto na `master` — conferir antes de abrir trabalho novo.
- Pendências na árvore de trabalho: a vitrine pública de projetos, ainda não
  commitada, e `.claude/CLAUDE.md` modificado (foi sobrescrito com uma cópia
  das regras globais).

---

## 3. Números verificados

| Métrica | Valor | Como foi conferido |
|---|---|---|
| Rotas da API | 42 | contagem em `src/Core/App.php` |
| Migrations | 16 | `database/migrations/` |
| Páginas do frontend | 14 `page.tsx` | `src/app/` |
| Suítes de teste do backend | 5 unitárias + 4 de integração | `tests/` |
| Specs E2E | 3 (`acesso`, `autenticacao`, `administracao`) | `frontend/tests/e2e/` |

Verificação executada em 01/11/2026, no compose local, com a vitrine pública e
as fotos dos projetos na árvore: php-cs-fixer 0 de 66 arquivos, PHPStan nível 8
com 0 erros, PHPUnit 69/69 (176 asserções), Vitest 68/68, `tsc --noEmit` limpo
e Playwright 92/92. O lint do frontend reprova por um único erro, em
`tsconfig.json` (ver pendências) — nenhum arquivo de `src/` acusa erro, e os 4
avisos de complexidade cognitiva são anteriores a este trabalho.

Knip e o orçamento de bundle (319 KB comprimidos contra 400 KB, medidos em
29/08/2026) **não** foram reexecutados.

---

## 4. Módulos em funcionamento

- **Autenticação** — cadastro, confirmação de e-mail, login em dois fatores por
  código de 7 dígitos, recuperação e troca de senha, refresh rotativo, logout.
- **Portfólio público** — perfil, formação, experiências, habilidades e a
  contagem de projetos, servidos por `/api/v1/content`.
- **Projetos** — vitrine pública em `/projetos` desde 01/11/2026, com filtros
  (todos, no ar, código aberto) e o caso de cada projeto recolhido. Exigiram
  sessão entre 23/08/2026 e 01/11/2026. O que segura rascunho é `published = 1`,
  filtrado em `publishedProjects()` e coberto por `tests/Integration/VitrinePublicaTest.php`.
- **Fotos dos projetos** — até 8 por projeto, enviadas pelo painel
  (`POST /api/v1/admin/projects/{id}/images`). O arquivo fica em
  `public/uploads/projetos/` e o banco guarda só o caminho relativo, em
  `project_images`. A primeira foto é a capa do cartão; as demais formam a
  galeria. Validação em `App\Services\ImageStorage`, coberta por
  `tests/Unit/ImageStorageTest.php`. Ver D-32.
- **Ordem da vitrine** — o campo de posição entrou no formulário de projetos em
  01/11/2026. Antes disso o painel mandava sempre `0`. Os formulários de
  formação, experiências e habilidades **continuam com esse defeito**. Ver D-33.
- **Currículo** — página `/curriculo` para download.
- **Mensagens** — formulário público de contato, com caixa de entrada no painel.
- **Área administrativa** — `/admin` (conteúdo), `/admin/usuarios` (bloquear,
  liberar e excluir contas) e `/admin/acessos` (auditoria).
- **Aparência** — cor de destaque e títulos/subtítulos das seções editáveis
  (`site_settings`), com revalidação imediata da home.
- **Observabilidade** — Sentry inicializado em `App::bootObservability()` só
  quando há `SENTRY_DSN`, com `send_default_pii = false`. Logs em Monolog com
  `request_id`. OpenTelemetry **não está instrumentado**: o pacote e as
  variáveis `OTEL_*` existem, o código não os usa.

---

## 5. Pendências em aberto

| ID | Item | Situação |
|---|---|---|
| B50 | Credencial (senha de aplicativo já revogada) ainda presente no histórico público do Git. Falta decidir entre reescrever o histórico com `limpar-senha-do-historico.sh` ou registrar em `.gitleaksignore` | risco aceito em 29/08/2026, decisão pendente com o Gustavo |
| — | `docs/DEPLOY.md` e `docker-compose.prod.yml` descrevem publicação por VPS/Docker, que **não** é a infraestrutura em uso (Vercel + Hostinger). Não há procedimento de deploy escrito para a infraestrutura real | identificado em 10/09/2026 |
| — | `docs/ESTADO-ATUAL.md` ainda lista B28 (PR para a `master`) e B52 (publicar) como abertos; ambos foram concluídos | documentação desatualizada |
| — | Minutas legais (`docs/legal/`) com campos `[PREENCHER]` e sem revisão jurídica | pendente desde 09/08/2026 |
| — | Expurgo (`database/purge.php`) não roda sozinho em produção; precisa de agendamento | pendente |
| — | Lighthouse: o job `performance` existe no CI com os limiares definidos, mas não há registro de execução bem-sucedida em nenhum documento do repositório | a confirmar |
| — | `npm run lint` reprova por `tsconfig.json format`: o Next 16 reescreve o arquivo num formato que o Biome recusa, e o job de lint do CI roda `npm run lint` sem tolerância. Vem de `4999fc8`, não de código em `src/`. Resolve-se ignorando o `tsconfig.json` no Biome | identificado em 01/11/2026 |
| — | `/projetos` renderiza no cliente: está no sitemap e sem `noindex` desde 01/11/2026, mas o rastreador recebe a casca, sem os projetos. Virar renderização no servidor com revalidação, como a home | identificado em 01/11/2026 (ver D-31) |

---

## 6. Riscos e limitações conhecidos

1. **Sem Composer na Hostinger.** `vendor/` é montado fora e enviado no pacote;
   qualquer mudança de dependência exige refazer o envio manualmente.
2. **O deploy do site é acoplado ao build.** As variáveis `NEXT_PUBLIC_*` são
   congeladas no build: mudar `NEXT_PUBLIC_API_URL` sem reconstruir não tem
   efeito. Foi o defeito crítico achado na homologação de 29/08/2026.
3. **Cookie `SameSite=Strict`** amarra site e API ao mesmo domínio registrável.
   Trocar um dos hosts para outro domínio derruba a sessão a cada 15 minutos.
4. **Publicar o repositório inteiro em servidor com PHP exporia a `v1/`**: os
   arquivos da raiz dela voltariam a responder. Hoje nada a serve.
5. **Três tabelas crescem sozinhas** (`refresh_tokens`, `verification_tokens`,
   `rate_limits`) e dependem do expurgo, que não está agendado.
6. **O 2FA depende do e-mail.** SMTP fora do ar = ninguém entra. Não há caminho
   alternativo de autenticação.
7. **O banco de produção é MariaDB 11.8**, enquanto o ambiente local e o CI usam
   MySQL 8. Diferenças de comportamento não estão cobertas por teste.
8. **Alterar o schema pelo Workbench** faz o banco divergir das migrations.
9. **As fotos dos projetos só existem no servidor onde foram enviadas.** A pasta
   `public/uploads/` não é versionada e o deploy da API é envio manual de
   pacote: um envio que sobrescreva `public_html/uploads/` apaga tudo. Ela
   precisa entrar no backup e ficar fora do pacote. Ver D-32.
10. **Imagem enviada não é reconstruída** (sem GD no container), então
    metadados do arquivo original permanecem. Contido pelo `.htaccess` que nega
    execução na pasta e pelo `nosniff`.

---

## 7. Não identificado / a confirmar

- Estado atual da execução do CI na `master` (não foi consultado o GitHub).
- Se as issues do GitHub (`criar-issues.sh`) chegaram a ser criadas.
- Conteúdo do `.htaccess` da API em produção: ele existe no servidor da
  Hostinger, mas **não está versionado** no repositório.
- Se o Sentry foi ativado em produção (depende do DSN no `.env` do servidor,
  fora do repositório).
