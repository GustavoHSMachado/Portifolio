# Registro de sessões — Cowork → Claude Code

> Consolidado em 2026-08-09 a partir de 4 sessões do Cowork no projeto "Portifolio".
> Objetivo: dar contexto completo a qualquer agente (Claude Code incluso) sobre o que já foi decidido e feito, sem precisar reler o chat inteiro.
>
> Documentos complementares no repo: `CONTEXTO-DO-PROJETO.md` (padrões obrigatórios), `README.md` (visão geral), `docs/RELATORIO-REFATORACAO.md` (auditoria de segurança da v1), `docs/PASSO-A-PASSO.md` (comandos para rodar tudo).

---

## 1. Como transferir progresso do Claude.ai para o Claude Code

Não existe transferência automática entre um Project do Claude.ai e o Claude Code — é manual:

1. Baixar os arquivos do Project Knowledge e colocar no repositório.
2. Copiar as instruções/system prompt do projeto para um `CLAUDE.md` na raiz (ou `.claude/CLAUDE.md`) — o Claude Code lê isso automaticamente a cada sessão.
3. Resumir decisões importantes (arquitetura, convenções, o que já foi tentado) em markdown — não dá para importar o chat inteiro. Este arquivo cumpre esse papel.
4. Baixar artifacts de código gerados e salvar direto no repo.
5. Se o `CLAUDE.md` passar de ~200 linhas, dividir em arquivos menores e referenciar via `@caminho/arquivo.md`.

Fontes: [Claude Code Docs — Memory](https://code.claude.com/docs/en/memory), [claude.com/import-memory](https://claude.com/import-memory)

---

## 2. Auditoria de segurança da v1 (concluída)

Rodei os agentes de segurança (13, 02, 03, 06, 05, 15) sobre o código legado. 22 findings, 5 críticos — todos corrigidos:

- Senhas em texto plano → `password_hash`/`password_verify`.
- Reset de senha sem token (qualquer um trocava a senha de qualquer conta só sabendo o e-mail) → fluxo com token de uso único.
- SQL Injection em `formail.php` → queries parametrizadas.
- Senha do Gmail hardcoded no código → **ainda está no histórico do Git público, precisa ser revogada em myaccount.google.com/apppasswords** (ação pendente do usuário).
- Área admin acessível por qualquer usuário logado → RBAC.

Estrutura resultante na v1: `bootstrap.php`, `src/` com 7 classes (PDO, Auth/RBAC, CSRF, Mailer, PasswordReset, Validator), migrações SQL versionadas com rollback. Layout e nomes de arquivo preservados.

Relatório completo: `docs/RELATORIO-REFATORACAO.md`.

---

## 3. Refatoração v2 — arquitetura nova (em andamento)

### Pedido original do usuário
Reaproveitar apenas texto e tipografia (Open Sans, laranja da v1); reconstruir do zero em PHP atual + REST no back, front separado. Exigências adicionais:

- Arquitetura MVC com models de segurança: controle de senha, recuperação com token, confirmação por e-mail, troca de senha, middleware de segurança.
- Issues no GitHub para cada tarefa, categorizadas como Correção / Melhoria / Nova função.
- Fluxo de Pull Request: mencionar a Issue, explicar a mudança, descrever validação, registrar riscos/limitações/próximos passos.
- Atualizar o `.md` de contexto do projeto para qualquer agente seguir esse padrão.
- Aplicar princípios de motion (skill "Motion Principles" de `github.com/kylezantos/design-principles` — **repositório não estava acessível publicamente, não pôde ser carregado**): lazy loading, skeleton screens, animações de entrada/saída, estados de progresso, feedback visual, transições consistentes. Revisão final como "designer de produto sênior".
- Esteira de qualidade antes de merge na main: observabilidade (Sentry/Datadog/New Relic/OpenTelemetry — deixados configuráveis via `.env`, não ativados, pois exigem contas/chaves que não tenho), lint (Biome, Commitlint, Knip, Stryker), testes (unitário/integração/E2E, Codecov, Playwright), segurança/operação (rate limit, revisão de segurança, performance budget, separação back/front, termos de uso e política de privacidade), arquitetura sem overengineering.

### Bloqueios identificados e resolvidos com o usuário
- Sem conector do GitHub nem `gh` CLI autenticado no ambiente → resolvido preparando scripts (`criar-issues.sh`, `configurar-repo.sh`) que o usuário roda localmente com `gh auth login`, documentado em `docs/PASSO-A-PASSO.md`.
- Repositório de design principles inacessível → seguido critério próprio de revisão de motion/UX.
- Ferramentas de observabilidade/Codecov/Endtest exigem contas que não tenho → deixadas instrumentadas e configuráveis, não ativadas.

### O que foi entregue (91 arquivos, ~6.700 linhas)

**Backend** (`v2/backend/`) — MVC próprio em PHP 8.3, PSR-4: router com pipeline de middleware, DI com autowiring, JWT + refresh token rotativo com detecção de reuso, confirmação de e-mail e recuperação de senha por token de uso único, rate limit persistido, RBAC, 5 migrations, suíte PHPUnit. Validado sintaticamente (o sandbox não roda PHP 8.3 por causa de glibc antiga — ajustado para sintaxe compatível com 8.1 e correta em 8.3).

**Frontend** (`v2/frontend/`) — Next.js 14 + TypeScript, App Router: design system em tokens (Open Sans e laranja da v1 preservados), vocabulário de motion centralizado, componentes Button/Input/Modal/Toast/Skeleton, cliente de API com refresh concorrente controlado, `AuthProvider` que renova o token 60s antes de expirar, medidor de força de senha, `useRequireAuth` (documentado no código como conveniência de navegação, não controle de acesso real).

9 rotas: home, entrar, criar conta, confirmar e-mail, recuperar senha, redefinir senha, painel, e duas páginas legais.

**Esteira de CI** (`.github/`) — quality gate com Commitlint, Biome, TypeScript, Knip, PHPStan, PHPUnit, Playwright, Lighthouse, Gitleaks, CodeQL, Codecov, Stryker.

**Processo** — templates de Issue nos três eixos (Correção/Melhoria/Nova função), template de PR com as quatro seções obrigatórias (Issue relacionada, o que mudou, como validou, riscos/limitações/próximos passos), scripts `criar-issues.sh` (23 issues) e `configurar-repo.sh`.

**Docker** (`docker-compose.yml`, `docker/`, `Makefile`) — MySQL, API, Next.js, Mailpit (captura e-mails em `localhost:8025` para testar confirmação/recuperação de senha sem SMTP real) e Adminer. Migrações rodam automaticamente no boot. Dockerfiles com estágio `prod` separado, sem Composer/ferramentas de build. **Não executado no sandbox** (sem daemon Docker disponível) — só validado sintaticamente; dois erros reais corrigidos nessa validação (contexto de build não alcançava `docker/api/`; PHPMailer tentando autenticar num Mailpit sem autenticação). Comando para rodar: `make secrets && make up`. Se falhar, checar `make logs`.

**Conteúdo** — textos da v1 migrados para `lib/content.ts` com revisão de pontuação, mantendo a nota que credita o template original.

**Documentos legais** (`docs/legal/`) — minutas de Termos e Política de Privacidade com aceite versionado (tabela `legal_acceptances` grava versão, timestamp e IP, para consentimento demonstrável sob LGPD). **Têm campos `[PREENCHER]`** (e-mail de contato, foro, provedores) e **precisam de revisão jurídica antes de ir ao ar**, principalmente a cláusula de limitação de responsabilidade (restrita pelo CDC).

### Achados corrigidos durante a revisão final
- O reset global de `prefers-reduced-motion` matava o spinner e o shimmer de loading — quem ativa "reduzir movimento" ficava sem nenhum sinal de carregamento. Corrigido com exceção via `[data-motion-loop]`.
- O shimmer do `Skeleton` rodava no pseudo-elemento `::after`, que o seletor de correção acima não alcançava — ajustado.
- Regra de tokens ("nenhum px no componente") estava absoluta demais e o próprio código a contradizia — reescrita separando valores de tema (token obrigatório) de dimensões intrínsecas do componente.
- Comentário no código prometia um limite que não estava implementado — corrigido para refletir o comportamento real.
- Raiz do repo misturava v1, v2 e docs — reorganizada. Estrutura final: `README.md`, `CONTEXTO-DO-PROJETO.md`, `docs/`, `v1/`, `v2/`, `.github/`.

### Pendências que dependem do usuário
1. **Revogar a senha de app do Gmail** em myaccount.google.com/apppasswords — está no histórico público do Git e ainda é válida.
2. **Rodar `bash v2/scripts/criar-issues.sh --dry-run`** e depois sem o flag, para criar as 23 issues no GitHub (requer `gh auth login`). Passo a passo em `docs/PASSO-A-PASSO.md`.
3. **Rodar `php database/migrate_passwords.php`** na v1 após as migrações, senão ninguém consegue logar (login agora usa `password_verify`).
4. **`make secrets && make up`** — primeiro teste real do Docker; o sandbox só validou sintaxe.
5. **Revisão jurídica** das minutas de Termos e Política antes de publicar.

### Próximos passos em aberto (não iniciados)
- Painel admin.
- Testes E2E dos fluxos novos (Playwright já está na esteira, faltam os specs).
- Extrair partials de header/footer da v1 (hoje duplicados em 10 arquivos) — proposto e não executado.

---

## 4. Painel pessoal auto-atualizável (sessão separada, não relacionada ao portfólio)

Pedido: painel que se mantém atualizado sozinho, escolhendo as duas fontes mais úteis entre calendário/caixa de entrada/serviços conectados.

Entregue como artifact do Cowork: agenda do dia + caixa de entrada prioritária, com dados 100% de exemplo (marcados como "EXEMPLO" no painel), já que nenhum conector estava ativo no início.

Progresso de conexão de contas:
- Gmail: conector sugerido, conexão iniciada pelo usuário.
- Microsoft 365 (cobre Outlook.com/pessoal, não só corporativo): conector sugerido para `gustavo.hsmachado@outlook.com`.
- iPhone/iCloud (Calendário, Contatos, Notas): **não existe conector Apple no registro do Cowork**. Alternativa sugerida: sincronizar o Calendário do iPhone com a conta Google ou Outlook já conectada (Ajustes → Contas → adicionar conta no iPhone), e os eventos passam a aparecer via Gmail/Microsoft 365.
- WhatsApp: **sem integração disponível**.

Pendente: assim que Gmail e/ou Outlook estiverem conectados, atualizar o painel para trocar os dados de exemplo por dados reais.

---

## 5. Instrução permanente do projeto

Definida nas instruções do projeto Cowork "Portifolio": usar os agentes da pasta `C:\Users\gusta\OneDrive\Área de Trabalho\Projetos\Agentes` para executar as tarefas. Os agentes de segurança (13, 02, 03, 06, 05, 15) citados na auditoria da v1 vêm dessa pasta.
