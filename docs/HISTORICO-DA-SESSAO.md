# Histórico da sessão — Portifolio

Registro completo do que foi **pedido**, **decidido**, **feito** e **o que falta**.
Documento de progresso: serve para retomar o trabalho depois, e para qualquer
agente ou pessoa entender como o projeto chegou ao estado atual.

**Data:** 08–09 de agosto de 2026
**Responsável:** Gustavo Henrique Santos Machado
**Repositório:** github.com/GustavoHSMachado/Portifolio

---

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [Linha do tempo](#2-linha-do-tempo)
3. [O que foi pedido](#3-o-que-foi-pedido)
4. [Decisões tomadas](#4-decisões-tomadas)
5. [O que foi entregue](#5-o-que-foi-entregue)
6. [Achados de segurança na v1](#6-achados-de-segurança-na-v1)
7. [Bugs encontrados durante a construção](#7-bugs-encontrados-durante-a-construção)
8. [Verificações executadas](#8-verificações-executadas)
9. [Limitações e o que não foi validado](#9-limitações-e-o-que-não-foi-validado)
10. [Backlog de Issues](#10-backlog-de-issues)
11. [Pendências que dependem de você](#11-pendências-que-dependem-de-você)
12. [Próximos passos sugeridos](#12-próximos-passos-sugeridos)
13. [Mapa de arquivos](#13-mapa-de-arquivos)

---

## 1. Resumo executivo

O projeto começou como um portfólio em PHP procedural com **5 vulnerabilidades
críticas**, entre elas senhas em texto plano e um fluxo de redefinição que
permitia assumir qualquer conta sabendo apenas o e-mail.

A sessão produziu três resultados:

| | Resultado |
|---|---|
| **v1 (legado)** | 22 findings de segurança diagnosticados; todas as falhas críticas de código corrigidas |
| **v2 (novo)** | Arquitetura completa: API REST em PHP 8.3 com MVC próprio + frontend Next.js 14, com autenticação moderna, design system e esteira de qualidade |
| **Processo** | Padrão obrigatório de Issues e Pull Requests, 25 issues prontas para criação, CI com quality gate e ambiente local em Docker |

**Números finais**

| Métrica | Valor |
|---|---|
| Arquivos criados na v2 | 108 |
| Linhas de PHP (backend) | 3.627 |
| Linhas de TypeScript | 3.427 |
| Linhas de CSS | 1.917 |
| Linhas de SQL (migrations) | 121 |
| Migrations | 6 |
| Rotas da API | 12 |
| Telas do frontend | 9 |
| Componentes de UI | 6 |
| Testes automatizados | 4 suítes (unit + integração) |
| Issues no backlog | 25 |

---

## 2. Linha do tempo

| # | Você pediu | Eu entreguei |
|---|---|---|
| 1 | "Vamos buscar o projeto no meu GitHub" | Repositório clonado e copiado para a pasta local |
| 2 | "Rode os agentes" (pasta `Agentes/`) | 17 perfis de agente lidos; acionados 13, 02, 03, 06, 05 e 15 |
| 3 | Modernizar/refatorar + relatório e correções | 22 findings diagnosticados, críticos corrigidos, `RELATORIO-REFATORACAO.md` |
| 4 | "Vamos criar a v2 do zero" + Issues/PRs + motion + esteira | Monorepo v2 completo, CI, docs, scripts de automação |
| 5 | "Reorganize os arquivos na estrutura correta" | Raiz limpa: `v1/`, `v2/`, `docs/`, `docker/`, `.github/` |
| 6 | "Faça os três" + Docker | Telas de auth, conteúdo migrado, minutas legais e stack Docker |
| 7 | "Gere um .md com tudo" | Este documento |

---

## 3. O que foi pedido

### 3.1 Pedido original (rodada 3)

> "Vamos refatorar tudo, criar v2 com arquitetura MVC, models de segurança,
> controle de senha, recuperação de senha, envio de token para confirmação e
> troca de senha, middleware de segurança. Aproveitar só o texto e a fonte, o
> resto do zero em PHP mais atual e REST no front."

### 3.2 Processo

- Criar Issues no GitHub separadas em **Correção**, **Melhoria** ou **Nova função**.
- Trabalhar com Pull Requests para gerenciar entregas e deploys.
- Todo PR deve conter: Issue relacionada, o que mudou, como foi validado, riscos/limitações/próximos passos.
- Atualizar o `.md` de contexto para que qualquer agente considere esse padrão.

### 3.3 Interface e movimento

- Lazy loading quando fizer sentido
- Skeleton screens
- Animações suaves de entrada e saída
- Estados de progresso em elementos interativos
- Feedback visual para ações
- Transições consistentes entre telas, cards, modais e listas
- Revisão final como designer de produto sênior

### 3.4 Esteira de qualidade

Observabilidade (Sentry, Datadog, New Relic, OpenTelemetry) · Lint (arch-contract,
Biome, Commitlint, Knip, Stryker) · Testes (unit, integração, E2E, Codecov,
Playwright, Endtest) · Segurança (rate limit, revisão, performance budget,
separação back/front, termos e privacidade) · Arquitetura (sem overengineering,
sem gargalos, componentizar, DRY com critério, não reconstruir o que existe).

### 3.5 Pedidos posteriores

- Reorganizar os arquivos na estrutura correta.
- Telas de autenticação restantes + migrar conteúdo + documentos legais.
- Preparar tudo para rodar localmente em Docker.

---

## 4. Decisões tomadas

### 4.1 Escolhas que você fez

| Pergunta | Sua resposta |
|---|---|
| Objetivo sobre a v1 | Modernizar/refatorar, com relatório **e** correções no código |
| Frontend | **Next.js + TypeScript** |
| Backend | **MVC próprio, PHP 8.3, PSR-4** |
| Escopo | **Fundação completa primeiro**, telas restantes por PR |
| Issues no GitHub | **Eu preparo, você executa** — com passo a passo detalhado |
| Legado | Mover para **`v1/`** |
| Documentos | Centralizar em **`docs/`** |

### 4.2 Decisões técnicas e o porquê

| Decisão | Motivo | Alternativa descartada |
|---|---|---|
| PDO em vez de mysqli | API consistente, exceções nativas, portabilidade | Manter mysqli — perpetua tratamento de erro manual |
| Container de DI próprio (~80 linhas) | É o que este projeto precisa | Symfony DI — complexidade sem benefício hoje |
| Access token JWT em memória + refresh em cookie httpOnly | XSS não consegue sessão persistente | Token em localStorage — vazaria em qualquer XSS |
| Refresh rotativo com detecção de reuso por família | Token roubado derruba a sessão inteira ao ser reapresentado | Refresh estático — roubo passa despercebido |
| Argon2id com fallback bcrypt | Resistente a ataque por hardware dedicado | bcrypt puro — aceitável, mas inferior |
| Rate limit em MySQL, janela fixa | Projeto não tem Redis; resolve o caso real (força bruta) | Redis sliding window — infra extra sem tráfego que justifique |
| Mailpit no Docker | Testar e-mail sem configurar SMTP nem enviar de verdade | SMTP real em dev — risco de enviar para endereço errado |
| Aceite legal versionado em tabela própria | LGPD art. 8º exige consentimento **demonstrável** | Booleano "aceitou" — não prova a qual texto |
| Tokens guardados como hash SHA-256 | Dump do banco não permite usar os tokens | Token em claro — vazamento vira acesso |
| Manter nomes de arquivo da v1 na correção | Não quebra links, favoritos nem histórico do Git | Reestruturar já — risco desnecessário na fase 1 |

### 4.3 Princípios aplicados

**Evitar overengineering** — o container de DI tem 80 linhas; o Env loader, 50.
Nenhum framework pesado onde não há benefício demonstrável hoje.

**Evitar gargalos** — índices em toda coluna consultada, sem N+1, sem `SELECT *`
em listagem.

**Componentizar desde o início** — `Button`, `Input`, `Checkbox`, `Modal`,
`Toast`, `Skeleton` criados antes das telas que os usam.

**DRY com critério** — duplicar duas vezes é aceitável; na terceira, abstrair.
Abstração errada custa mais que a duplicação que evitou.

**Não reconstruir o que existe** — regra escrita no `CONTEXTO-DO-PROJETO.md`
com a lista dos componentes já disponíveis.

---

## 5. O que foi entregue

### 5.1 v1 — legado corrigido

| Item | Estado |
|---|---|
| `bootstrap.php` — sessão endurecida, headers, autoload | ✅ |
| `src/` — Env, Database (PDO), Auth, Csrf, Mailer, PasswordReset, Validator | ✅ |
| Senhas em hash + script de migração das existentes | ✅ |
| Reset de senha com token de uso único | ✅ |
| SQL Injection corrigido | ✅ |
| CSRF em todos os formulários | ✅ |
| XSS: helper `e()` em toda saída dinâmica | ✅ |
| RBAC no painel admin | ✅ |
| Migrations com rollback documentado | ✅ |
| `v1/README.md` marcando os limites do legado | ✅ |

### 5.2 v2 — backend (API REST, PHP 8.3)

**Núcleo (`src/Core/`)**

- `App` — kernel, monta container e rotas
- `Router` — roteamento com parâmetros e pipeline de middleware
- `Container` — DI com autowiring por reflexão
- `Request` / `Response` — HTTP encapsulado; nenhum controller toca `$_POST`
- `Config` — falha rápido no boot se faltar segredo obrigatório
- `HttpException` — erros esperados viram resposta; o resto vira 500 genérico

**Middlewares (`src/Http/Middleware/`)**

`RequestId` (correlation id) · `ErrorHandler` · `SecurityHeaders` · `Cors`
(allowlist, nunca `*`) · `RateLimit` (persistente, limites apertados em auth) ·
`Authenticate` · `RequireRole` / `RequireAdmin` · `RequireVerifiedEmail`

**Models (`src/Models/`)**

`User` · `VerificationToken` · `RefreshToken` · `LegalAcceptance`

**Services (`src/Services/`)**

`AuthService` (registro, login, refresh, reset, troca de senha) · `TokenService`
(JWT) · `RateLimiter` · `MailService`

**Suporte (`src/Support/`)**

`Hash` (Argon2id + `burn()` anti-timing) · `Validator` (política de senha alinhada
ao NIST SP 800-63B) · `Logger` (JSON, redação automática de segredos)

**Rotas**

```
GET   /health
GET   /health/ready
POST  /api/v1/auth/register
POST  /api/v1/auth/login
POST  /api/v1/auth/refresh
POST  /api/v1/auth/logout
POST  /api/v1/auth/verify-email
POST  /api/v1/auth/resend-verification
POST  /api/v1/auth/forgot-password
POST  /api/v1/auth/reset-password
POST  /api/v1/auth/change-password   (autenticado)
GET   /api/v1/me                     (autenticado)
PUT   /api/v1/me                     (autenticado + e-mail verificado)
```

**Migrations**

`users` · `verification_tokens` · `refresh_tokens` · `rate_limits` ·
`audit_log` · `legal_acceptances`

### 5.3 v2 — frontend (Next.js 14 + TypeScript)

**Design system**

- `tokens.css` — cor, espaço, tipografia, forma, sombra, duração e curva.
  **Open Sans e o laranja Namari preservados da v1**, por decisão sua.
- `motion.ts` — vocabulário de movimento: variantes, durações, curvas,
  orquestração de listas com limite de tempo total.

**Componentes**

| Componente | Destaque |
|---|---|
| `Button` | Loading preserva a largura (nada salta); check animado no sucesso |
| `Input` | Rótulo sempre visível, erro com altura animada, revelar senha |
| `Checkbox` | Input nativo preservado — teclado e leitor de tela funcionam |
| `Modal` | Escape, focus trap, foco retorna ao gatilho, scroll sem "pulo" |
| `Toast` | Erro dura mais que sucesso; `role` conforme a severidade |
| `Skeleton` | Shimmer em `transform`; larguras irregulares no texto |
| `PageTransition` / `Reveal` | Transição entre rotas e revelação no scroll |

**Telas**

```
/                              home com o conteúdo migrado
/entrar                        login
/criar-conta                   cadastro com aceite dos termos
/confirmar-email               confirmação por token
/recuperar-senha               solicitar redefinição
/redefinir-senha               nova senha, com medidor de força
/painel                        perfil e troca de senha
/legal/termos-de-uso
/legal/politica-de-privacidade
```

**Bibliotecas próprias**

- `lib/api.ts` — cliente HTTP; refreshes concorrentes compartilham uma promise
  (dois refreshes em paralelo seriam lidos como reuso e derrubariam a sessão)
- `hooks/useAuth.tsx` — sessão resolvida antes do primeiro render; renovação
  agendada 60s antes de expirar
- `lib/content.ts` — conteúdo do portfólio migrado da v1
- `lib/legal.ts` — versões vigentes dos documentos

### 5.4 Ambiente local (Docker)

| Serviço | Porta | O que é |
|---|---|---|
| `web` | 3000 | Next.js com hot reload |
| `api` | 8000 | PHP com hot reload e Xdebug |
| `mailpit` | 8025 | Caixa de e-mail falsa — nada sai de verdade |
| `adminer` | 8080 | Cliente do banco |
| `db` | 3307 | MySQL 8 (3307 evita conflito com instalação local) |

Migrations aplicadas automaticamente no boot pelo entrypoint. Dockerfiles com
estágio `prod` separado — sem Composer, sem Xdebug, usuário sem privilégio.

`Makefile` com 20 atalhos (`make help` lista todos).

### 5.5 Esteira de qualidade

| Etapa | Ferramenta | Bloqueia? |
|---|---|---|
| Padrão de commit | Commitlint | ✅ |
| Lint e formatação (front) | Biome | ✅ |
| Tipos | TypeScript strict | ✅ |
| Código morto | Knip | ✅ |
| Estilo (back) | PHP-CS-Fixer | ✅ |
| Análise estática | PHPStan nível 8 | ✅ |
| Testes unitários | PHPUnit + Vitest | ✅ |
| Testes de integração | PHPUnit | ✅ |
| E2E | Playwright (5 navegadores, inclui reduced-motion) | ✅ |
| Cobertura | Codecov | ⚠️ informativo |
| Mutação | Stryker | ⚠️ informativo |
| Segredos | Gitleaks | ✅ |
| Vulnerabilidades | CodeQL + Dependency Review + `composer audit` | ✅ (severidade alta) |
| Performance | Lighthouse CI | ✅ em PR |
| Bundle | Script de orçamento | ✅ |

Tudo consolidado no job **Quality Gate**, que reprova o merge se qualquer job
falhar.

**Orçamento de performance:** LCP < 2,5s · FCP < 1,8s · CLS < 0,1 · TBT < 200ms ·
bundle < 1MB · página < 500KB.

**Ferramentas pedidas que não foram incluídas — e por quê:**

| Ferramenta | Situação |
|---|---|
| Datadog, New Relic | Cobertos via **OpenTelemetry (OTLP)**, que exporta para ambos sem acoplar o código a um fornecedor |
| Endtest | Sobreposto ao Playwright, que já cobre E2E e é gratuito. Adicionar os dois seria duplicar custo e manutenção |
| arch-contract | Não encontrei uma ferramenta madura com esse nome no ecossistema PHP/JS. As regras de camada estão escritas no `CONTEXTO-DO-PROJETO.md` e podem virar validação automatizada com Deptrac (PHP) e ESLint boundaries (JS) — vale uma issue |

### 5.6 Processo e documentação

| Arquivo | Conteúdo |
|---|---|
| `CONTEXTO-DO-PROJETO.md` | Regras obrigatórias para qualquer agente ou pessoa |
| `README.md` | Visão geral e início rápido |
| `docs/PASSO-A-PASSO.md` | Guia de execução completo, do zero |
| `docs/RELATORIO-REFATORACAO.md` | Auditoria da v1 |
| `docs/legal/TERMOS-DE-USO.md` | Minuta — pendente de revisão jurídica |
| `docs/legal/POLITICA-DE-PRIVACIDADE.md` | Minuta — pendente de revisão jurídica |
| `.github/pull_request_template.md` | Template com as 4 seções obrigatórias |
| `.github/ISSUE_TEMPLATE/` | Três templates: correção, melhoria, nova função |
| `v2/scripts/criar-issues.sh` | Cria 25 issues + 10 labels (idempotente) |
| `v2/scripts/configurar-repo.sh` | Branch develop, proteção da main, segurança |

---

## 6. Achados de segurança na v1

22 findings. Os cinco críticos:

### 🔴 C1 — Senhas em texto plano

`verifyRegister.php`, `verifyLogin.php`, `verifyAlterData.php` e
`VerifyResetPassword.php` gravavam e comparavam a senha diretamente. Qualquer
leitura do banco expunha todas as credenciais — que usuários costumam reutilizar
em outros serviços.

**Corrigido:** `password_hash`/`password_verify`, rehash transparente, script de
migração das senhas existentes.

### 🔴 C2 — Reset de senha sem token (account takeover)

`formail.php` enviava `resetPassword.php?email=vitima@x.com`.
`VerifyResetPassword.php` **não validava nada**: bastava um POST com o e-mail da
vítima para trocar a senha dela. Qualquer pessoa na internet podia assumir
qualquer conta.

**Corrigido:** token de 256 bits, hash SHA-256 no banco, uso único, 30 minutos.

### 🔴 C3 — Segredo versionado em repositório público

`configEmail.php` e `formail.php` continham a senha de aplicativo do Gmail em
texto plano.

**Corrigido no código.** ⚠️ **Pendente:** a senha continua no histórico do Git.

### 🔴 C4 — SQL Injection

`formail.php`: `"SELECT * FROM CADASTRO WHERE email = '$email'"` com input direto
do POST.

**Corrigido:** prepared statement.

### 🔴 C5 — Broken Access Control

`pageAdmin.php` verificava apenas `isset($_SESSION["username"])`. Qualquer
usuário comum acessava o painel digitando a URL. O redirect apontava para
`login.html`, arquivo que não existia.

**Corrigido:** verificação de papel no servidor.

### Demais findings

**Alta:** bug de variável que quebrava a checagem de usuário duplicado
(`$checkUserStmt` / `$checkUSerStmt` / `$checkUerStmt` — três nomes) · ausência
de CSRF · XSS · session fixation · `session_start()` duplicado e ausente ·
`type="senha"` deixando a senha visível na tela.

**Média:** enumeração de contas · sem rate limit · sem política de senha · erros
de banco expostos ao usuário · `id` duplicado no HTML · senha sobrescrita a cada
edição de perfil · mysqli sem tratamento de erro.

**Baixa:** `vendor/` versionado · bloco de tracking reabrindo conexão dentro do
HTML · `composer.json` sem versão de PHP · header e footer duplicados em 10
arquivos.

---

## 7. Bugs encontrados durante a construção

Achados na revisão do próprio trabalho — vale registrar porque são o tipo de
coisa que passa despercebida:

### 7.1 Reduced-motion matava o feedback de carregamento

O reset global de `prefers-reduced-motion` usava `animation-duration: 0.01ms
!important` e `animation-iteration-count: 1 !important`. Isso zerava também o
spinner e o shimmer — quem ativa "reduzir movimento" ficaria **sem nenhum sinal
de que algo está carregando**.

**Corrigido:** exceção via `[data-motion-loop]`, incluindo pseudo-elementos, e
overrides `!important` nos componentes. Reduzir movimento não é remover feedback.

### 7.2 Contexto de build do Docker fora de alcance

O `docker-compose` apontava o contexto para `v2/backend`, mas o Dockerfile
tentava copiar `docker/api/entrypoint.sh` — fora do contexto. O build falharia.

**Corrigido:** contexto na raiz, caminhos ajustados.

### 7.3 PHPMailer tentando autenticar no Mailpit

`SMTPAuth = true` com usuário e senha vazios faria o envio falhar contra o
Mailpit, que não tem autenticação nem TLS.

**Corrigido:** autenticação só quando há credencial configurada.

### 7.4 Comentário prometendo um limite que não existia

`staggerContainer` tinha um comentário afirmando um "cap defensivo" de 600ms que
o código **não implementava**. Comentário mentiroso é pior que comentário
ausente.

**Corrigido:** o limite foi realmente implementado.

### 7.5 Regra de tokens absoluta demais

O `CONTEXTO-DO-PROJETO.md` dizia "nenhum `px` no componente" — e o próprio código
contradizia isso (altura de controle, espessura de borda, breakpoints).

**Corrigido:** a regra agora separa **valores de tema** (obrigatoriamente token)
de **dimensões intrínsecas do componente**.

### 7.6 StrictMode consumindo o token duas vezes

React 18 monta efeitos duas vezes em desenvolvimento. Sem trava, a tela de
confirmação de e-mail consumiria o token de uso único no primeiro efeito e
falharia no segundo — dando "link inválido" para um link válido.

**Corrigido:** trava com `useRef`.

---

## 8. Verificações executadas

| Verificação | Resultado |
|---|---|
| `php -l` em todos os arquivos (v1 + v2) | ✅ 70 arquivos, sem erro |
| Smoke test do bootstrap da v1 (PHP 8.1) | ✅ 7 classes, CSRF, escape, validação, hash |
| YAML (workflows, templates, compose) | ✅ válido |
| JSON (todos os configs) | ✅ válido |
| Shell (`bash -n` nos scripts) | ✅ válido |
| Imports do frontend (`@/` e relativos) | ✅ todos resolvem |
| Links internos nos `.md` | ✅ todos resolvem |
| Segredos hardcoded | ✅ nenhum (só fixture de teste) |
| Valores visuais fora de token | ✅ revisado; exceções documentadas |
| Animação de propriedades de layout | ✅ uma exceção, documentada no código |
| `prefers-reduced-motion` | ✅ coberto, com preservação de feedback |

---

## 9. Limitações e o que não foi validado

Seção honesta. Isto **não** foi verificado:

### 9.1 A stack Docker nunca foi executada

Meu ambiente não tem o daemon do Docker. Validei sintaxe do compose, dos
Dockerfiles, do Makefile e do entrypoint, e corrigi dois erros que teriam
quebrado o build. **Mas o primeiro `make up` é o teste de verdade.**

### 9.2 Lint de PHP rodou em 8.1, não em 8.3

O sandbox tem glibc antiga demais para os binários do PHP 8.3. Ajustei um trecho
(`readonly class` → propriedades readonly) para manter compatibilidade de análise.
O CI roda em 8.3 e 8.4.

### 9.3 Nenhum teste foi executado

PHPUnit, Vitest e Playwright foram **escritos**, não **rodados** — dependem de
`composer install`, `npm install` e de um MySQL. Rode `make test` após subir.

### 9.4 O frontend nunca foi compilado

Sem `npm install`, não houve `tsc`, `biome` nem `next build`. Verifiquei imports
manualmente, mas erros de tipo só aparecem no `npm run typecheck`.

### 9.5 A skill "Motion Principles" não foi carregada

O repositório `kylezantos/design-principles` não está acessível publicamente
(pede autenticação). Apliquei princípios de movimento consolidados, documentados
no `CONTEXTO-DO-PROJETO.md` seção 5.2. Se o repositório for privado e você me der
acesso, posso conferir a aderência.

### 9.6 As Issues não foram criadas

Não há conector do GitHub nem `gh` autenticado neste ambiente. O script está
pronto, é idempotente e tem modo `--dry-run`. **Você precisa executá-lo.**

### 9.7 Os documentos legais são minutas

Redigidos a partir do que o sistema efetivamente faz, mas **não são
aconselhamento jurídico**. Têm campos `[PREENCHER]` e exigem revisão de advogado
— especialmente a limitação de responsabilidade, que o CDC restringe.

### 9.8 Testes de integração usam schema SQLite paralelo

O schema de teste é recriado à mão em SQLite porque as migrations são MySQL. Se
uma migration mudar, o teste não acompanha. Já existe issue para isso.

---

## 10. Backlog de Issues

25 issues prontas em `v2/scripts/criar-issues.sh`.

### 🔴 Correções (8)

| Issue | Severidade |
|---|---|
| Revogar senha do Gmail exposta no histórico | Crítica |
| Reset de senha permite tomada de conta | Crítica |
| Senhas em texto plano | Crítica |
| SQL Injection em `formail.php` | Crítica |
| Painel admin acessível por qualquer usuário | Crítica |
| Ausência de CSRF | Alta |
| XSS por saída não escapada | Alta |
| Enumeração de contas | Média |

### 🟢 Novas funções (11)

Núcleo MVC · Autenticação JWT com refresh rotativo · Confirmação de e-mail ·
Recuperação e troca de senha · Design system com motion · Telas de autenticação ·
Migrar conteúdo da v1 · Esteira de CI · Observabilidade · Ambiente Docker ·
Termos e privacidade

### 🟡 Melhorias (6)

Extrair partials da v1 · Document root em `public/` · Rate limit sliding window ·
Elevar cobertura e ativar Stryker · Sincronizar schema dos testes · Documentar
API com OpenAPI

---

## 11. Pendências que dependem de você

### 🔴 1. Revogar a senha de aplicativo do Gmail — faça hoje

A senha está no histórico público do Git. Removida do código, mas **quem clonar o
repositório consegue recuperá-la** e enviar e-mails como você.

→ https://myaccount.google.com/apppasswords

### 🟠 2. Criar as Issues

```powershell
cd "$env:USERPROFILE\OneDrive\Área de Trabalho\Projetos\Portifolio"
gh auth login
bash v2/scripts/criar-issues.sh --dry-run   # simula
bash v2/scripts/criar-issues.sh             # cria
bash v2/scripts/configurar-repo.sh          # protege a main
```

### 🟠 3. Subir a stack e validar

```powershell
make secrets
make up
```

Depois teste o fluxo completo: criar conta → abrir http://localhost:8025 → clicar
no link de confirmação → fazer login.

### 🟡 4. Decidir sobre o histórico do Git

Revogar a senha resolve o risco imediato. Limpar o histórico é opcional:
`git filter-repo` (reescreve, quebra clones existentes) ou recriar o repositório
(perde stars e issues antigas). Como é portfólio pessoal sem colaboradores,
`filter-repo` é viável.

### 🟡 5. Revisão jurídica

As minutas precisam de advogado antes de irem ao ar. O sistema coleta nome,
e-mail, telefone e IP — a LGPD se aplica.

### 🔵 6. Rodar a migração de senhas da v1 (se a v1 continuar no ar)

```bash
mysqldump -u root -p site > backup.sql
mysql -u root -p site < v1/database/migrations/002_hash_senhas_e_reset.sql
php v1/database/migrate_passwords.php
```

Sem isso, **nenhum usuário existente consegue logar** na v1.

---

## 12. Próximos passos sugeridos

Em ordem de valor:

| # | Tarefa | Por quê |
|---|---|---|
| 1 | **Validar a stack Docker** | Nada mais avança com confiança até isso rodar |
| 2 | Testes E2E dos fluxos de auth | São os fluxos que, se quebrarem, quebram o produto |
| 3 | Painel admin (`/admin`) | Única área da v1 sem equivalente na v2 |
| 4 | Extrair partials da v1 | ~40% menos linhas enquanto o legado existir |
| 5 | Deploy de staging | Validar os estágios `prod` dos Dockerfiles |
| 6 | Exclusão e exportação de conta | Direito do titular na LGPD — hoje só por e-mail |
| 7 | OpenAPI | Contrato explícito; quebra de compatibilidade vira erro de CI |
| 8 | Deptrac + ESLint boundaries | Automatizar as regras de camada do `CONTEXTO` |

---

## 13. Mapa de arquivos

```
Portifolio/
├── .github/
│   ├── ISSUE_TEMPLATE/          3 templates + config
│   ├── workflows/ci.yml         Esteira com quality gate
│   └── pull_request_template.md
├── docs/
│   ├── HISTORICO-DA-SESSAO.md   ← este arquivo
│   ├── PASSO-A-PASSO.md         Guia de execução
│   ├── RELATORIO-REFATORACAO.md Auditoria da v1
│   └── legal/                   Minutas (revisão jurídica pendente)
├── docker/
│   ├── api/                     Dockerfile, entrypoint, xdebug.ini
│   ├── web/Dockerfile
│   └── mysql/init/
├── v1/                          Legado — só correções de segurança
│   ├── README.md                Limites do que é aceito aqui
│   ├── bootstrap.php
│   ├── src/                     7 classes de suporte
│   └── database/migrations/
├── v2/
│   ├── backend/                 52 arquivos · 3.627 linhas de PHP
│   │   ├── public/index.php     Único entrypoint público
│   │   ├── src/{Core,Http,Models,Services,Support,Database}/
│   │   ├── database/migrations/ 6 migrations
│   │   └── tests/{Unit,Integration}/
│   ├── frontend/                53 arquivos · 3.427 linhas de TS
│   │   └── src/{app,components,lib,hooks,styles}/
│   └── scripts/                 criar-issues.sh, configurar-repo.sh
├── CONTEXTO-DO-PROJETO.md       ⚠️ leitura obrigatória
├── README.md
├── Makefile                     20 atalhos (make help)
├── docker-compose.yml           5 serviços
└── .env.example
```

---

## Referência rápida

```powershell
# Ambiente
make secrets          # gera APP_KEY e JWT_SECRET
make up               # sobe tudo
make logs             # acompanha
make down             # derruba
make reset            # ⚠️ recria do zero
make help             # lista completa

# Qualidade
make test             # todos os testes
make check            # tudo que o CI roda
make lint

# GitHub
bash v2/scripts/criar-issues.sh --dry-run
bash v2/scripts/configurar-repo.sh
gh pr create --base develop --fill
gh pr checks --watch
```

| Serviço | Endereço |
|---|---|
| Aplicação | http://localhost:3000 |
| API | http://localhost:8000/health |
| E-mails capturados | http://localhost:8025 |
| Banco (Adminer) | http://localhost:8080 |

---

*Documento gerado em 09/08/2026. Atualize-o ao final de cada rodada de trabalho
relevante — ele é a memória do projeto entre sessões.*
