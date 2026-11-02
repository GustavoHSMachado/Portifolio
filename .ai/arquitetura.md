# Arquitetura — Portifolio v2

> Documenta a `v2/`, única versão ativa. A `v1/` é histórico congelado e não é
> descrita aqui além do necessário. Atualizado em 10/09/2026.

---

## 1. Visão geral

Duas aplicações separadas, que só conversam por HTTP/JSON:

```
Navegador
   |
   +-- Site  (Next.js 16 / React 19)      v2/frontend
   |          SSR + revalidação, CSP própria
   |
   +-- API   (PHP 8.3, MVC próprio)       v2/backend
              JWT + refresh rotativo -> MySQL 8 / MariaDB
```

Não há template PHP servindo HTML nem Next acessando o banco. O único ponto em
que o Next fala com a API pelo servidor é `src/app/api/revalidar/route.ts`, que
repassa o token do usuário para uma rota administrativa só para confirmar que
quem pediu a revalidação é admin.

---

## 2. Backend (`v2/backend`)

**Stack:** PHP >= 8.3, PSR-4 (`App\` -> `src/`), sem framework.
Dependências: `firebase/php-jwt`, `monolog/monolog`, `phpmailer/phpmailer`,
`vlucas/phpdotenv`, `sentry/sentry`. O pacote `open-telemetry/api` está
declarado no `composer.json`, mas **nenhum código em `src/` o utiliza** — só
existem as variáveis `OTEL_*` no `.env.example`.

**Entrypoint único:** `public/index.php` -> `App\Core\App`. Todo o restante
(`src/`, `database/`, `storage/`, `.env`) fica **fora do document root**.

```
src/
├── Core/         App, Config, Container (DI com autowiring), Router,
│                 Request, Response, HttpException
├── Database/     Connection (PDO), Migrator
├── Http/
│   ├── Controllers/  Auth, User, Content, Settings, Message, Admin, Health
│   └── Middleware/   RequestId, Cors, ErrorHandler, SecurityHeaders,
│                     RateLimit, Authenticate, RequireRole, RequireAdmin,
│                     RequireVerifiedEmail
├── Models/       User, VerificationToken, RefreshToken, PasswordHistory,
│                 AuditLog, LegalAcceptance, Content, Message, SiteSettings
├── Services/     AuthService, TokenService, MailService, RateLimiter
└── Support/      Hash, Logger, Validator, helpers
```

**Fluxo:** `Request -> Middleware global -> Middleware da rota -> Controller ->
Service -> Model -> PDO`.

**Regras de camada (não negociáveis, ver CONTEXTO-DO-PROJETO.md §3.2):**

| Camada | Pode | Não pode |
|---|---|---|
| Controller | Validar entrada, chamar Service, montar Response | SQL, regra de negócio |
| Service | Orquestrar Models, regra de negócio | Ler superglobais, emitir HTTP |
| Model | Query preparada | Regra de negócio, formatar saída |
| Middleware | Cortar/enriquecer a requisição | Regra de negócio |

**Pipeline global, nesta ordem (intencional):**
`RequestId -> Cors -> ErrorHandler -> SecurityHeaders -> RateLimit`.
O `Cors` **precisa** vir antes do `ErrorHandler`: abaixo dele, respostas de erro
(401/404/422/429) saíam sem `Access-Control-Allow-Origin` e o navegador as
transformava em "falha de rede".

**Rotas:** 39, registradas em `src/Core/App.php` (fonte única).
Prefixo `/api/v1`, mais `/health` e `/health/ready` (fora do rate limit).

---

## 3. Frontend (`v2/frontend`)

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5.5, framer-motion,
tokens de CSS próprios. Sem biblioteca de UI de terceiros.

```
src/
├── app/          14 páginas: home, (auth) entrar/criar-conta/confirmar-email/
│                 recuperar-senha/redefinir-senha, painel, projetos, curriculo,
│                 legal/*, admin, admin/usuarios, admin/acessos
│                 + api/revalidar, sitemap, robots, opengraph-image
├── components/   ui/ (Button, Input, Checkbox, Modal, Toast, Skeleton,
│                 ContactForm, SkillIcon, BotaoDeTema, ...),
│                 admin/ (AparenciaSection), motion/ (PageTransition, Reveal).
│                 A pasta layout/ existe e está vazia.
├── hooks/        useAuth (+ AuthProvider e useRequireAuth), useTema
├── lib/          api.ts, portfolio.ts, cores.ts, tema.ts, legal.ts,
│                 motion.ts, site.ts, structured-data.ts
└── styles/       globals.css e tokens.css
```

**Acesso a dados:** somente por `lib/api.ts` (componente nunca faz `fetch`
direto). O access token vive **em memória**; o refresh é cookie `httpOnly`.
Um 401 dispara **um** refresh, e chamadas concorrentes esperam a mesma promise.

**Cache:** a home é renderizada no servidor com `next: { revalidate: 60 }`;
o painel chama `/api/revalidar` para descartar o cache na hora após uma edição.

---

## 4. Banco de dados

MySQL 8 no ambiente local (Docker); **MariaDB 11.8 na Hostinger** em produção.
Schema definido por 15 migrations em `v2/backend/database/migrations/`
(`AAAA_MM_DD_NNNNNN_descricao.sql`, com linha `-- ROLLBACK:` para desfazer).

Tabelas: `users`, `verification_tokens`, `refresh_tokens`, `rate_limits`,
`audit_log`, `legal_acceptances`, `profile` (linha única), `education`,
`experiences`, `skills`, `projects`, `password_history`, `messages`,
`site_settings`, mais `migrations` (controle do migrador: `filename` + `batch`,
criada pelo próprio `Migrator`).

Ferramentas: `php database/migrate.php [--status|--rollback]`,
`create-admin.php`, `promote-admin.php`, `purge.php`, `seed-e2e-admin.php`.
Retrato do banco em `database/dumps/portifolio-2026-08-29.sql`.

---

## 5. Autenticação e autorização

**Login em dois passos.** Senha correta **não** abre sessão: dispara um código de
7 dígitos por e-mail (`login_2fa`, TTL `LOGIN_2FA_TTL`, 10 min por padrão), que é
validado em `/api/v1/auth/login/verify`. Só então saem os tokens.

| Token | Formato | Vida | Onde fica |
|---|---|---|---|
| Access | JWT HS256 (`JWT_SECRET`, mín. 32 chars) | 15 min (`JWT_ACCESS_TTL`) | memória do navegador |
| Refresh | opaco, rotativo, por família | 30 dias (`REFRESH_TOKEN_TTL_DAYS`) | cookie `httpOnly`, `SameSite=Strict` |

Reuso de refresh derruba a família inteira (presunção de roubo), com janela de
tolerância `REFRESH_ROTATION_GRACE` (10 s) para a corrida entre abas.

**Níveis de acesso:**

| Nível | Como é exigido | Alcance |
|---|---|---|
| Público | sem middleware | home, conteúdo (`/api/v1/content`), envio de mensagem, rotas públicas de auth |
| Autenticado | `Authenticate` | `/api/v1/me`, projetos (`/api/v1/projects`, `/{slug}`), troca de senha |
| E-mail confirmado | `Authenticate` + `RequireVerifiedEmail` | edição do próprio perfil (`PUT /api/v1/me`) |
| Admin | `Authenticate` + `RequireAdmin` | todo `/api/v1/admin/*` |

`RequireAdmin` = papel `admin` na coluna `users.role` **e**, quando
`ADMIN_EMAIL` está definido no `.env`, e-mail na allowlist do arquivo. O e-mail é
lido do banco, não das claims do token. Sem `ADMIN_EMAIL`, papel basta (é o que
mantém testes e clone novo funcionando).

---

## 6. Infraestrutura

**Local:** Docker Compose na raiz — `db` (MySQL 8), `api` (PHP), `web` (Next),
`mailpit` (captura de e-mail), `adminer`, `e2e` (imagem oficial do Playwright).
Comandos pelo `Makefile`: `make secrets`, `make up`, `make urls`, `make check`,
`make test-e2e`, `make purge`.

**Produção (desde 30/08/2026):**

| Parte | Onde | Endereço |
|---|---|---|
| Site | Vercel, projeto `portifolio`, branch `master` | `gustavohsmachado.com.br` |
| API | Hostinger (site próprio no plano, não subdomínio) | `api.gustavohsmachado.com.br` |
| Banco | Hostinger MySQL/MariaDB | `u388588792_portifolio` |

Site e API compartilham o mesmo domínio registrável porque o cookie de refresh
usa `SameSite=Strict`. Na Hostinger não há Composer: `vendor/` é instalado fora e
enviado no pacote; `public_html/` guarda só `index.php` e `.htaccess`, e
`src/ vendor/ database/ storage/ .env` ficam **fora** dele.

`docker-compose.prod.yml` e `docs/DEPLOY.md` descrevem o caminho **VPS/Docker**,
que não é o usado hoje — ver riscos em `.ai/estado.md`.

**CI (`.github/workflows/ci.yml`):** jobs `commitlint`, `backend` (matriz PHP
8.3 e 8.4, com MySQL 8.0 de serviço: PHP-CS-Fixer, PHPStan nível 8, auditoria de
dependências, migrações, PHPUnit + cobertura), `frontend` (Biome, tsc, Knip,
Vitest, build e orçamento de bundle — 400 KB de `.next/static` medido em gzip),
`e2e` (Playwright com banco, API e Mailpit), `performance` (Lighthouse CI,
limiares de 0,9 para performance, boas práticas e SEO e 0,95 para
acessibilidade), `security` (Gitleaks, dependency review, CodeQL) e o
consolidador `quality-gate`.
