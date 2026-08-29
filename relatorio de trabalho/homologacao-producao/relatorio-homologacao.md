# Relatório de Homologação para Produção — Portifolio v2

**Data:** 29 de agosto de 2026
**Branch homologada:** `dev` (commit `3595e5e`)
**Branch de produção:** `master` (commit `e9483c1`) — 60 commits atrás
**Responsável pela homologação:** QA / Release Engineering
**Repositório:** github.com/GustavoHSMachado/Portifolio — **público**

---

## STATUS

# ❌ NÃO APROVADO PARA PRODUÇÃO

O sistema é sólido. A aplicação em si — autenticação, autorização, banco,
tratamento de erro, testes — está em condição melhor do que a média do que se vê
em produção. **O que reprova não é a aplicação: é a ausência de um caminho de
publicação.** Não existe configuração de produção, não existe procedimento de
deploy, não existe rollback definido, e o único artefato de produção que existia
saía quebrado (corrigido nesta homologação). Some-se a isso um segredo real
exposto na branch pública que hoje é a produção declarada.

Não é uma reprovação de qualidade de código. É uma reprovação de prontidão para
publicar.

---

## 1. Objetivo

Responder, com evidência, a uma única pergunta: **este sistema está pronto para
produção?**

O alvo foi validar se a refatoração da v1 para a v2 preservou e melhorou o
sistema — não refatorá-lo de novo. Toda alteração feita aqui precisou de defeito
demonstrado, e está registrada na seção 8.

---

## 2. Estado inicial

| Item | Situação encontrada |
|---|---|
| Branch de trabalho | `dev`, alinhada com `origin/dev` |
| Branch de produção | `master`, alinhada com `origin/master`, **60 commits atrás** e ainda contendo a v1 inteira |
| Working tree | Limpo, exceto `limpar-senha-do-historico.sh` (não versionado) |
| Ambiente local | Stack Docker completa já no ar (api, web, db, mailpit, adminer) |
| Migrações | 15 aplicadas, 0 pendentes |
| Documentação | `CONTEXTO-DO-PROJETO.md`, `docs/ESTADO-ATUAL.md`, `README.md` — atuais e de qualidade incomum |
| Backlog declarado | B28 (PR para master), B50 (limpar senha do histórico), B51 (refresh entre abas) |

A documentação do projeto é honesta: os três itens em aberto que ela declara são
reais, e dois deles pesam na decisão final. Ela também declara resultados que
esta homologação **não conseguiu confirmar** — ver seção 7.

---

## 3. Ambiente utilizado

Homologação executada contra a stack Docker do repositório, que é a mesma
composição prevista para produção nos Dockerfiles.

| Componente | Versão no container | Versão exigida | OK |
|---|---|---|---|
| PHP (api) | 8.3.33 | `>=8.3` | ✅ |
| Node (web) | 20.20.2 | `>=20.11` | ✅ |
| MySQL | 8.0.46 | 8 | ✅ |
| Composer | 2 | 2 | ✅ |
| Playwright | imagem oficial, alinhada ao `package.json` | — | ✅ |

**Ambiente do host (fora dos containers):** PHP 8.2.12 e Node 18.16.1 — **abaixo
do exigido**. Sem impacto: nada roda fora do container. Registrado porque uma
instalação manual seguindo o `README.md` nesta máquina falharia.

**Credenciais:** nenhuma credencial de produção foi usada. As chaves de teste
(`APP_KEY`/`JWT_SECRET`) dos containers de simulação foram geradas para esta
homologação e descartadas junto com os containers.

**Ressalva de e-mail — divulgada:** o `.env` local aponta `MAIL_HOST` para o SMTP
real da Hostinger. Todos os testes usaram endereços `@example.com`, que o
`MailService::isDominioReservado` desvia para o Mailpit — **nenhum e-mail saiu**,
exceto **um**: o teste do formulário público de contato notifica o `ADMIN_EMAIL`,
que é um endereço real, e essa mensagem foi entregue de verdade na caixa do
Gustavo (o teste de injeção de cabeçalho, com `Bcc:` no assunto). Pode ser
apagada.

---

## 4. Arquitetura analisada

```
Request → RequestId → Cors → ErrorHandler → SecurityHeaders → RateLimit
        → Authenticate → RequireVerifiedEmail / RequireRole / RequireAdmin
        → Controller → Service → Model → MySQL
```

- **Backend:** PHP 8.3, MVC próprio PSR-4, 39 rotas, 4.901 linhas em `src/`.
  Separação de camadas respeitada em todos os arquivos lidos — nenhum SQL em
  controller, nenhuma regra de negócio em model.
- **Frontend:** Next.js 14 App Router, TypeScript strict, 13 telas, 10
  componentes de UI. Nenhum `fetch` direto em componente; tudo passa por
  `lib/api.ts`.
- **Banco:** 15 tabelas, 43 índices, 5 chaves estrangeiras, InnoDB
  `utf8mb4_unicode_ci` em todas.
- **Sessão:** access token JWT de 15 min só em memória + refresh token opaco
  rotativo em cookie `HttpOnly`, com detecção de reuso por família.

A ordem do pipeline está correta e a justificativa documentada (Cors **antes** do
ErrorHandler) foi verificada na prática: respostas 401/403/404/422/429 saem com
`Access-Control-Allow-Origin`.

---

## 5. Funcionalidades homologadas

| # | Funcionalidade | Como foi verificada | Resultado |
|---|---|---|---|
| 01 | Cadastro público | HTTP + UI + E2E | ⚠️ Aprovada com ressalva (MED-01) |
| 02 | Confirmação de e-mail por token | HTTP + Mailpit + E2E | ✅ Aprovada |
| 03 | Token de confirmação de uso único | HTTP: 2ª tentativa → 410 | ✅ Aprovada |
| 04 | Login passo 1 (senha) | HTTP + UI | ✅ Aprovada |
| 05 | Login passo 2 (código 2FA) | HTTP + UI + Mailpit | ✅ Aprovada |
| 06 | Código 2FA de uso único | HTTP: reuso → 401 | ✅ Aprovada |
| 07 | Mensagem genérica em credencial inválida | HTTP: mesmo 401 para senha errada e conta inexistente | ✅ Aprovada |
| 08 | Rotação de refresh token | HTTP: cookie novo a cada refresh | ✅ Aprovada |
| 09 | Detecção de reuso de refresh | HTTP: token velho → família revogada | ✅ Aprovada |
| 10 | Sessão sobrevive ao F5 | UI: reload em `/painel` | ✅ Aprovada |
| 11 | Sessão com duas abas simultâneas | UI: dois reloads concorrentes | ❌ **Reprovada** (ALT-04) |
| 12 | Logout | HTTP | ✅ Aprovada |
| 13 | Recuperação de senha (código por e-mail) | HTTP + Mailpit | ✅ Aprovada |
| 14 | Recusa de senha já usada | HTTP: 422 `password_reused` sem consumir o código | ✅ Aprovada |
| 15 | Política de senha | HTTP: recusas de tamanho, classe e senha comum | ✅ Aprovada |
| 16 | Troca de senha autenticada | Código lido | ⏸️ Não testada por HTTP |
| 17 | Conteúdo público da home | HTTP + UI | ✅ Aprovada |
| 18 | Projetos exigem sessão | HTTP: sem token → 401 | ✅ Aprovada |
| 19 | Formulário público de contato | HTTP | ✅ Aprovada |
| 20 | Campo-armadilha (honeypot) | HTTP: preenchido → 200 sem gravar | ✅ Aprovada |
| 21 | Painel de conteúdo (admin) | HTTP com token de admin real | ✅ Aprovada |
| 22 | Gestão de contas (bloquear/liberar/excluir) | HTTP | ✅ Aprovada |
| 23 | Proteção da própria conta e do ADMIN_EMAIL | HTTP: 403 nos dois casos | ✅ Aprovada |
| 24 | Aparência e textos da home | HTTP | ⚠️ Aprovada com ressalva (BAI-02) |
| 25 | Registros de auditoria | Banco: 14 tipos de evento observados | ✅ Aprovada |
| 26 | Caixa de mensagens do painel | HTTP | ✅ Aprovada |
| 27 | Health check raso (`/health`) | HTTP, com e sem banco | ❌ **Reprovada** (MED-03) — responde 200 com o banco no ar, mas 500 com o banco fora, quando deveria seguir vivo |
| 28 | Health check de prontidão (`/health/ready`) | HTTP com banco derrubado | ❌ **Reprovada** (MED-03) |
| 29 | Expurgo (`purge.php`) | Dry-run + execução real | ✅ Aprovada |
| 30 | Modo claro / escuro | UI | ✅ Aprovada |
| 31 | robots.txt e sitemap.xml | HTTP | ✅ Aprovada (ver CRI-01) |
| 32 | Currículo em PDF | HTTP 200 | ✅ Aprovada |
| 33 | Páginas legais | HTTP + E2E | ✅ Aprovada |
| 34 | Página 404 | HTTP | ✅ Aprovada |

**Resumo:** 34 funcionalidades mapeadas — **28 aprovadas**, **3 aprovadas com
ressalva**, **3 reprovadas**, **1 não testada**.

Item 16 não foi exercitado por HTTP porque exige uma sessão autenticada com dois
passos de código; o caminho de código é o mesmo de `resetPassword`, que foi
testado ponta a ponta, e a lógica compartilhada (`guardPasswordReuse`,
`findValidCode`, revogação de sessões) foi validada ali.

---

## 6. Testes executados

### 6.1 Suítes automatizadas

| Suíte | Resultado | Tempo |
|---|---|---|
| PHPUnit (Unit + Integration) | **48/48 ✅** — 94 asserções | 21–25s |
| Vitest | **68/68 ✅** — 7 arquivos | 2,5s |
| Playwright E2E | **80/80 ✅** — 16 cenários × 5 perfis (chromium, firefox, webkit, mobile, reduced-motion) | 3,9min |
| PHPStan nível 8 | **0 erros** (58 arquivos) | — |
| TypeScript strict | **0 erros** | — |
| Biome | **0 erros reais**, 4 avisos de complexidade | — |
| Knip (código morto) | **limpo** | — |
| `composer audit` | **0 advisories** | — |
| `npm audit --omit=dev` | **2 vulnerabilidades HIGH** ❌ | — |

**Total: 196 verificações automatizadas, 196 passando.** Nenhum teste foi
alterado, e nenhum falhou.

Um "erro" do Biome em `tsconfig.json` foi investigado e **descartado**: é
artefato de `core.autocrlf=true` no Windows. O blob no Git tem LF; só a cópia em
disco tem CRLF. No CI (Linux) não ocorre. Evidência: `git show HEAD:...json | od -c`
mostra `\n`, o arquivo em disco mostra `\r\n`, e `git status` está limpo.

### 6.2 Testes manuais executados nesta homologação

87 requisições HTTP dirigidas, 1 sessão completa de UI e 2 simulações de deploy.
Detalhamento nas seções 7 a 15.

---

## 7. Problemas encontrados

### 🔴 CRÍTICO

---

#### CRI-01 — A imagem de produção do frontend saía com `localhost` congelado dentro do bundle

**Situação:** CORRIGIDO nesta homologação (ver 8.1).

**Evidência.** Build da imagem exatamente como o Dockerfile manda:

```
docker build -f docker/web/Dockerfile --target prod -t portifolio-web:homolog .
docker run -e NEXT_PUBLIC_API_URL=https://api.gustavohsmachado.com.br \
           -e NEXT_PUBLIC_SITE_URL=https://gustavohsmachado.com.br ...
```

Resultado, **com as variáveis passadas em tempo de execução**:

```
connect-src 'self' http://localhost:8000            ← CSP
<loc>http://localhost:3000</loc>                     ← sitemap.xml
Sitemap: http://localhost:3000/sitemap.xml           ← robots.txt
http://127.0.0.1:8000                                ← URL da API dentro do bundle
```

**Causa.** O Next substitui `NEXT_PUBLIC_*` **dentro do bundle, no build**.
`docker/web/Dockerfile` não tinha nenhum `ARG` no estágio `build`, e o
`docker-compose.yml` só define essas variáveis em tempo de execução, sobre o alvo
`dev` — onde o `next dev` as lê ao vivo. O defeito era invisível localmente e
fatal em produção.

**Impacto se publicado.** O site abriria e renderizaria a casca. Toda chamada de
API iria para `127.0.0.1:8000` — a máquina de quem visita —, e a CSP bloquearia
de qualquer forma. Login, projetos, conteúdo e painel: nada funcionaria. O
sitemap anunciaria `localhost` aos buscadores.

---

#### CRI-02 — Não existe configuração de produção nem procedimento de deploy

**Situação:** EM ABERTO. **É o bloqueador remanescente.**

**Evidência.** Varredura no repositório inteiro:

- Não há `docker-compose.prod.yml`, `nginx.conf`, manifesto de orquestração,
  script de deploy ou runbook. Os únicos arquivos em `docker/` são os dois
  Dockerfiles, o `.ini` do Xdebug, o entrypoint (copiado **só no alvo `dev`**) e
  dois `.sql` de inicialização do MySQL.
- `.env.example` documenta **exclusivamente** as variáveis do compose local.
  Não menciona `APP_ENV`, `APP_DEBUG`, `APP_URL`, `FRONTEND_URL`,
  `CORS_ALLOWED_ORIGINS`, `APP_SECURE_COOKIES`, `APP_FORCE_HTTPS`,
  `TRUSTED_PROXIES`, `SENTRY_DSN`, `API_INTERNAL_URL`, `LOG_PATH`, `APP_NAME`,
  nem as variáveis de banco de produção.
- `docker-compose.yml` fixa `APP_ENV: local` e `APP_DEBUG: "true"` no serviço
  `api`. Não há um segundo arquivo que sobrescreva isso.
- O alvo `prod` da API é **php-fpm na porta 9000**. Precisa de um servidor web na
  frente. Esse servidor não existe no repositório.
- As migrações rodam sozinhas apenas no `entrypoint.sh` do alvo `dev`. Em
  produção, ninguém as chama.
- Não há mecanismo de rollback de migração: `Migrator` expõe
  `ensureControlTable`, `applied`, `pending`, `statementsIn`, `apply`,
  `nextBatch` e `run` — **nenhum `down` ou `rollback`**. Os arquivos `.sql` trazem
  um comentário `-- ROLLBACK: ...`, que nada lê.
- `TRUSTED_PROXIES` vazio significa que, atrás de um proxy reverso, **todo o rate
  limit passará a contar contra o IP do proxy** — um único balde para o mundo
  inteiro. Cinco tentativas de login por 15 minutos, somadas entre todos os
  visitantes.

**Impacto.** Não há o que publicar. Aprovar "para produção" um sistema sem
destino, sem configuração e sem volta seria assinar em branco.

---

### 🟠 ALTO

---

#### ALT-01 — Senha de aplicativo real exposta na branch pública que hoje é a produção

**Evidência.**

```
$ curl -s https://api.github.com/repos/GustavoHSMachado/Portifolio | grep visibility
  "visibility": "public",
  "default_branch": "master",

$ git rev-parse origin/master
e9483c17634062bbca38fe18ee7a6b3a96dd98ae

$ git grep -l "<senha>" master
master:configEmail.php
master:formail.php
```

A senha de aplicativo do Gmail de `gustavo.hsmachado@gmail.com` está em texto
plano em **3 commits** e no **conteúdo atual da branch padrão** de um repositório
público. É a primeira coisa que qualquer visitante vê ao abrir o repositório.

**Atenuante declarado, não verificável por mim.** `docs/ESTADO-ATUAL.md` afirma
que a senha foi **revogada em 23/08/2026**. Se isso é fato, o risco vivo acabou
ali e o que resta é higiene. Não tenho como confirmar a revogação, e por isso a
classificação permanece ALTO em vez de CRÍTICO — com a ressalva de que, **sem a
revogação, este item é CRÍTICO**.

**Observação sobre o merge.** Trazer a `dev` para a `master` limpa a *ponta* — a
árvore da `dev` não contém a senha em lugar nenhum (verificado). **Não limpa o
histórico**: o commit `aba029d` continua alcançável a partir da `master`.

O script `limpar-senha-do-historico.sh` existe, faz backup em bundle antes de
reescrever, confere ocorrência a ocorrência e não faz push. Ele não foi executado
nesta homologação: reescrever histórico e forçar push em repositório público é
decisão do dono, não do QA.

---

#### ALT-02 — O CI nunca executou. Nenhuma vez.

**Situação:** CORRIGIDO nesta homologação (ver 8.2), pendente de validação real.

**Evidência.**

```
$ curl -s https://api.github.com/repos/.../actions/runs
  "total_count": 0,
```

`.github/workflows/ci.yml` disparava em `pull_request: [main, develop]` e
`push: [main]`. As branches deste repositório se chamam **`master` e `dev`**.
O gatilho nunca casou.

**Impacto.** Tudo o que o `CONTEXTO-DO-PROJETO.md` descreve como obrigatório —
Commitlint, PHPStan, Biome, Knip, PHPUnit, Vitest, Playwright, **Gitleaks**,
CodeQL, Dependency Review, Lighthouse, orçamento de bundle, e o `quality-gate`
que consolida tudo — **nunca rodou**. A esteira de qualidade era decorativa.

Isso explica ALT-01 e ALT-03: o Gitleaks teria apontado a senha, e o Dependency
Review (`fail-on-severity: high`) teria apontado as vulnerabilidades do Next.

---

#### ALT-03 — Dependência de produção com vulnerabilidades de severidade alta

**Evidência.** `npm audit --omit=dev` (somente dependências de produção):

```
2 high severity vulnerabilities
```

Versão instalada: **next@14.2.35**. Advisories que a alcançam:

| Advisory | Severidade | Assunto |
|---|---|---|
| GHSA-955p-x3mx-jcvp | alta | Exposição não autenticada de endpoints de Server Function |
| GHSA-h25m-26qc-wcjf | alta | DoS por desserialização de requisição em RSC |
| GHSA-8h8q-6873-q5fj | alta | DoS com Server Components |
| GHSA-3g8h-86w9-wvmq | alta | Envenenamento de cache em redirects de middleware |
| GHSA-ggv3-7p47-pfv8 | moderada | Request smuggling em rewrites |
| postcss@8.4.31 (embarcado) | alta | Path traversal via `sourceMappingURL` |

**Exposição real, medida e não estimada:**

- `grep -rn '"use server"' src/` → **vazio**. Sem Server Actions, GHSA-955p não é
  alcançável.
- Sem `rewrites`, `redirects` ou `remotePatterns` no `next.config.mjs` →
  smuggling e o DoS do Image Optimizer não são alcançáveis.
- `postcss` só participa do build; não vai para o runtime `standalone`.
- **O que sobra é real:** o App Router usa RSC por definição, então as classes de
  DoS por RSC alcançam esta aplicação.

**Não foi corrigido de propósito.** A correção é `next@16`, mudança
quebrante. Atualização de dependência é mudança controlada, com seu próprio ciclo
de teste — não se faz durante uma homologação.

---

#### ALT-04 — Duas abas abertas derrubam a sessão inteira e envenenam a auditoria

**Reprodução (UI real, não sintética).** Duas abas em `/painel`, sessão válida,
recarregadas com 40ms de diferença:

```
aba 1 → /entrar   (sessão perdida na hora)
aba 2 → /painel   (sobreviveu)
aba 2 → /entrar   (caiu no próximo F5)
```

Log da API no instante exato:

```json
{"message":"Reuso de refresh token detectado — família revogada",
 "context":{"user_id":891,"family_id":"0b7dc97c...","ip":"172.20.0.1"},
 "level_name":"ERROR"}
```

**Duas consequências, e a segunda não está documentada.**

1. **Usabilidade.** Como a resposta é revogar a **família inteira**, não é uma aba
   que cai: é a sessão toda. A pessoa precisa refazer o login completo,
   **inclusive esperar um novo código de 2FA por e-mail**. Para um uso banal —
   duas abas do próprio site.

2. **A telemetria de segurança fica inutilizável.** Cada ocorrência grava
   `sessao.reuso_detectado` no `audit_log` e um log de nível ERROR. É o alarme de
   roubo de sessão do sistema, e ele dispara com uso normal. O painel
   `/admin/acessos` existe para mostrar exatamente esse sinal; com falso positivo
   trivial de produzir, ninguém vai conseguir distinguir um roubo de verdade de
   alguém que apertou F5 em duas abas. Já há 5 eventos na tabela — 2 gerados por
   mim hoje, 3 anteriores.

O backlog registra isto como **B51, prioridade P3**. Pela segunda consequência,
**P3 subestima**: não é só incômodo, é a degradação do único mecanismo de
detecção de sessão comprometida que o sistema tem.

---

### 🟡 MÉDIO

---

#### MED-01 — Enumeração de contas no cadastro, por código de status

**Evidência.**

```
POST /api/v1/auth/register  {e-mail novo}       → 201
POST /api/v1/auth/register  {e-mail existente}  → 202
```

Os corpos também diferem: `{"data":{"user":{...}}}` contra
`{"error":"Se este e-mail estiver disponível..."}`.

**Contradição direta com a documentação.** `CONTEXTO-DO-PROJETO.md` §4.6 exige
"nunca revele se um e-mail existe", e `docs/ESTADO-ATUAL.md` afirma que a revisão
B26 concluiu "sem enumeração de contas (nem por mensagem nem por tempo de
resposta)". A mensagem é de fato ambígua e o tempo de resposta também — mas o
**código de status** entrega a resposta em uma requisição.

Do lado da tela, o comportamento é correto: `criar-conta/page.tsx` trata 202
exatamente como sucesso, e o usuário legítimo não percebe diferença. O vazamento
é puramente no protocolo, alcançável com um `curl`.

**Correção recomendada (não aplicada — muda contrato de API):** o servidor passa a
responder **201 com o mesmo corpo genérico** nos dois casos, e o front deixa de
distinguir 202. Exige ajuste coordenado nas duas pontas e nos testes.

**Por que não corrigi:** é comportamento de segurança da aplicação, com efeito na
UX e na suíte, em duas bases. É mudança controlada, não conserto de homologação.

---

#### MED-02 — O `request_id` nunca chega aos logs

**Evidência.** `grep -rn "withRequestId" src/ tests/` devolve **uma única linha**:
a própria definição, em `Support/Logger.php:68`. **Nada chama o método.**

Confirmado na saída real da API — todos os `extra` vêm vazios:

```json
{"message":"Login efetuado","context":{"user_id":862,"ip":"172.20.0.1"},
 "level_name":"INFO","extra":{}}
```

O `RequestId` gera o identificador, o devolve no cabeçalho `X-Request-Id` e o põe
como atributo da requisição — e só o `ErrorHandler` o lê, apenas para exceções não
tratadas. **Todo o resto do log — login, senha errada, código recusado, reuso de
sessão, envio de e-mail — sai sem correlação.**

**Impacto em produção.** Um usuário reporta "deu erro, request id `abc123`". Você
acha a linha do 500. Não consegue reconstruir o que aconteceu na mesma requisição
antes dele. É metade da rastreabilidade que o `CONTEXTO-DO-PROJETO.md` §6 promete
("logs estruturados em JSON com `request_id` correlacionando front e back").

O código já foi mexido uma vez: o comentário em `Logger.php` registra que a
assinatura estava errada para o Monolog 3 e que "o recurso de correlação nunca
funcionou, e nunca foi notado porque nada o chamava". A assinatura foi
consertada. **O chamador continua não existindo.**

**Por que não corrigi:** o `Logger` é injetado como singleton no container e já
está construído dentro de `ErrorHandler`, `AuthService`, `MailService` e
`MessageController` antes de a requisição começar. Torná-lo por requisição mexe
no container e no pipeline — refatoração, não correção pontual, e exatamente o
tipo de mudança que não se faz durante homologação.

---

#### MED-03 — `/health/ready` nunca devolve 503

**Evidência.** Imagem de produção subida contra um banco inacessível:

```
GET /health        → 500      ← liveness
GET /health/ready  → 500      ← readiness
```

O esperado no `/health/ready`, escrito no `HealthController::ready`, é
`503 {"status":"degraded","checks":{"database":"down"}}`.

**Causa, com prova no rastro.** O `RateLimit` roda **antes** do controller e
também toca o banco — o contador é persistido lá. Ele estoura primeiro:

```
#2 /app/src/Services/RateLimiter.php(27)
#3 /app/src/Http/Middleware/RateLimit.php(62)
```

O `try/catch` cuidadosamente escrito no controller nunca é alcançado.

**Impacto — e ele é maior do que a perda do diagnóstico.** Ao detalhar a
correção, verifiquei também o `/health`, que eu não havia testado ao escrever
esta seção: **a sonda de liveness também devolve 500 quando o banco cai.** Um
orquestrador conclui então que o processo da API morreu e **reinicia o container
em laço**, quando a API está perfeitamente saudável e só o banco está fora —
exatamente no pior momento para perder os containers. Liveness responde sobre o
processo; quem responde sobre as dependências é o `/health/ready`, e ele já sabe
fazer isso.

Continua MÉDIO porque ainda não existe orquestrador (CRI-02), mas a correção
precisa entrar **antes** de existir um. Ver seção 1.3 do plano de correção.

---

#### MED-04 — O bundle estático estoura o orçamento do próprio CI

**Evidência**, medida na imagem de produção com a mesma conta que o CI faz:

```
du -sk .next/static     → 1316 KB
du -sk --apparent-size  → 1184 KB
soma real em bytes      → 1.117.610 (1091 KB)
```

O job `frontend` do CI reprova acima de **1024 KB**. Por qualquer uma das três
medidas, o orçamento está estourado — entre 6% e 29%.

Os cinco maiores pedaços somam 667 KB: `fd9d1056` (169 KB), `framework`
(137 KB), `117-...` (121 KB), `main` (114 KB) e `polyfills` (110 KB).

**Isto não é o mesmo número que `docs/ESTADO-ATUAL.md` reporta.** Lá estão 205 KB,
que é o **peso da página baixada** — outro orçamento (500 KB), e esse eu confirmei:

```
home em produção, com gzip: 233.540 bytes = 228 KB   ✅ dentro dos 500 KB
```

Os dois orçamentos existem no `CONTEXTO-DO-PROJETO.md` §6. O de página passa. O de
bundle estático não.

**Consequência prática de ter corrigido ALT-02:** com o CI ligado, **a primeira
execução deve ficar vermelha neste passo.** Não é regressão — é um limite que
nunca chegou a ser verificado.

---

#### MED-05 — Sem rollback de banco definido

Ver CRI-02. Não existe caminho automatizado de volta para uma migração. Os
comentários `-- ROLLBACK:` nos `.sql` são documentação, não mecanismo.

Como as 15 migrações atuais já estão aplicadas e o próximo deploy não traz
migração nova, o risco imediato é baixo. Ele passa a existir na primeira
migração publicada.

---

#### MED-06 — O cache do `Config::get` descarta o valor padrão de quem chama

> **Reclassificação.** Este item foi publicado na primeira versão deste relatório
> como BAI-05 ("`"service": null` no `/health`", cosmético). Ao detalhar a
> correção, a causa raiz se revelou um defeito no ponto mais central da
> configuração, e não um campo não preenchido. Promovido a MÉDIO.

**Evidência**, executada no container:

```
1) Config::get("CHAVE_INEXISTENTE")            = NULL
2) Config::get("CHAVE_INEXISTENTE", "padrao")  = NULL      ← deveria ser "padrao"

3) Config::get("OUTRA", "padrao")              = 'padrao'
4) Config::get("OUTRA")                        = 'padrao'  ← deveria ser NULL
```

`Config::get()` guarda em cache o **valor já resolvido**, incluindo o padrão de
quem chamou primeiro. A partir daí, o padrão pedido por qualquer outro chamador é
ignorado — nos dois sentidos.

**Como isso produz o `"service": null`.** O `Logger`, construído cedo porque o
`ErrorHandler` depende dele, chama `Config::get('APP_NAME')` **sem padrão**
(`Logger.php:44`). Isso grava `null` no cache. Depois, o `HealthController::live()`
chama `Config::get('APP_NAME', 'portifolio-api')` e recebe o `null` cacheado.

**Por que é MÉDIO.** O sintoma visível é um campo de monitoramento vazio. O
problema é a regra: **qual valor uma chave assume passa a depender da ordem em que
o código a lê**. Hoje atinge `APP_NAME`. Amanhã, alguém lê
`Config::get('ALGUM_TTL')` num caminho novo antes do
`Config::int('ALGUM_TTL', 900)`, e o padrão de segurança some — sem erro, sem
aviso e sem teste vermelho. É uma armadilha silenciosa no arquivo que toda a
aplicação consulta.

Correção detalhada na seção 1.4 do plano: cachear o que o **ambiente** disse
(incluindo "ausente"), e aplicar o padrão na leitura, não na gravação.

---

### 🔵 BAIXO

| ID | Problema | Evidência |
|---|---|---|
| BAI-01 | A imagem de produção da API carrega `tests/`, `phpunit.xml`, `phpstan.neon`, `infection.json5`, `coverage.xml`, `.phpunit.cache`, `.phpstan.cache` e `.php-cs-fixer.cache` | `docker run --entrypoint sh portifolio-api:homolog -c 'ls -a /app'`. Só `public/` é servido, então não é exploitável — é peso e superfície desnecessários. O `.dockerignore` não os exclui. |
| BAI-02 | O contraste da cor de destaque é **exibido**, nunca **exigido** | `PUT /api/v1/admin/settings {"cor_destaque":"#ffffff"}` → **200**. O servidor valida só o formato `#rrggbb`; o painel calcula a razão e a mostra, mas `disabled={!corOk}` bloqueia apenas formato inválido. Branco puro (1:1 no tema claro) é aceito. Só o dono alcança o painel, então é autoinfligido — mas `docs/ESTADO-ATUAL.md` diz "o contraste é medido antes de salvar", o que se lê facilmente como "é exigido". |
| BAI-03 | Resposta 429 sem cabeçalho `Retry-After` | O tempo vai só no corpo. Os cabeçalhos `RateLimit-*` saem nas respostas permitidas, mas somem no 429, que é justamente quando importam — o 429 sobe pelo caminho da exceção. |
| BAI-04 | Sem `.gitattributes` | Em máquina Windows com `core.autocrlf=true`, o Biome reprova `tsconfig.json` por CRLF. Não afeta o CI, mas custa tempo de quem desenvolve. Um `* text=auto eol=lf` resolve. |
| BAI-05 | ~~`APP_NAME` vazio → `/health` devolve `"service": null`~~ | **Promovido a MED-06** — a causa raiz é o cache do `Config::get`, não um campo não preenchido. |
| BAI-06 | Enumeração de volume de contas | O cadastro devolve o `id` sequencial do usuário (`862`). Permite estimar quantas contas existem. Sem consequência de acesso — os ids não autorizam nada. Some junto com a correção de MED-01. |

### ⚪ MELHORIA

- **A área administrativa inteira (Fase 6) não tem cobertura E2E.** Os 16
  cenários do Playwright cobrem páginas públicas, cadastro, confirmação, login,
  2FA e recuperação de senha. Nenhum toca `/admin`, `/admin/usuarios` ou
  `/admin/acessos`. Foram validados por HTTP nesta homologação, com token de
  admin real — mas nada impede uma regressão silenciosa amanhã.
- **A tabela `projects` tem 1 registro** e `site_settings` está vazia (usando os
  padrões do código). Correto por construção, mas vale saber que a seção de
  projetos publicada terá um item.

---

## 8. Correções realizadas

Duas. Ambas em infraestrutura, nenhuma em código de aplicação. Nenhum teste foi
alterado.

---

### 8.1 — CRI-01: `docker/web/Dockerfile` passa a receber as URLs no build

| | |
|---|---|
| **Problema** | A imagem `--target prod` congelava `http://127.0.0.1:8000` no bundle, `http://localhost:8000` na CSP e `http://localhost:3000` no sitemap, independentemente do que fosse passado em tempo de execução. |
| **Evidência** | Build limpo + `docker run` com as variáveis corretas: CSP, sitemap, robots e bundle continuaram com `localhost`. |
| **Causa** | `NEXT_PUBLIC_*` é substituído pelo Next **dentro do bundle, no build**. O estágio `build` não declarava `ARG` nenhum, e o compose só define essas variáveis em runtime sobre o alvo `dev`, onde o `next dev` as lê ao vivo — o que escondia o defeito. |
| **Solução** | `ARG` + `ENV` para `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_SITE_URL` no estágio `build`, **com padrão igual ao fallback que o código já usa** — para que um build sem argumento se comporte como antes, em vez de assar uma string vazia no lugar da URL. Comentário no arquivo explica o porquê e traz a linha de comando pronta. |
| **Arquivos** | `docker/web/Dockerfile` (+24 linhas, 0 removidas) |
| **Impacto** | Nenhum sobre o ambiente local: o compose usa o alvo `dev`, que o patch não toca. Builds de produção existentes precisam ser refeitos com os argumentos. |
| **Teste** | Rebuild com `--build-arg NEXT_PUBLIC_API_URL=https://api.gustavohsmachado.com.br --build-arg NEXT_PUBLIC_SITE_URL=https://gustavohsmachado.com.br` |
| **Resultado** | ✅ `connect-src 'self' https://api.gustavohsmachado.com.br` · `<loc>https://gustavohsmachado.com.br</loc>` · `Sitemap: https://gustavohsmachado.com.br/sitemap.xml` · bundle com a URL de produção e **sem** `127.0.0.1` |

---

### 8.2 — ALT-02: `.github/workflows/ci.yml` passa a disparar nas branches que existem

| | |
|---|---|
| **Problema** | O workflow disparava em `main` e `develop`. As branches se chamam `master` e `dev`. O CI nunca rodou. |
| **Evidência** | `actions/runs` da API do GitHub: `"total_count": 0`. |
| **Causa** | Nomes de branch do template original nunca ajustados aos nomes reais do repositório — que `CONTEXTO-DO-PROJETO.md` §2.2 documenta e justifica. |
| **Solução** | `pull_request.branches` e `push.branches` para `[master, dev]`. Comentário do topo corrigido de "main" para "master". |
| **Arquivos** | `.github/workflows/ci.yml` (3 linhas) |
| **Impacto** | A esteira passa a executar de verdade. **Espere a primeira execução vermelha** no passo de orçamento de bundle (MED-04) e possivelmente no Dependency Review (ALT-03). Isso é o gate funcionando, não uma regressão. |
| **Teste** | YAML reparseado com `yq`: `.on` correto, os 7 jobs íntegros (`commitlint`, `backend`, `frontend`, `e2e`, `performance`, `security`, `quality-gate`), nenhuma ocorrência de `main`/`develop` restante. |
| **Resultado** | ✅ Estrutura válida e preservada. Execução real depende de push, que não faço. |

---

### 8.3 — Alterações revertidas

`v2/frontend/package-lock.json` foi modificado como efeito colateral do
`npm audit` (104 linhas removidas, entradas `optional`/`peer` podadas).
**Restaurado com `git checkout --`.** Lockfile não se altera em homologação.

**`git status` ao final:**

```
 M .github/workflows/ci.yml
 M docker/web/Dockerfile
?? limpar-senha-do-historico.sh    (já existia antes, não versionado)
```

---

## 9. Testes após correção

| Suíte | Antes | Depois |
|---|---|---|
| PHPUnit | 48/48 ✅ | **48/48 ✅** |
| Vitest | 68/68 ✅ | **68/68 ✅** |
| TypeScript | 0 erros | **0 erros** |
| Build da imagem de produção da API | ✅ | ✅ |
| Build da imagem de produção do web | ✅ (com URLs erradas) | ✅ (com URLs corretas) |
| Stack local | de pé | **de pé, inalterada** |

Nenhuma regressão. As duas correções são de infraestrutura e não tocam o caminho
de execução da aplicação.

---

## 10. Segurança

### 10.1 O que foi atacado e resistiu

| Ataque | Como foi feito | Resultado |
|---|---|---|
| SQL Injection no login | `{"email":"admin@x.com' OR 1=1 -- "}` | 422 na validação, sem chegar ao SQL ✅ |
| SQL Injection no slug de projeto | `/api/v1/projects/' OR '1'='1` | 404, query preparada ✅ |
| JWT `alg: none` | Cabeçalho forjado, assinatura vazia | 401 ✅ |
| JWT com payload adulterado | `role: admin` + assinatura original | 401 ✅ |
| JWT expirado | Assinado corretamente, `exp` no passado | 401 ✅ |
| **JWT forjado com o segredo real** | `role: admin` para conta comum, assinado com o `JWT_SECRET` de verdade | **403** ✅ |
| Mass assignment no cadastro | `role`, `email_verified_at`, `id` no corpo | Ignorados; conta nasceu `user` ✅ |
| Mass assignment em `PUT /me` | `role`, `email`, `id` | Ignorados ✅ |
| Escalonamento horizontal | Conta comum em 2 rotas administrativas | 403 nas duas ✅ |
| Rota protegida sem token | 5 rotas | 401 ✅ |
| Injeção de cabeçalho de e-mail | `subject` com CRLF | PHPMailer recusa a quebra ✅ |
| Reuso de token de confirmação | Segunda apresentação | 410 ✅ |
| Reuso de código 2FA | Segunda apresentação | 401 ✅ |
| Reuso de refresh token | Token já rotacionado | Família revogada + auditoria ✅ |
| Bypass de rate limit | 8 chamadas em `/api/v1/messages` (limite de produção, 5/h) | 429 a partir da 6ª ✅ |
| Vazamento de stack trace | `APP_ENV=production` **com** `APP_DEBUG=true`, banco caído | Mensagem genérica; **debug não vaza em produção nem quando ligado por engano** ✅ |
| Vazamento no `/admin` sem sessão | HTML da rota administrativa | Nenhum dado ✅ |

O teste do JWT forjado merece destaque: mesmo de posse do segredo de assinatura —
o pior cenário realista —, o `RequireAdmin` barrou, porque a segunda condição
(`ADMIN_EMAIL`) vive no arquivo do servidor e é conferida contra o **banco**, não
contra as claims. A defesa em profundidade documentada funciona de verdade.

### 10.2 Cabeçalhos

**API** (todas as respostas, inclusive erros):
`X-Content-Type-Options: nosniff` · `X-Frame-Options: DENY` ·
`Referrer-Policy: no-referrer` · `Permissions-Policy` ·
`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` ·
`Cache-Control: no-store` · `Strict-Transport-Security` (quando
`APP_FORCE_HTTPS`) · `X-Powered-By` **ausente** na imagem de produção.

**Frontend:** CSP completa, `nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`.
`'unsafe-eval'` cai fora em produção — confirmado na imagem.
**Sem HSTS no frontend** — precisa vir do proxy reverso (ver CRI-02).

### 10.3 CORS

Allowlist explícita, nunca `*`. Origem não autorizada não recebe cabeçalho
algum. **Respostas de erro carregam CORS** — confirmado no 401.
Preflight responde 204 sem consumir cota.

### 10.4 Cookies

`portifolio_refresh`: `HttpOnly` ✅ · `SameSite=Strict` em produção (`Lax` só em
`local`) ✅ · `Secure` controlado por `APP_SECURE_COOKIES` ✅ · sem atributo
`Domain` (cookie de host) ✅ · 30 dias.

⚠️ **Verificar no deploy:** com `SameSite=Strict`, front e API precisam
compartilhar o mesmo domínio registrável (`exemplo.com.br` e
`api.exemplo.com.br` servem; domínios distintos, não). Como não há configuração
de produção (CRI-02), não há o que conferir ainda.

### 10.5 Segredos e logs

- `.env` **nunca foi versionado** — confirmado com `git log --all -- .env` (vazio).
- `.gitignore` cobre `.env`, `.env.local`, `.env.*.local`.
- Nenhum segredo na imagem de produção da API.
- Nenhum `password_hash` fora de `Support\Hash`.
- **Logs limpos:** o `Logger` redige 12 chaves sensíveis e mascara e-mail
  (`h*****************@example.com`). Em 1.687 registros de auditoria e em todo o
  log inspecionado, nenhuma senha, token ou cookie.
- **Exceção grave: ALT-01**, o segredo no histórico público.

---

## 11. Banco de dados

| Verificação | Resultado |
|---|---|
| Conexão | ✅ PDO, `/health/ready` em 0,4–0,9ms |
| Migrações | ✅ 15 aplicadas, 0 pendentes, idempotentes |
| Estrutura | ✅ 15 tabelas, todas InnoDB `utf8mb4_unicode_ci` |
| Chaves estrangeiras | ✅ 5, com `ON DELETE CASCADE` nas dependentes e `SET NULL` no `audit_log` |
| Índices | ✅ 43, incluindo compostos (`status,created_at`, `published,position`, `user_id,created_at`) |
| Constraints únicas | ✅ e-mail, slug, `token_hash`, `bucket_key`, `(user_id,purpose)`, `(user_id,document,version)` |
| Integridade referencial | ✅ nenhum órfão |
| Transações | ✅ cadastro, confirmação, 2FA, reset e troca de senha são atômicos |
| Rollback de transação | ✅ o e-mail sai **depois** do commit, de propósito, para não segurar linhas travadas |
| Queries preparadas | ✅ zero concatenação de entrada em SQL |
| `SELECT *` em listagem | ✅ nenhum |
| N+1 | ✅ nenhum encontrado |
| Expurgo | ✅ `purge.php` funciona, com dry-run |
| Compatibilidade com o banco de produção | ⚠️ não verificável — não há banco de produção definido (CRI-02) |

**Uma decisão de modelagem que merece registro pelo acerto:** `User::softDelete`
anonimiza em vez de só marcar. Reescreve e-mail e nome e apaga o telefone junto
com o `deleted_at`. Sem isso, o endereço ficaria preso pela constraint única para
sempre e o dado pessoal de quem pediu para sair continuaria no banco.

**Nenhum schema foi alterado.** As únicas escritas foram dados de teste, todos
removidos ao final (seção 22).

---

## 12. Performance

| Métrica | Medido | Orçamento | OK |
|---|---|---|---|
| `/health` | 30ms (média de 5) | — | ✅ |
| `/health/ready` (com banco) | 30ms | — | ✅ |
| `/api/v1/content` | 37ms, 7,3 KB | — | ✅ |
| `/api/v1/admin/content` | 78ms, 8,2 KB | — | ✅ |
| `/api/v1/admin/audit` | 45ms, 25 KB | — | ✅ |
| Home em produção (HTML) | 89ms, 12 KB | — | ✅ |
| **Peso da home, com gzip** | **228 KB** | 500 KB | ✅ |
| Peso da home, sem compressão | 650 KB | — | — |
| **Bundle estático (`.next/static`)** | **1091–1316 KB** | 1024 KB | ❌ **MED-04** |
| Source maps em produção | 0 arquivos | — | ✅ |

**Não medido:** nota do Lighthouse, LCP, FCP, CLS e TBT. Exigem o `@lhci/cli` e um
ambiente de produção real. O job `performance` do CI os cobre — e, com ALT-02
corrigido, passará a rodar em PR.

Nenhuma otimização foi feita. Nenhum problema de performance com impacto real foi
encontrado além do orçamento de bundle, que é limite autoimposto e não sintoma.

---

## 13. Responsividade

Medida no navegador, não por impressão.

| Viewport | Rolagem horizontal | Observação |
|---|---|---|
| 320 × 800 (mínimo) | **nenhuma** (`scrollWidth == clientWidth`) | ✅ |
| 375 × 812 (mobile) | nenhuma | ✅ |
| 1280 × 900 (desktop) | nenhuma | ✅ |

Os dois elementos que ultrapassam a largura no 320px são o brilho decorativo e a
faixa de texto rolante — ambos contidos por `overflow: hidden`, comprovado pelo
`scrollWidth` igual ao `clientWidth`.

**Alvos de toque:** todos os controles interativos com 44px ou mais. A única
exceção (32px) é o campo-armadilha do formulário de contato, que fica fora da
tela e dentro de um `aria-hidden="true"` — verificado no DOM.

**Modo claro:** presente na home e nas telas de acesso, com botão em posição
consistente. A paleta clara escurece o tom de destaque em HSL para não deixar os
links ilegíveis sobre branco — decisão correta e testada em `cores.test.ts`.

**E2E:** o perfil `mobile` (16 cenários) e o `reduced-motion` (16 cenários)
passam integralmente. `prefers-reduced-motion` é respeitado.

---

## 14. Configuração de produção

| Item | Situação |
|---|---|
| `APP_DEBUG = OFF` em produção | ✅ e melhor: `Config::isDebug()` exige `APP_DEBUG && !isProduction()`. **Testado:** `APP_ENV=production` + `APP_DEBUG=true` **não** vaza stack trace |
| `display_errors=Off`, `expose_php=Off` | ✅ na imagem `prod` da API |
| Opcache com `validate_timestamps=0` | ✅ |
| Usuário sem privilégio | ✅ `www-data` na API, `nextjs` no web |
| Segredos fora do código | ✅ tudo em `.env`, `Config::assertRequired` falha rápido no boot |
| `JWT_SECRET` com mínimo de 32 caracteres | ✅ imposto em runtime |
| Nenhuma credencial no repositório | ❌ **ALT-01** |
| `.env` de produção documentado | ❌ **CRI-02** — o `.env.example` só cobre o compose local |
| `docker-compose` de produção | ❌ **CRI-02** — não existe |
| Servidor web na frente do php-fpm | ❌ **CRI-02** — não existe |
| `TRUSTED_PROXIES` | ❌ **CRI-02** — vazio; atrás de proxy, o rate limit vira um balde único |
| CORS de produção | ⚠️ código correto, valor não definido |
| HTTPS / HSTS | ⚠️ API tem, front depende do proxy que não existe |
| Timezone | ✅ `docker/mysql/init/01-timezone.sql`; API usa `DATETIME` + `NOW()` consistentemente |
| Cron de expurgo | ⚠️ documentado (`0 4 * * *`), **não agendado** |
| Sentry / OpenTelemetry | ✅ preparados, ativam por variável de ambiente |
| Uploads | ✅ não aplicável — o sistema não recebe arquivo |

---

## 15. Deploy

### 15.1 O que foi simulado

| Passo | Resultado |
|---|---|
| Build da imagem de produção da API (`--target prod`) | ✅ |
| Inspeção da imagem: sem `.env`, sem binários de dev | ✅ (com a ressalva BAI-01) |
| Subida da API com ambiente de produção | ✅ |
| Smoke: `/health`, `/health/ready`, `/api/v1/content` | ✅ |
| HSTS presente, `X-Powered-By` ausente | ✅ |
| Comportamento com banco caído | ⚠️ 500 em vez de 503 (MED-03), **sem vazar trace** ✅ |
| Build da imagem de produção do web (`--target prod`) | ✅ |
| **Verificação das URLs no artefato publicável** | ❌ → 🛠️ corrigido → ✅ |
| Rebuild com as URLs de produção | ✅ CSP, sitemap, robots e bundle corretos |
| Instalação/configuração do servidor | ❌ **não existe o que executar** |
| Publicação | ❌ **não existe procedimento** |
| Rollback | ❌ **não existe procedimento** |

### 15.2 Rollback

**Não definido.** Registro o que existe hoje:

- **Aplicação:** as imagens são versionáveis por tag; voltar é subir a tag
  anterior. Não há automação, nem tag definida.
- **Banco:** sem mecanismo. Ver MED-05.
- **Repositório:** a `master` guarda o estado anterior. Se o histórico for
  reescrito (ALT-01), o script gera um bundle completo antes.

---

## 16. Logs e monitoramento

| Item | Situação |
|---|---|
| Formato | ✅ JSON estruturado (Monolog + `JsonFormatter`) |
| Destino | ✅ `php://stdout` por padrão — o certo para container |
| Nível configurável | ✅ `LOG_LEVEL`, com queda segura para `info` se digitado errado |
| Log de erro | ✅ com método, path, `user_id`, classe, arquivo e linha |
| Log de autenticação | ✅ login, senha errada, código recusado, reuso de sessão, logout |
| Auditoria de operações críticas | ✅ `audit_log`, **14 tipos de evento observados** em 1.687 registros |
| Timestamp | ✅ ISO 8601 com fuso |
| **Ausência de segredo** | ✅ 12 chaves redigidas, e-mail mascarado |
| Stack trace para o cliente | ✅ nunca em produção |
| Retenção | ✅ expurgo apaga auditoria com mais de 180 dias |
| **Correlação por `request_id`** | ❌ **MED-02** — o cabeçalho sai, o log não recebe |
| Sentry | ✅ integrado, `send_default_pii: false` |

A trilha de auditoria é o ponto mais forte da observabilidade — e o falso
positivo de ALT-04 é o que mais a ameaça.

---

## 17. Dependências

| Verificação | Resultado |
|---|---|
| `composer.lock` presente e coerente | ✅ |
| `package-lock.json` presente e coerente | ✅ (restaurado — ver 8.3) |
| `composer audit` | ✅ **0 advisories** |
| `roave/security-advisories` | ✅ presente em `require-dev` |
| `npm audit --omit=dev` | ❌ **2 HIGH** (ALT-03) |
| `npm audit` (com dev) | ⚠️ 17 (2 críticas, 4 altas) — cadeia do Stryker/Knip, não vai para produção |
| Dependências não utilizadas | ✅ Knip limpo |
| Compatibilidade de versões | ✅ PHP 8.3/8.4 na matriz do CI; Node 20 |
| Imagem do Playwright alinhada ao `package.json` | ✅ E2E roda |

**Nenhuma dependência foi atualizada**, conforme a regra da homologação.

---

## 18. Resultado final

| | |
|---|---|
| Funcionalidades mapeadas | **34** |
| Aprovadas | **28** |
| Aprovadas com ressalva | **3** |
| Reprovadas | **3** |
| Não testadas | **1** |
| Verificações automatizadas executadas | **196** (48 + 68 + 80) |
| Verificações automatizadas aprovadas | **196** |
| Verificações automatizadas reprovadas | **0** |
| Testes manuais dirigidos | **87 requisições + 1 sessão de UI + 2 simulações de deploy** |
| Problemas encontrados | **17** |
| Críticos | **2** |
| Altos | **4** |
| Médios | **6** |
| Baixos | **5** |
| **Corrigidos nesta homologação** | **2** (1 crítico, 1 alto) |
| **Pendentes** | **15** |
| Alterações realizadas | **2 arquivos, 27 linhas** |
| Testes alterados | **0** |
| Dependências alteradas | **0** |
| Schema alterado | **0** |

---

## 19. Pendências e riscos conhecidos

### Bloqueiam a publicação

| ID | Item | Ação |
|---|---|---|
| **CRI-02** | Sem configuração de produção, sem deploy, sem rollback | Criar `docker-compose.prod.yml`, o servidor web na frente do php-fpm, documentar as variáveis de produção no `.env.example`, definir como as migrações rodam no deploy, definir o rollback e agendar o cron do expurgo |
| **ALT-01** | Segredo real na branch pública | **Risco aceito pelo dono em 29/08/2026.** Resta decidir o Gitleaks: limpar o histórico ou registrar a exceção em `.gitleaksignore`, senão o job `security` reprova em toda execução 

### Precisam de decisão antes ou logo após a publicação

| ID | Item | Prioridade |
|---|---|---|
| **ALT-03** | `next@14.2.35` com advisories HIGH alcançáveis (DoS por RSC) | Planejar a subida para o Next 16 como mudança controlada |
| **ALT-04** | Duas abas derrubam a sessão e envenenam a auditoria de "sessão comprometida" | Elevar B51 de P3; janela de tolerância na rotação, do lado do servidor |
| **MED-01** | Enumeração de contas por código de status no cadastro | 201 genérico nas duas pontas |
| **MED-04** | Bundle estático acima do orçamento do próprio CI | Vai aparecer vermelho na primeira execução do CI corrigido |

### Entram junto com o deploy, porque precisam estar dentro da imagem publicada

| ID | Item | Esforço |
|---|---|---|
| **MED-03** | Tirar `/health*` do rate limit — hoje a sonda de liveness cai junto com o banco | 15min |
| **MED-06** | Cache do `Config::get` descartando o padrão de quem chama | 20min |

### Podem esperar

MED-02 (`request_id` nos logs), MED-05 (rollback de migração), BAI-01 a BAI-04,
BAI-06, e a cobertura E2E da área administrativa.

> O passo a passo de cada um destes itens — onde mexer, o código, como validar e
> qual o risco — está em [`plano-de-correcao.md`](plano-de-correcao.md).

### Riscos conhecidos e aceitos

1. **`REGISTRATION_ENABLED=true` traz dado pessoal de terceiros.** Consciente e
   documentado. O aceite versionado (`legal_acceptances`) e o expurgo existem por
   isso. **Mas:** os Termos e a Política continuam como minutas "pendentes de
   revisão jurídica". Publicar cadastro aberto com minuta é risco de conformidade,
   não técnico.
2. **Banco como ponto único de falha.** Com o banco fora, tudo devolve 500 —
   inclusive conteúdo público — porque o rate limiter toca o banco em toda
   requisição. É consequência aceita da escolha de não usar Redis, e a escolha
   está justificada no código.
3. **A v1 continua no repositório.** Congelada e não servida por container
   nenhum. Se o repositório inteiro for publicado num servidor com PHP, os 20
   arquivos na raiz da `v1/` passam a responder. O `docs/ESTADO-ATUAL.md` já
   avisa; repito aqui porque o deploy ainda não está definido e essa decisão
   ainda pode ser tomada errado.
4. **A primeira execução do CI deve ficar vermelha** (MED-04). É o gate
   funcionando pela primeira vez.

---

## 20. Checklist final

| Item | Situação |
|---|---|
| Arquitetura validada | ✅ |
| Funcionalidades validadas | ⚠️ 28 de 34 sem ressalva |
| Regressão validada | ✅ 196/196 automatizadas, nenhuma regressão |
| Autenticação validada | ✅ |
| Autorização validada | ✅ inclusive contra token forjado com o segredo real |
| Segurança validada | ⚠️ aplicação sólida; **ALT-01 pendente** |
| Banco validado | ✅ estrutura, integridade e transações |
| APIs validadas | ✅ 39 rotas, sucesso e erro |
| Frontend validado | ✅ |
| Responsividade validada | ✅ 320px a 1280px, sem rolagem horizontal |
| Performance validada | ⚠️ tempos ótimos; **orçamento de bundle estourado** |
| Testes automatizados executados | ✅ 196/196 |
| Integrações validadas | ✅ SMTP real e captura; Mailpit; Sentry preparado |
| Logs validados | ⚠️ sem segredo e bem estruturados; **sem `request_id`** |
| Dependências validadas | ❌ **2 HIGH em produção** |
| Configuração de produção validada | ❌ **não existe** |
| Deploy validado | ❌ **build sim, publicação não** |
| Rollback validado | ❌ **não definido** |
| Smoke test aprovado | ⚠️ 15 de 16 passos |
| Nenhum problema crítico pendente | ❌ **CRI-02 em aberto** |
| Nenhum problema de segurança crítico pendente | ⚠️ **ALT-01 em aberto** |
| Relatório final preenchido | ✅ |

---

## 21. Smoke test final

Executado contra a stack local, pela interface e pela API.

| Passo | Resultado |
|---|---|
| Abrir a aplicação | ✅ home em 89ms |
| Cadastro pela tela | ✅ |
| Confirmação de e-mail pelo link | ✅ |
| Login — senha | ✅ nenhum token emitido no passo 1 |
| Login — código de 7 dígitos | ✅ campo nasce vazio (correção de `3595e5e` verificada) |
| Acesso ao painel | ✅ `/painel` com nome e dados corretos |
| Recarregar a página (F5) | ✅ sessão mantida |
| **Duas abas simultâneas** | ❌ **sessão derrubada** (ALT-04) |
| Consulta — conteúdo público | ✅ |
| Consulta — projetos com sessão | ✅ |
| Criação de registro — mensagem de contato | ✅ gravada e notificada |
| Edição — ajustes do site | ✅ salvou e restaurou |
| Exclusão — conta pelo painel admin | ✅ anonimiza em vez de apagar |
| Integrações críticas — SMTP | ✅ real e captura, com desvio por domínio reservado |
| Logout | ✅ família revogada, cookie limpo |
| Rota protegida após logout | ✅ 401 |

**Um único passo crítico falhou: a sessão com duas abas.** Não é perda de dado
nem falha de autorização — é perda de sessão com necessidade de refazer o 2FA.

---

## 22. Aprovação para produção

### Recomendação

**O código não é o problema.**

A aplicação resistiu a tudo o que foi apontado contra ela. SQL injection, JWT
forjado — inclusive com o segredo real —, mass assignment, escalonamento de
privilégio, reuso de token, bypass de rate limit, vazamento de stack trace com
debug ligado por engano em produção: **nada passou**. As 196 verificações
automatizadas estão verdes sem que um único teste tenha sido tocado. O banco tem
chave estrangeira, índice composto e transação onde precisa. Os logs não vazam
segredo. A anonimização na exclusão de conta e a trava dupla do `ADMIN_EMAIL` são
decisões de quem pensou no problema, não de quem seguiu tutorial.

**O que falta é tudo o que vem depois do código.**

Não existe ambiente de produção definido, não existe procedimento de publicação,
não existe rollback, e o único artefato publicável que existia saía quebrado de
um jeito que só apareceria depois de no ar — corrigido aqui, mas o resto não. A
esteira de qualidade que o projeto documenta em detalhe **nunca executou uma
única vez**, o que explica por que uma senha real segue visível na branch pública
que o próprio projeto chama de produção.

Publicar hoje significaria subir para um lugar não definido, por um caminho não
escrito, sem volta planejada. Não é uma questão de rigor: **é que não há o que
executar.**

### Para chegar ao aprovado

1. **Definir o destino e escrever o deploy** (CRI-02) — compose de produção,
   servidor web na frente do php-fpm, variáveis de produção no `.env.example`,
   `TRUSTED_PROXIES` preenchido, migrações no ciclo de deploy, cron do expurgo
   agendado, rollback escrito.
2. **Fechar o segredo público** (ALT-01) — confirmar a revogação e rodar a
   limpeza do histórico.
3. **Deixar o CI rodar e ficar verde** — inclusive resolvendo o orçamento de
   bundle (MED-04) e decidindo sobre o Next (ALT-03).
4. **Repetir o smoke test no ambiente de produção real**, com CRI-01 já corrigido.

Nada disso é reconstrução. É a última etapa — a que transforma um sistema pronto
num sistema publicável. Feitos os quatro, a recomendação vira aprovação sem
ressalva: **o que está construído merece ir para o ar.**

### Encerramento e restauração do ambiente

O ambiente foi restaurado ao estado em que foi encontrado:

- 30 contas de teste removidas — 25 da suíte E2E via `purge.php --test-data`, 5
  criadas por esta homologação.
- Containers e imagens de simulação de produção apagados.
- `package-lock.json` restaurado.
- Schema do banco intocado; nenhuma migração aplicada ou revertida.
- Stack local de desenvolvimento no ar e funcionando.

Restam no banco apenas a conta do administrador e a mensagem de contato que já
existia antes — mais a mensagem de teste declarada na seção 3.

**Assinatura desta homologação:** as duas alterações listadas na seção 8 são as
únicas feitas no repositório. Estão sem commit, para revisão antes de entrarem.
