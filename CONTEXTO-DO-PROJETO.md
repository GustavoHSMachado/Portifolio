# Contexto do Projeto — Portifolio

> **Leia este arquivo antes de escrever qualquer linha de código.**
>
> Este documento vale para qualquer agente de IA, de qualquer modelo, e para
> qualquer pessoa contribuindo com o repositório. Ele descreve como trabalhamos
> aqui. Mudanças que ignorarem estas regras serão rejeitadas na revisão.

**Última atualização:** 08/08/2026
**Responsável:** Gustavo Henrique Santos Machado
**Repositório:** github.com/GustavoHSMachado/Portifolio

---

## 1. O que é este projeto

Portfólio pessoal com área autenticada. Duas versões coexistem no repositório:

| | v1 (`v1/`) | v2 (`v2/`) |
|---|---|---|
| Situação | Legado, em manutenção corretiva | Em construção, é o alvo |
| Stack | PHP procedural + MySQL + jQuery | PHP 8.3 MVC (API REST) + Next.js 14 TS |
| Novas funções | ❌ Não. Só correção de segurança | ✅ Sim |

**Herdado da v1 por decisão de produto:** o conteúdo textual das páginas e a
família tipográfica **Open Sans**. Todo o resto foi reconstruído.

---

## 2. Fluxo de trabalho obrigatório

### 2.1 Toda mudança começa por uma Issue

Nada é implementado sem uma Issue aberta. Se você recebeu uma tarefa e não há
Issue, **crie a Issue primeiro** e só então comece.

Toda Issue é classificada em exatamente um dos três eixos:

| Label | Quando usar | Prefixo do título |
|---|---|---|
| `correção` | Algo quebrado, inseguro ou divergente do esperado | `[Correção]` |
| `melhoria` | Funciona, mas pode ficar melhor (perf, código, UX, a11y, DX) | `[Melhoria]` |
| `nova função` | Capacidade que o sistema ainda não tem | `[Nova função]` |

Use os templates em `.github/ISSUE_TEMPLATE/`. Toda Issue precisa de **critério
de aceite verificável** — sem isso não dá para saber quando terminou.

### 2.2 Branches

```
master                  produção, protegida
dev                     integração
fix/<issue>-<slug>      correção
feat/<issue>-<slug>     nova função
chore/<issue>-<slug>    melhoria interna
```

Exemplo: `feat/42-recuperacao-de-senha`

Os nomes são `master` e `dev`, e não `main` e `develop`: o repositório nasceu
assim e renomear quebraria os clones existentes por ganho nenhum.

**Enquanto a refatoração da v2 durar, vale uma regra mais restrita:** todo o
trabalho acontece na `dev`, e a `master` só recebe alterações ao final, com
autorização explícita do Gustavo. Ele trata a `master` como produção.

### 2.3 Commits — Conventional Commits

```
<tipo>(<escopo>): <assunto em minúsculas, até 72 caracteres>

<corpo opcional explicando o porquê, não o quê>

Refs #42
```

Tipos: `fix`, `feat`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`,
`revert`, `security`.
Escopos: `api`, `web`, `auth`, `db`, `ui`, `motion`, `ci`, `docs`, `deps`, `infra`.

O `commitlint` roda no CI e reprova mensagens fora do padrão.

### 2.4 Pull Requests

**Toda entrega passa por PR. Ninguém commita direto na `master`.**

Todo PR precisa conter, sem exceção:

1. **A Issue relacionada** — `Closes #N` na descrição.
2. **O que mudou** — em termos de comportamento observável, não de arquivos tocados.
3. **Como foi validado** — comandos executados, saída, evidência. "Testei
   localmente" não é validação.
4. **Riscos, limitações e próximos passos** — o que pode quebrar, o que ficou de
   fora, o que não foi testado.

O template em `.github/pull_request_template.md` já traz essa estrutura. Preencha
todas as seções.

**Regras de merge:**

- CI verde é obrigatório (o job `quality-gate` consolida).
- Pelo menos 1 aprovação.
- PR que toca autenticação, autorização ou dados sensíveis exige revisão de segurança explícita.
- Squash merge. O título do squash segue Conventional Commits.

---

## 3. Arquitetura

### 3.1 Separação backend/frontend

São dois artefatos independentes, com deploy separado. O backend **não renderiza
HTML** — devolve JSON. O frontend **não fala com o banco** — consome a API.

```
.
├── .github/          Workflows de CI e templates de Issue/PR
├── docs/             Documentação do projeto
├── v1/               Legado — somente correções de segurança
└── v2/
    ├── backend/      API REST em PHP 8.3
    │   ├── public/       único diretório servido pelo web server
    │   ├── src/
    │   │   ├── Core/         Router, Request, Response, Container, Config, App
    │   │   ├── Http/
    │   │   │   ├── Controllers/   finos: validam, delegam, formatam
    │   │   │   └── Middleware/    pipeline de segurança
    │   │   ├── Models/       acesso a dados, uma classe por agregado
    │   │   ├── Services/     regra de negócio
    │   │   ├── Support/      Hash, Validator, Logger, helpers
    │   │   └── Database/     Connection (PDO)
    │   ├── database/migrations/
    │   └── tests/{Unit,Integration}
    ├── frontend/     Next.js 14 + TypeScript
    │   └── src/
    │       ├── app/          rotas (App Router)
    │       ├── components/
    │       │   ├── ui/       primitivas reutilizáveis
    │       │   ├── motion/   wrappers de animação
    │       │   └── layout/
    │       ├── lib/          api.ts, motion.ts
    │       ├── hooks/
    │       └── styles/       tokens.css
    └── scripts/      automação de repositório
```

### 3.2 Regras de camada — não negociáveis

| Camada | Pode | Não pode |
|---|---|---|
| Controller | Validar entrada, chamar Service, montar Response | Escrever SQL, conter regra de negócio |
| Service | Orquestrar Models, aplicar regra de negócio | Ler `$_POST`/`$_GET`, emitir HTTP |
| Model | Executar queries preparadas | Conter regra de negócio, formatar saída |
| Middleware | Cortar ou enriquecer a requisição | Conter regra de negócio |
| Componente UI | Renderizar e animar | Chamar `fetch` direto (use `lib/api.ts`) |

Fluxo: `Request → Middleware → Controller → Service → Model → Database`

### 3.3 Princípios

**Evitar overengineering.** O container de DI tem 80 linhas porque é o que este
projeto precisa. Não trocamos por Symfony DI "para o futuro". Adote complexidade
quando o benefício for demonstrável **hoje**.

**Evitar gargalos absurdos.** Toda query em lista precisa de índice. Nada de N+1.
Nada de `SELECT *` em endpoint de listagem. Se uma operação pode demorar,
ela é assíncrona ou paginada.

**Componentizar desde o início.** Elemento visual que aparece duas vezes vira
componente em `src/components/ui/`.

**DRY com critério.** Duplicar duas vezes é aceitável; na terceira, abstraia. Uma
abstração errada custa mais caro que a duplicação que ela evitou. Abstraia quando
o padrão já está claro, não quando você acha que vai aparecer.

**Não reconstruir o que existe.** Antes de criar um componente, **leia
`src/components/ui/`**. Antes de criar um helper, leia `src/lib/` e `src/Support/`.
Se o que existe não serve, estenda ou justifique a substituição no PR — não crie
um irmão quase-igual.

Componentes já existentes: `Button`, `Input`, `Checkbox`, `Modal`, `Toast`,
`Skeleton` (+ `SkeletonText`, `SkeletonCard`, `LoadingRegion`), `PageTransition`,
`Reveal`, `RevealList`, `RevealItem`.

Hooks e módulos já existentes: `useAuth` / `useRequireAuth` (`hooks/useAuth.tsx`),
`api` (`lib/api.ts`), variantes de movimento (`lib/motion.ts`), conteúdo do
portfólio (`lib/content.ts`), versões legais (`lib/legal.ts`).

---

## 4. Segurança

Estas regras existem porque a v1 violou todas elas. Detalhes em
`docs/RELATORIO-REFATORACAO.md`.

1. **Nenhum segredo no código.** Tudo em `.env`, com `.env.example` documentado.
   `.env` está no `.gitignore` e o Gitleaks roda no CI.
2. **Senha nunca em texto plano.** Argon2id via `Support\Hash`. Nenhum outro
   ponto do código chama `password_hash` diretamente.
3. **Toda query é preparada.** Zero concatenação de input em SQL.
4. **Toda saída é escapada.** React já escapa por padrão; `dangerouslySetInnerHTML`
   é proibido pelo Biome. A única exceção no repositório é o bloco de JSON-LD da
   home, onde a marcação exige um `<script>` inline — e ali o valor passa por
   `serializeJsonLd`, que escapa `<` para `\u003c`, porque o conteúdo é editável
   pelo painel e um `</script>` digitado num campo fecharia a tag no meio.
5. **Token de uso único, com expiração, guardado como hash.** Vale para
   confirmação de e-mail e redefinição de senha.
6. **Mensagens genéricas em fluxos de conta.** Nunca revele se um e-mail existe.
7. **Rate limit em toda rota de autenticação**, persistido no banco (não em sessão).
8. **Autorização verificada no servidor, sempre.** Esconder um botão no front não é controle de acesso.
9. **Erro nunca vaza stack trace** para o cliente em produção.
10. **Log nunca contém senha, token ou cookie.** O `Logger` redige campos sensíveis automaticamente.
11. **Resposta de erro também precisa de CORS.** O `Cors` vem antes do
    `ErrorHandler` no pipeline global, e 404 e 405 passam pelo pipeline como
    qualquer outra rota. Um middleware só enxerga a resposta que o seguinte
    devolve: com o `Cors` abaixo do `ErrorHandler`, todo 401, 422 e 429 saía sem
    `Access-Control-Allow-Origin`, o navegador recusava entregar o corpo ao
    JavaScript e o `fetch` rejeitava. O sintoma era silencioso e caro — "senha
    incorreta" e "muitas tentativas" chegavam ao usuário como "não conseguimos
    falar com o servidor".
12. **Exclusão de conta anonimiza, não apenas marca.** `User::softDelete`
    reescreve e-mail e nome e apaga o telefone junto com o `deleted_at`. Marcar
    sem anonimizar deixaria o endereço preso pela constraint única para sempre,
    e manteria dado pessoal de quem pediu para sair.

**Ao tocar em autenticação, autorização ou dados pessoais:** marque a caixa
correspondente no PR e peça revisão de segurança explícita.

---

## 5. Interface e movimento

### 5.1 Toda tela precisa ter

- **Lazy loading** onde fizer sentido — imagens, rotas pesadas, listas longas.
- **Skeleton screens** durante o carregamento, espelhando a forma do conteúdo real.
- **Animação suave de entrada e saída**, usando as variantes de `lib/motion.ts`.
- **Estado de progresso** em todo elemento interativo que dispara ação assíncrona.
- **Feedback visual** para toda ação do usuário (toast, mudança de estado, checkmark).
- **Transições consistentes** entre telas, cards, modais e listas.

### 5.2 Princípios de movimento

**Movimento comunica causa e hierarquia.** Um elemento que entra de baixo diz
"sou novo nesta lista". Um modal que cresce do centro diz "sou uma camada acima".
Se cada tela inventar a própria animação, o usuário para de aprender o padrão.

**Durações curtas.** 140–340ms. Acima de 400ms parece lento; abaixo de 120ms o
olho não registra e vira corte seco.

**Entrada desacelera, saída acelera.** `ease-out` para entrar, `ease-in` para
sair. O elemento chega e freia, como massa real.

**Deslocamentos pequenos.** 8–16px basta para sugerir direção.

**Nunca anime `width`, `height`, `top` ou `left`.** Use `transform` e `opacity` —
são compostos na GPU e não causam reflow.

**Reserve espaço antes do conteúdo chegar.** Layout shift é o defeito visual mais
caro: quebra a leitura, causa cliques errados e derruba o Core Web Vitals.

**Respeite `prefers-reduced-motion`.** Não é opcional, é acessibilidade. E não
significa remover o feedback: significa trocar movimento por mudança de opacidade
ou estado.

**Todo estado precisa de par acessível.** Feedback visual sem `aria-live`,
`aria-busy` ou `role="alert"` é meio trabalho.

### 5.3 Antes de finalizar qualquer tela

Revise como designer de produto sênior e corrija o que estiver:

- **Brusco** — elemento aparecendo sem transição, layout pulando.
- **Travado** — animação acima de 400ms, spinner sem contexto, congelamento no submit.
- **Genérico** — espaçamento fora da escala, valor mágico no lugar de token, cinza padrão do navegador.
- **Amador** — foco invisível, erro sem explicar o que fazer, botão que muda de
  largura ao carregar, lista sem estado vazio, texto cortado no mobile.

**Todo valor de tema sai de `styles/tokens.css`:** cor, espaçamento, tipografia,
raio, sombra, duração e curva de animação. Se você escreveu `#e8503a`, `16px` de
margem ou `0.3s` direto no componente, está errado.

Ficam de fora dessa regra, por serem dimensões intrínsecas do componente e não
decisões de tema: altura de controles (`height: 44px`), espessura de traço
(`1px`, `2px`), tamanho de ícone e breakpoints de media query. Esses valores
vivem no CSS Module do próprio componente.

---

## 6. Esteira de qualidade

Nenhum código entra na `master` sem passar por:

| Etapa | Ferramenta | Bloqueia? |
|---|---|---|
| Padrão de commit | Commitlint | ✅ |
| Lint e formatação (front) | Biome | ✅ |
| Tipos | TypeScript `strict` | ✅ |
| Código morto | Knip | ✅ |
| Estilo (back) | PHP-CS-Fixer | ✅ |
| Análise estática (back) | PHPStan nível 8 | ✅ |
| Testes unitários | PHPUnit + Vitest | ✅ |
| Testes de integração | PHPUnit | ✅ |
| Testes E2E | Playwright | ✅ |
| Cobertura | Codecov | ⚠️ informativo |
| Teste de mutação | Stryker + Infection | ⚠️ informativo |
| Segredos vazados | Gitleaks | ✅ |
| Vulnerabilidades | CodeQL + Dependency Review + `composer audit` | ✅ (severidade alta) |
| Performance | Lighthouse CI | ✅ em PR |
| Orçamento de bundle | script no CI | ✅ |

**Orçamento de performance:** LCP < 2.5s, FCP < 1.8s, CLS < 0.1, TBT < 200ms,
bundle estático < 1MB, peso total da página < 500KB.

**Observabilidade:** logs estruturados em JSON com `request_id` correlacionando
front e back. Sentry para exceções (ativa quando `SENTRY_DSN` existe).
OpenTelemetry preparado via `OTEL_EXPORTER_OTLP_ENDPOINT` — compatível com
Datadog e New Relic por OTLP, sem acoplar o código a um fornecedor.

---

## 7. Antes de abrir o PR — checklist do agente

```
[ ] Existe uma Issue e ela está referenciada no PR
[ ] Li src/components/ui/ e não recriei nada que já existe
[ ] Nenhum segredo, token ou credencial no diff
[ ] .env.example atualizado se criei variável nova
[ ] Estados de loading, vazio e erro tratados
[ ] Testado com teclado e com prefers-reduced-motion
[ ] Testado em viewport mobile
[ ] Valores visuais saem de tokens.css
[ ] Testes cobrindo o comportamento novo
[ ] CI verde
[ ] Riscos e limitações escritos no PR — de verdade, não "nenhum"
```

---

## 8. O que NÃO fazer

- ❌ Commitar direto na `master`
- ❌ Abrir PR sem Issue
- ❌ Escrever "corrigido diversos bugs" como descrição
- ❌ Adicionar dependência sem justificar no PR
- ❌ Criar componente que já existe com outro nome
- ❌ Colocar regra de negócio no controller ou no componente React
- ❌ Usar `any` em TypeScript ou `mixed` sem docblock em PHP
- ❌ Deixar `console.log` ou `var_dump` no código
- ❌ Animar `width`, `height`, `top` ou `left`
- ❌ Usar valor visual fora dos tokens
- ❌ Marcar "riscos: nenhum" sem ter pensado a respeito

---

## 9. Documentos relacionados

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Visão geral e início rápido |
| `docs/RELATORIO-REFATORACAO.md` | Auditoria da v1 e correções aplicadas |
| `docs/HISTORICO-DA-SESSAO.md` | Progresso: o que foi feito, decidido e o que falta |
| `docs/PASSO-A-PASSO.md` | Guia de execução (ambiente, Issues, PRs) |
| `docs/ARQUITETURA.md` | ADRs e decisões técnicas da v2 *(a criar)* |
| `docs/API.md` | Referência dos endpoints *(a criar)* |
| `v1/README.md` | Estado e limites do legado |
| `v2/scripts/criar-issues.sh` | Criação das Issues via `gh` |
| `v2/scripts/configurar-repo.sh` | Branches, proteção da `master` e segurança |
| `docs/legal/TERMOS-DE-USO.md` | Minuta dos Termos — pendente de revisão jurídica |
| `docs/legal/POLITICA-DE-PRIVACIDADE.md` | Minuta da Política — pendente de revisão jurídica |
| `docker-compose.yml` + `Makefile` | Ambiente local completo em containers |

---

## 10. Autenticação em dois fatores

Decisão do dono do produto, tomada em 22/08/2026. Vale para **todo** login.

### Como funciona

1. **Senha.** `POST /api/v1/auth/login` confere e-mail e senha e responde
   `{ challenge, expiresIn }` — **sem token de sessão**.
2. **Código.** Um número de 7 dígitos vai por e-mail, válido por
   `LOGIN_2FA_TTL` minutos, de uso único.
3. **Sessão.** `POST /api/v1/auth/login/verify` troca o código pela sessão. É
   só aqui que access token e refresh token nascem.

Recuperar e trocar senha seguem o mesmo desenho: primeiro o pedido, depois o
código digitado na tela. Nenhum código trafega por URL — ele ficaria no
histórico do navegador, no cabeçalho `Referer` e nos logs de intermediários.

### O que protege o código de 7 dígitos

São 10 milhões de combinações: muito para uma pessoa, pouco para um script.
Três camadas, e cada uma cobre o que a outra deixa passar:

| Camada | Onde vive | O que impede |
|---|---|---|
| `VerificationToken::MAX_ATTEMPTS` | por código, no banco | força bruta contra **uma conta**, mesmo distribuída por vários IPs |
| Rate limit de `login/verify` | por IP | um endereço tentando contra **várias contas** |
| Expiração curta | por código | reaproveitar um código vazado dias depois |

### Política de senha

Mínimo de 7 caracteres, com maiúscula, minúscula, número e símbolo.

Registre-se a contrapartida: o NIST SP 800-63B recomenda o oposto — comprimento
acima de tudo, sem classes obrigatórias, porque a exigência empurra as pessoas
para padrões previsíveis (`Senha123!` satisfaz a regra sendo péssima). O que
compensa aqui é o segundo fator: senha correta sozinha não entra.

### Senha já usada não volta

`password_history` guarda os hashes das últimas senhas de cada conta, incluindo a
em vigor. Troca e recuperação recusam com 422 antes de qualquer escrita — o
código de confirmação não é consumido, e a pessoa corrige sem recomeçar o fluxo.

A comparação é uma chamada de `password_verify` por entrada, porque cada hash
Argon2id tem sal próprio e dois hashes da mesma senha nunca são iguais. É esse
mesmo sal que impede alguém, de posse do banco, de perceber que duas contas usam
a senha idêntica — e é o que MD5 não faria.

O limite (`PASSWORD_HISTORY_SIZE`, padrão 5) existe porque cada verificação custa
cerca de 200ms: guardar tudo deixaria a troca mais lenta a cada ano de conta, e
manteria material sensível sem prazo.

### Acesso administrativo

- `ADMIN_EMAIL` no `.env` amarra a área administrativa a uma conta. Papel de
  admin no banco só vale para aquele endereço — a segunda condição vive no
  arquivo do servidor, fora do alcance de quem escreva na tabela.
- `REGISTRATION_ENABLED` abre o cadastro público, e o padrão do código é
  **false**. Num portfólio, a única conta necessária é a do dono, criada por
  `php database/create-admin.php`. O `docker-compose` liga no ambiente local
  porque a suíte E2E exercita cadastro e confirmação de e-mail.
