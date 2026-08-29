#!/usr/bin/env bash
#
# Cria todas as Issues do backlog no GitHub.
#
# PRÉ-REQUISITOS
#   1. GitHub CLI instalado:  https://cli.github.com
#   2. Autenticado:           gh auth login
#   3. Executado de dentro do repositório clonado.
#
# USO
#   bash v2/scripts/criar-issues.sh --dry-run   # mostra o que faria, sem criar
#   bash v2/scripts/criar-issues.sh             # cria de verdade
#
# O script é idempotente: uma Issue com o mesmo título não é criada duas vezes.

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# ------------------------------------------------------------------
# Verificações
# ------------------------------------------------------------------
command -v gh >/dev/null 2>&1 || {
  echo "❌ GitHub CLI não encontrado. Instale em https://cli.github.com"
  exit 1
}

gh auth status >/dev/null 2>&1 || {
  echo "❌ Não autenticado. Rode: gh auth login"
  exit 1
}

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "📦 Repositório: $REPO"
$DRY_RUN && echo "🔍 MODO SIMULAÇÃO — nada será criado"
echo

# ------------------------------------------------------------------
# Labels
# ------------------------------------------------------------------
criar_label() {
  local nome="$1" cor="$2" desc="$3"
  if $DRY_RUN; then
    echo "  [simulação] label: $nome"
  else
    gh label create "$nome" --color "$cor" --description "$desc" --force >/dev/null 2>&1 \
      && echo "  ✓ $nome" || echo "  · $nome (já existia)"
  fi
}

echo "🏷️  Labels"
criar_label "correção"     "d73a4a" "Algo quebrado, inseguro ou divergente do esperado"
criar_label "melhoria"     "fbca04" "Funciona, mas pode ficar melhor"
criar_label "nova função"  "0e8a16" "Capacidade que o sistema ainda não tem"
criar_label "crítica"      "b60205" "Severidade crítica — tratar imediatamente"
criar_label "segurança"    "5319e7" "Toca autenticação, autorização ou dados sensíveis"
criar_label "backend"      "1d76db" "API em PHP"
criar_label "frontend"     "c5def5" "Aplicação Next.js"
criar_label "infra"        "0052cc" "CI/CD, deploy, observabilidade"
criar_label "ux"           "e99695" "Interface, movimento e acessibilidade"
criar_label "documentação" "006b75" "Documentação e contexto"
echo

# ------------------------------------------------------------------
# Issues
# ------------------------------------------------------------------
criar_issue() {
  local titulo="$1" labels="$2" corpo="$3"

  # Idempotência: não recria título já existente.
  local existente
  existente=$(gh issue list --state all --search "\"$titulo\" in:title" --json title -q '.[].title' 2>/dev/null || true)

  if echo "$existente" | grep -Fxq "$titulo"; then
    echo "  · já existe: $titulo"
    return
  fi

  if $DRY_RUN; then
    echo "  [simulação] $titulo  [$labels]"
  else
    gh issue create --title "$titulo" --label "$labels" --body "$corpo" >/dev/null
    echo "  ✓ $titulo"
  fi
}

echo "📋 Issues"
echo

# ============ CORREÇÕES (v1) ============
echo "🔴 Correções"

criar_issue \
  "[Correção] Revogar senha de aplicativo do Gmail exposta no histórico do Git" \
  "correção,crítica,segurança" \
  "## Comportamento atual
A senha de aplicativo do Gmail está em texto plano em \`configEmail.php\` e \`formail.php\`, versionada em repositório público. Foi removida do código atual, mas **permanece no histórico do Git** e continua válida.

## Comportamento esperado
Nenhuma credencial válida acessível no repositório.

## Passos
1. Revogar a senha antiga em https://myaccount.google.com/apppasswords
2. Gerar uma nova e colocar em \`.env\` (\`MAIL_PASSWORD\`)
3. Avaliar \`git filter-repo\` para limpar o histórico, ou recriar o repositório
4. Habilitar o alerta de segredos do GitHub

## Critério de aceite
- [ ] Senha antiga revogada e confirmada como inválida
- [ ] Nova senha apenas no \`.env\` (não versionado)
- [ ] Gitleaks rodando no CI sem apontar segredos
- [ ] Decisão sobre limpeza de histórico registrada

**Severidade:** Crítica"

criar_issue \
  "[Correção] Reset de senha da v1 permite tomada de conta sem token" \
  "correção,crítica,segurança,backend" \
  "## Comportamento atual
\`VerifyResetPassword.php\` troca a senha apenas com o e-mail no POST, sem validar nenhum token. Qualquer pessoa que saiba o e-mail de um usuário assume a conta.

## Comportamento esperado
Troca de senha exige token de uso único, com expiração, entregue por e-mail.

## Critério de aceite
- [x] Token de 256 bits, armazenado como hash SHA-256
- [x] Expiração de 30 minutos e consumo único
- [ ] Teste de integração cobrindo token inválido, expirado e reutilizado

**Severidade:** Crítica
**Nota:** corrigido na v1 e reimplementado na v2 (\`src/Models/VerificationToken.php\`). Falta o teste de regressão."

criar_issue \
  "[Correção] Senhas armazenadas em texto plano no banco" \
  "correção,crítica,segurança,backend" \
  "## Comportamento atual
A v1 grava e compara senhas diretamente, sem hash. Um dump do banco expõe todas as credenciais.

## Comportamento esperado
Senhas em Argon2id. Nenhum caminho grava texto plano.

## Critério de aceite
- [x] \`password_hash\`/\`password_verify\` em todos os fluxos
- [x] Script de migração das senhas existentes
- [ ] Migração executada em produção e verificada
- [ ] Teste garantindo que o valor persistido nunca é igual ao texto plano

**Severidade:** Crítica"

criar_issue \
  "[Correção] SQL Injection em formail.php" \
  "correção,crítica,segurança,backend" \
  "## Comportamento atual
\`\$query = \"SELECT * FROM CADASTRO WHERE email = '\$email'\"\` concatena input do POST.

## Comportamento esperado
Prepared statement.

## Critério de aceite
- [x] Query parametrizada
- [ ] Teste com payload de injeção confirmando ausência de efeito

**Severidade:** Crítica"

criar_issue \
  "[Correção] Painel admin acessível por qualquer usuário autenticado" \
  "correção,crítica,segurança,backend" \
  "## Comportamento atual
\`pageAdmin.php\` verifica apenas \`isset(\$_SESSION['username'])\`. Qualquer usuário comum acessa digitando a URL. O redirect ainda aponta para \`login.html\`, arquivo inexistente.

## Comportamento esperado
Verificação de papel no servidor.

## Critério de aceite
- [x] Guard de papel aplicado (\`Auth::requireAdmin\` / middleware \`RequireAdmin\`)
- [ ] Teste E2E: usuário comum recebe 403 ao tentar \`/admin\`

**Severidade:** Crítica"

criar_issue \
  "[Correção] Ausência de proteção CSRF em todos os formulários" \
  "correção,segurança,backend" \
  "## Comportamento atual
Nenhum formulário da v1 valida token anti-CSRF.

## Critério de aceite
- [x] Synchronizer Token Pattern na v1
- [x] Cookie \`SameSite=Strict\` na v2
- [ ] Teste confirmando rejeição de requisição forjada

**Severidade:** Alta"

criar_issue \
  "[Correção] XSS por saída não escapada" \
  "correção,segurança,frontend" \
  "## Comportamento atual
\`echo \"\$name\"\` e \`echo \$_SESSION['error_message']\` sem escape.

## Critério de aceite
- [x] Helper \`e()\` aplicado em toda saída dinâmica da v1
- [x] \`dangerouslySetInnerHTML\` bloqueado pelo Biome na v2
- [ ] Teste com payload \`<script>\` confirmando escape

**Severidade:** Alta"

criar_issue \
  "[Correção] Enumeração de contas nos fluxos de e-mail" \
  "correção,segurança,backend" \
  "## Comportamento atual
A v1 responde \"O e-mail fornecido não está registrado\", permitindo enumerar usuários.

## Critério de aceite
- [x] Resposta genérica idêntica nos dois casos
- [x] Tempo de resposta constante (\`Hash::burn()\`)
- [ ] Teste comparando resposta e latência entre e-mail existente e inexistente

**Severidade:** Média"

# ============ NOVAS FUNÇÕES (v2) ============
echo
echo "🟢 Novas funções"

criar_issue \
  "[Nova função] Núcleo MVC da API v2 (Router, Container, Request, Response)" \
  "nova função,backend" \
  "## Problema
A v1 não tem camadas: HTML, SQL e regra de negócio no mesmo arquivo. Impossível testar e arriscado de mudar.

## Solução
Núcleo MVC próprio em PHP 8.3, PSR-4, com roteador, pipeline de middleware e container de DI com autowiring.

## Escopo
**Dentro:** Router, Container, Request, Response, Config, HttpException, App
**Fora:** framework completo, ORM, sistema de eventos

## Critérios de aceite
- [x] Roteamento com parâmetros de URL
- [x] Pipeline de middleware ordenado
- [x] Container com autowiring por reflexão
- [x] Testes unitários do roteador
- [ ] PHPStan nível 8 sem erros"

criar_issue \
  "[Nova função] Autenticação com JWT e refresh token rotativo" \
  "nova função,segurança,backend" \
  "## Problema
A v1 usa sessão PHP com o login em texto na sessão, sem expiração nem revogação. Não serve para um front separado.

## Solução
Access token JWT curto (15 min) em memória no front + refresh token opaco em cookie httpOnly, rotativo, com detecção de reuso por família.

## Critérios de aceite
- [x] Access token com \`exp\`, \`iss\`, \`aud\`, \`jti\`
- [x] Refresh rotativo; reuso revoga a família inteira
- [x] Trava de conta após 5 tentativas falhas
- [x] Testes de token adulterado e expirado
- [ ] Teste E2E do ciclo completo de sessão"

criar_issue \
  "[Nova função] Confirmação de e-mail por token" \
  "nova função,segurança,backend" \
  "## Problema
A v1 aceita qualquer e-mail no cadastro, sem provar que pertence ao usuário.

## Solução
Token de uso único com expiração de 60 minutos, enviado por e-mail. Ações sensíveis bloqueadas até a confirmação.

## Critérios de aceite
- [x] Emissão, validação e consumo do token
- [x] Middleware \`RequireVerifiedEmail\`
- [x] Reenvio com rate limit
- [ ] Tela de confirmação no front
- [ ] Teste E2E do fluxo"

criar_issue \
  "[Nova função] Recuperação e troca de senha (v2)" \
  "nova função,segurança,backend,frontend" \
  "## Problema
O fluxo da v1 é inseguro e não tem troca de senha para usuário logado.

## Solução
Três fluxos: esqueci a senha (token por e-mail), redefinir com token e trocar senha autenticado (exige senha atual).

## Critérios de aceite
- [x] Token de uso único, 30 min, hash no banco
- [x] Troca de senha revoga todas as sessões
- [x] Notificação por e-mail de senha alterada
- [x] Nova senha não pode ser igual à atual
- [ ] Telas do front (esqueci, redefinir, alterar)
- [ ] Testes E2E dos três fluxos"

criar_issue \
  "[Nova função] Design system com tokens e primitivas de motion" \
  "nova função,ux,frontend" \
  "## Problema
A v1 usa um template pronto com CSS espalhado, sem tokens. Manter consistência é impossível.

## Solução
\`tokens.css\` como fonte única de cor, espaço, tipografia, forma e movimento. \`lib/motion.ts\` como vocabulário de animação.

## Critérios de aceite
- [x] Tokens definidos, com Open Sans e o laranja da v1 preservados
- [x] Variantes de motion reutilizáveis
- [x] \`prefers-reduced-motion\` respeitado
- [x] Button, Input, Modal, Toast, Skeleton
- [ ] Storybook ou página de catálogo dos componentes
- [ ] Teste de contraste AA em todas as combinações de cor"

criar_issue \
  "[Nova função] Telas de autenticação no front (cadastro, confirmação, recuperação)" \
  "nova função,frontend,ux" \
  "## Problema
Só a tela de login existe. Faltam as demais para o fluxo fechar.

## Escopo
**Dentro:** /criar-conta, /confirmar-email, /recuperar-senha, /redefinir-senha, /painel
**Fora:** área admin (issue separada)

## Critérios de aceite
- [ ] Todas as telas seguem o padrão de \`/entrar\`
- [ ] Skeleton em todo carregamento
- [ ] Erro por campo vindo do 422 da API
- [ ] Estado vazio e de erro tratados
- [ ] Acessível por teclado e leitor de tela
- [ ] Funciona com \`prefers-reduced-motion\`
- [ ] E2E de cada fluxo"

criar_issue \
  "[Nova função] Migrar conteúdo e portfólio da v1 para a v2" \
  "nova função,frontend" \
  "## Problema
O conteúdo textual e a estrutura do portfólio ainda estão só na v1.

## Escopo
**Dentro:** textos, seções, tipografia Open Sans, imagens otimizadas
**Fora:** o CSS e o JS do template Namari (serão reescritos)

## Critérios de aceite
- [ ] Todo o texto migrado
- [ ] Imagens em formato moderno com lazy loading
- [ ] Nenhuma dependência de jQuery
- [ ] Lighthouse: performance ≥ 90, acessibilidade ≥ 95"

criar_issue \
  "[Nova função] Esteira de CI com quality gate" \
  "nova função,infra" \
  "## Problema
Não existe verificação automática. Qualquer coisa pode entrar na main.

## Critérios de aceite
- [x] Workflow com jobs paralelos e gate final
- [x] Commitlint, Biome, TypeScript, Knip
- [x] PHPUnit, PHPStan, PHP-CS-Fixer
- [x] Playwright, Lighthouse CI, Gitleaks, CodeQL
- [ ] Branch protection ativada na main exigindo o quality-gate
- [ ] Token do Codecov configurado nos secrets"

criar_issue \
  "[Nova função] Observabilidade: logs estruturados, Sentry e OpenTelemetry" \
  "nova função,infra" \
  "## Problema
A v1 não tem log algum. Um erro em produção é invisível.

## Solução
Log JSON com \`request_id\` correlacionando front e back, Sentry para exceções e OTLP para traces — compatível com Datadog e New Relic sem acoplar o código.

## Critérios de aceite
- [x] Logger com redação automática de campos sensíveis
- [x] \`X-Request-Id\` propagado na resposta
- [x] Sentry ativado por \`SENTRY_DSN\`
- [ ] Exporter OTLP configurado e validado
- [ ] Dashboard com taxa de erro, latência p95 e falhas de login
- [ ] Alertas acionáveis definidos"

criar_issue \
  "[Nova função] Ambiente local containerizado" \
  "nova função,infra" \
  "## Problema
Subir o projeto exigia instalar PHP, Composer, MySQL, Node e configurar SMTP na mão. Cada máquina virava um ambiente diferente, e \"na minha máquina funciona\" deixa de ser piada.

## Solução
docker-compose com MySQL, API, web, Mailpit (captura de e-mail) e Adminer. Migrações aplicadas no boot pelo entrypoint. Makefile com atalhos.

## Critérios de aceite
- [x] \\`make up\\` sobe a stack completa
- [x] Migrações aplicadas automaticamente no boot
- [x] Mailpit capturando e-mails em http://localhost:8025
- [x] Hot reload funcionando em backend e frontend
- [x] Dockerfiles com estágio de produção separado, sem ferramentas de build
- [ ] **Validar em uma máquina real** — a stack foi escrita mas não executada
- [ ] Documentar deploy de produção usando os estágios \\`prod\\`"

criar_issue \
  "[Nova função] Termos de uso e política de privacidade" \
  "nova função,documentação" \
  "## Problema
O sistema coleta nome, e-mail, telefone e IP sem nenhum aviso legal. LGPD aplicável.

## Escopo
**Dentro:** minutas de Termos de Uso e Política de Privacidade, páginas no front, aceite no cadastro, base legal e prazo de retenção
**Fora:** aprovação jurídica — depende de advogado

## Critérios de aceite
- [ ] Minutas redigidas cobrindo dados coletados, finalidade, base legal, retenção e direitos do titular
- [ ] Páginas publicadas e linkadas no rodapé
- [ ] Checkbox de aceite no cadastro, com versão registrada
- [ ] Fluxo de exclusão de conta e exportação de dados
- [ ] **Revisão e aprovação por advogado** ⚠️ bloqueante para produção

⚠️ Os textos gerados são minutas técnicas, não aconselhamento jurídico. Exigem revisão profissional antes de irem ao ar."

# ============ MELHORIAS ============
echo
echo "🟡 Melhorias"

criar_issue \
  "[Melhoria] Extrair partials duplicados da v1" \
  "melhoria,frontend" \
  "## Situação atual
Header, footer e social icons estão copiados em 10 arquivos — 20 cópias do bloco de ícones. Mudar um link exige 20 edições.

## Proposta
Extrair \`partials/header.php\`, \`partials/footer.php\` e \`partials/social.php\`.

## Benefício
~40% menos linhas na v1 e uma única fonte de verdade enquanto o legado existir.

## Riscos
Baixo. Mudança mecânica, verificável por diff visual.

## Critério de aceite
- [ ] Partials extraídos e incluídos nos 10 arquivos
- [ ] Nenhuma diferença visual (comparação antes/depois)"

criar_issue \
  "[Melhoria] Reestruturar a v1 com document root em public/" \
  "melhoria,segurança,infra" \
  "## Situação atual
\`.env\`, \`src/\` e \`database/\` estão no diretório servido pelo Apache. A proteção depende de o PHP não servir \`.env\` — o que não é garantia.

## Proposta
Curto prazo: \`.htaccess\` bloqueando \`.env\`, \`src/\`, \`database/\`.
Médio prazo: mover entrypoints e assets para \`public/\`.

## Critério de aceite
- [ ] \`.htaccess\` bloqueando os caminhos sensíveis
- [ ] Requisição a \`/.env\` retorna 403
- [ ] Plano de migração para \`public/\` documentado"

criar_issue \
  "[Melhoria] Rate limit por IP com sliding window" \
  "melhoria,segurança,backend" \
  "## Situação atual
Janela fixa em MySQL. Funciona, mas permite o dobro de tentativas na virada da janela e cresce a tabela \`rate_limits\`.

## Proposta
Avaliar Redis com sliding window quando houver tráfego que justifique. Enquanto isso, adicionar cron de limpeza.

## Benefício
Elimina o burst na virada e reduz carga no banco.

## Riscos
Adiciona dependência de infraestrutura — só vale se o tráfego justificar. Ver princípio de evitar overengineering.

## Critério de aceite
- [ ] Cron de \`RateLimiter::purge()\` configurado
- [ ] Decisão sobre Redis registrada como ADR
- [ ] Teste do comportamento na virada de janela"

criar_issue \
  "[Melhoria] Elevar cobertura de testes e ativar Stryker no gate" \
  "melhoria,infra" \
  "## Situação atual
Cobertura mínima em 70% e teste de mutação apenas informativo.

## Proposta
Subir gradualmente para 85% e tornar o Stryker bloqueante em \`src/lib\` e \`src/Services\`.

## Benefício
Cobertura alta com mutação baixa é falsa segurança. O Stryker mede se os testes realmente detectam mudança de comportamento.

## Critério de aceite
- [ ] Cobertura ≥ 85% em backend e frontend
- [ ] MSI do Stryker ≥ 70% e bloqueante
- [ ] Infection configurado no backend"

criar_issue \
  "[Melhoria] Sincronizar schema SQLite dos testes com as migrations MySQL" \
  "melhoria,backend" \
  "## Situação atual
\`tests/Integration/AuthFlowTest.php\` recria o schema em SQLite à mão. Se uma migration mudar, o teste não acompanha e pode passar verde com o schema errado.

## Proposta
Gerar o schema de teste a partir das migrations, ou rodar a suíte de integração contra MySQL efêmero em container.

## Critério de aceite
- [ ] Uma única fonte de verdade para o schema
- [ ] Teste falha se a migration divergir do schema de teste"

criar_issue \
  "[Melhoria] Documentar a API com OpenAPI" \
  "melhoria,documentação,backend" \
  "## Situação atual
Os endpoints só estão descritos em prosa.

## Proposta
Especificação OpenAPI 3.1 versionada, com validação de contrato no CI.

## Benefício
Contrato explícito entre front e back; quebra de compatibilidade vira erro de CI.

## Critério de aceite
- [ ] \`openapi.yaml\` cobrindo todos os endpoints
- [ ] Validação de contrato no CI
- [ ] Documentação navegável publicada"

echo
echo "✅ Concluído."
$DRY_RUN && echo "   Rode sem --dry-run para criar de verdade."
echo
echo "Próximo passo: bash v2/scripts/configurar-repo.sh"
