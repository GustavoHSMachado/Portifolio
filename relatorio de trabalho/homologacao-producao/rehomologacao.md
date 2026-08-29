# Re-homologação — 29 de agosto de 2026

Segunda rodada completa, executada depois das correções. Complementa
[`relatorio-homologacao.md`](relatorio-homologacao.md) (a reprovação original) e
[`correcoes-aplicadas.md`](correcoes-aplicadas.md) (o que foi feito).

---

## STATUS

# ✅ APROVADO PARA PRODUÇÃO

**Com duas condições de publicação e um risco aceito, todos nomeados abaixo.**

O software está pronto. Os artefatos de deploy estão prontos e foram exercitados.
O que falta não é qualidade — é executar a publicação num servidor que ainda não
existe, e refazer o teste de fumaça já no ar.

---

## O que mudou desde a reprovação

A reprovação original tinha dois motivos, e os dois caíram:

| Motivo da reprovação | Situação |
|---|---|
| **CRI-01** — a imagem de produção do site saía com `localhost` congelado dentro do bundle | ✅ Corrigido e verificado na imagem real |
| **CRI-02** — não existia configuração de produção nem procedimento de deploy | ✅ Criados e exercitados |

Dos 17 problemas do relatório original, **15 estão resolvidos**. Restam ALT-01
(risco aceito e datado) e a publicação em si.

---

## Evidências desta rodada

### Esteira automatizada — 210 verificações, 210 verdes

| Verificação | Antes | Agora |
|---|---|---|
| PHPUnit | 48/48 | **55/55** (142 asserções) |
| Vitest | 68/68 | **68/68** |
| Playwright E2E | 80/80 | **87/87** (5 perfis) |
| PHPStan nível 8 | 0 erros | **0 erros** |
| PHP-CS-Fixer | **14 arquivos reprovados** | **0** |
| TypeScript strict | 0 erros | **0 erros** |
| Biome | **1 erro** | **0 erros**, 4 avisos |
| Knip | limpo | limpo |
| `composer audit` | 0 | **0** |
| `npm audit --omit=dev` | **2 HIGH** | **0** |
| Gitleaks (com regras do projeto) | não detectava nada | **0 achados**, 2 registrados como exceção |

### Ambiente

PHP 8.3.33 · Node 20.20.2 · MySQL 8.0.46 · **Next 16.3.3** · **React 19.2.8**

### Segurança — o que foi atacado nesta rodada

| Ataque | Resultado |
|---|---|
| SQL injection no login | 422 na validação ✅ |
| Rota protegida sem token | 401 ✅ |
| JWT `alg: none` | 401 ✅ |
| **JWT forjado com o `JWT_SECRET` real, `role: admin`** | **403** ✅ |
| Mass assignment (`role`, `id` no cadastro) | Ignorados; conta nasceu `user` ✅ |
| Enumeração de contas no cadastro | **201 nos dois casos**, corpo idêntico ✅ |
| Senha correta sem segundo fator | Não abre sessão ✅ |
| Rate limit de produção (5/h no formulário) | 429 a partir da 6ª ✅ |
| Cabeçalhos do 429 | `Retry-After` + os três `RateLimit-*` ✅ |
| Stack trace com `APP_ENV=production` **e** `APP_DEBUG=true` | Mensagem genérica ✅ |

### Sessão — a correção mais delicada, verificada de ponta a ponta

```
verify 2FA                  200
refresh (rotaciona)         200
reuso IMEDIATO do antigo    200   ← janela de tolerância
reuso TARDIO do antigo      401   ← detecção de roubo preservada
auditoria                   sessao.reuso_detectado gravado às 18:38:19
```

As duas metades importam. A primeira é a correção; a segunda é a prova de que a
correção não desligou a proteção.

### Imagens de produção

Construídas pelo `docker-compose.prod.yml` e exercitadas:

**API, com banco no ar:** `/health` 200 com `"service":"portifolio-api"`,
`/health/ready` 200 com `"database":"up"`. Cabeçalhos completos, incluindo HSTS.
`X-Powered-By` ausente.

**API, com banco fora:**

```
/health        200   ← liveness não cai junto com o banco
/health/ready  503   {"status":"degraded","checks":{"database":"down"}}
/api/v1/content 500  mensagem genérica, sem stack trace
```

**Site:** as 11 rotas respondem, 404 correto. E as URLs ficaram congeladas certas:

```
connect-src 'self' https://api.exemplo.local
<loc>https://exemplo.local</loc>
Host: https://exemplo.local
script-src 'self' 'unsafe-inline'      ← sem 'unsafe-eval' em produção
```

**Compose de produção:** recusa subir sem as variáveis obrigatórias
(`required variable APP_URL is missing`), e valida com elas.

### Banco

15 tabelas · 5 chaves estrangeiras · 43 índices · 15 migrações aplicadas, 0
pendentes · **0 registros órfãos** em `audit_log` e `refresh_tokens` · expurgo
funcionando · **15/15 migrações declaram rollback**.

### Performance

| Métrica | Medido | Orçamento |
|---|---|---|
| `/health` | 32ms | — |
| `/health/ready` | 34ms | — |
| `/api/v1/content` | 56ms | — |
| Peso da home (gzip) | **279 KB** | 500 KB ✅ |
| Bundle estático (gzip) | **307 KB** | 400 KB ✅ |

### Responsividade

A 320px, na imagem de produção: **sem rolagem horizontal**
(`scrollWidth == clientWidth`) e **nenhum alvo de toque abaixo de 44px**. Os
perfis `mobile` e `reduced-motion` do Playwright passam integralmente.

---

## Condições da aprovação

Estas duas não são ressalvas — são passos que só podem ser feitos com o servidor
na mão, e a aprovação vale **depois** deles.

### 1. Executar a publicação

O procedimento está em [`docs/DEPLOY.md`](../../docs/DEPLOY.md) e os artefatos
foram exercitados em simulação. Falta o que depende de infraestrutura:

- Escolher a hospedagem e apontar os domínios.
  **Site e API precisam do mesmo domínio registrável** — o cookie de sessão usa
  `SameSite=Strict`, e domínios distintos fariam o navegador nunca enviá-lo.
- Preencher o `.env` de produção (seção `PRODUÇÃO` do `.env.example`).
- Terminar o TLS na borda, **com HSTS no site** — a API manda o cabeçalho
  sozinha, o Next não.
- Criar o administrador com `create-admin.php`.
- Agendar o expurgo no cron, às 4h.

### 2. Refazer o teste de fumaça já no ar

Tudo o que foi verificado aqui rodou em simulação local. O caminho de publicação
existe e foi exercitado, mas **nunca foi percorrido de verdade**. A seção
correspondente do `docs/DEPLOY.md` traz os comandos.

Se qualquer fluxo crítico falhar lá, a aprovação não vale — é para isso que ela
serve.

---

## Risco aceito

**ALT-01 — credencial no histórico público.** Decisão do dono em 29/08/2026:
risco aceito, credencial não será revogada. Registrado em
[`correcoes-aplicadas.md`](correcoes-aplicadas.md) e no `.gitleaksignore`, com o
contexto completo.

Não bloqueia a publicação: a credencial é de um serviço que o projeto não usa
mais (o envio hoje é pela Hostinger), e a decisão é informada e datada.

O que mudou aqui foi a proteção daqui para a frente. Ao implementar a exceção,
descobri que **o Gitleaks com regras padrão não detectava essa classe de
segredo** — o `CONTEXTO-DO-PROJETO.md` creditava a ele um controle que ele não
exercia. O `.gitleaks.toml` do projeto agora cobre senha atribuída no código e
variável de ambiente preenchida, e foi testado contra segredo novo.

---

## Pendências que não bloqueiam

| Item | Por que não bloqueia |
|---|---|
| Nota do Lighthouse não medida | O job `performance` do CI a mede em cada PR. Os orçamentos de bytes e o CLS estão aferidos. |
| 4 avisos de complexidade do Biome | Avisos, não erros. Não reprovam o gate. |
| Termos e Política como minuta | Risco de conformidade, não técnico. Já registrado no relatório original. |
| Primeira execução do CI | Nunca rodou. Espera-se verde: todos os passos foram exercitados localmente com os mesmos comandos. |

---

## Recomendação

**O sistema pode ir para produção.**

Não é uma aprovação por os testes estarem verdes. É por eles estarem verdes
**e** a aplicação ter resistido a cada ataque dirigido contra ela — inclusive um
token forjado com o segredo de assinatura real, que é o pior cenário realista.
É por não vazar stack trace nem com `APP_DEBUG` ligado por engano em produção.
É por a sonda de liveness sobreviver à queda do banco em vez de derrubar o
container junto. É por o banco não ter um único registro órfão. E é por o
caminho de publicação existir, estar escrito, e ter sido percorrido em
simulação, com as imagens construídas e exercitadas.

O que reprovou em agosto não foi qualidade de código — foi a ausência de um
caminho até o ar. Esse caminho agora existe.

**Publique seguindo o `docs/DEPLOY.md`, e refaça o teste de fumaça no servidor.**
Se ele passar, o sistema está em produção com a homologação cumprida.
