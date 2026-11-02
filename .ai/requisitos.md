# Requisitos — Portifolio v2

> Extraídos do código em vigor (rotas, services, models, migrations e testes) em
> 10/09/2026. O que não pôde ser confirmado está marcado como tal.

---

## 1. Requisitos funcionais

### RF-01 · Cadastro de conta
- Nome (3–120), e-mail (até 190), telefone (10 a 13 dígitos), senha com
  confirmação e `acceptedTerms` explícito — nunca pré-marcado no front. Versão
  dos documentos, data e IP ficam em `legal_acceptances`.
- A resposta é **idêntica** para e-mail novo e e-mail já cadastrado (201, mesmo
  corpo) — sem enumeração de contas por mensagem, tempo ou status.
- Pode ser desligado por ambiente com `REGISTRATION_ENABLED`.
- O e-mail de confirmação sai **depois** do commit da transação.

### RF-02 · Confirmação de e-mail
- Link com token de uso único (`FRONTEND_URL/confirmar-email?token=`), TTL
  `EMAIL_VERIFICATION_TTL` (60 min por padrão). Só o hash do token vai ao banco.
- Reenvio disponível; ações sensíveis ficam bloqueadas por
  `RequireVerifiedEmail` enquanto não houver confirmação.

### RF-03 · Login em dois fatores
1. E-mail + senha. Acerto **não** abre sessão: gera um código de 7 dígitos
   (`login_2fa`), enviado por e-mail, válido por `LOGIN_2FA_TTL` (10 min).
2. O código é validado em `/api/v1/auth/login/verify` e só então saem o access
   token e o refresh token.
- Mensagem única para "não existe", "senha errada" e "código inválido/expirado".
- 5 tentativas erradas de senha travam a conta por 15 minutos
  (`User::registerFailedAttempt`); 5 tentativas erradas do código invalidam o
  código (`VerificationToken::MAX_ATTEMPTS`).

### RF-04 · Sessão
- Access token JWT de 15 minutos, guardado só em memória no navegador.
- Refresh token opaco, rotativo, por família, em cookie `httpOnly`,
  `SameSite=Strict`, validade de 30 dias.
- Reuso de um token já rotacionado derruba a família inteira, exceto dentro da
  janela `REFRESH_ROTATION_GRACE` (10 s), que trata a corrida entre abas.
- Logout revoga o refresh token.

### RF-05 · Senha
- Recuperação por **código** enviado ao e-mail. TTL `PASSWORD_RESET_TTL`: o
  padrão do código é **15 min**; o `.env.example` sugere 30 — quem configurar
  precisa saber que o arquivo manda.
- Troca autenticada em dois passos: confere a senha atual e exige código por
  e-mail (reaproveita o propósito `password_reset`, então um pedido de "esqueci
  a senha" em paralelo deixa valendo só o código mais recente).
- As últimas senhas da conta ficam em `password_history` e são recusadas —
  5 por padrão, ajustável por `PASSWORD_HISTORY_SIZE`, a senha em vigor
  inclusive.
- Trocar a senha derruba todas as sessões da conta.

### RF-06 · Portfólio público
- `/api/v1/content` devolve perfil, formação, experiências, habilidades e a
  contagem de projetos, sem autenticação.
- A home é renderizada no servidor e revalidada a cada 60 segundos.
- `/curriculo` entrega o PDF que o dono mantém em `public/`, por link com
  `download` — não é gerado pela aplicação.
- A home publica dados estruturados (JSON-LD).

### RF-07 · Projetos
- Listagem e detalhe exigem sessão (`Authenticate`) desde 23/08/2026.
- Cada projeto tem `slug` único (`alpha_dash`, até 120 caracteres).

### RF-08 · Mensagens
- Formulário público envia sugestão, dúvida ou orçamento; limite de 5 por hora
  por IP.
- O painel lista as recentes e marca como lidas. Expurgo após 365 dias.

### RF-09 · Área administrativa
- Só para `Authenticate + RequireAdmin` (papel `admin` **e**, quando definido,
  e-mail na allowlist `ADMIN_EMAIL`).
- Conteúdo: criar, editar e excluir perfil, formação, experiências, habilidades
  e projetos.
- Contas: listar, bloquear, liberar e excluir. O servidor recusa a ação na
  própria conta e na conta de `ADMIN_EMAIL`. Excluir **anonimiza** (soft delete)
  em vez de apagar a linha, para não deixar a auditoria órfã.
- Auditoria: consulta dos eventos registrados em `audit_log`.
- Aparência: cor de destaque (apenas `#rrggbb`) e títulos/subtítulos das seções,
  com as demais cores derivadas e o contraste **exibido** antes de salvar — a
  decisão final é de quem edita, o servidor não recusa cor ilegível.
- Salvar dispara `/api/revalidar` no Next, que descarta o cache da home.

### RF-10 · Auditoria
- `audit_log` registra 19 tipos de evento declarados em `Models\AuditLog`
  (entrada, senha errada, código errado, logout, conta bloqueada, cadastro,
  confirmação, troca e redefinição de senha, reuso de sessão, conteúdo salvo e
  excluído, aparência ajustada, mensagem recebida e as ações de gestão).
- Guarda o que aconteceu, nunca o segredo envolvido. Expurgo após 180 dias.

### RF-11 · Saúde
- `/health` (vivo) e `/health/ready` (banco de pé), ambos fora do rate limit.

---

## 2. Requisitos não funcionais

### Segurança
- Nenhum segredo no código: tudo em `.env`, com `.env.example` documentado;
  Gitleaks no CI.
- Senha em Argon2id, exclusivamente por `Support\Hash`.
- Toda query preparada; zero concatenação de entrada em SQL.
- `JWT_SECRET` com no mínimo 32 caracteres (a aplicação recusa iniciar abaixo
  disso).
- Cabeçalhos de segurança na API (`SecurityHeaders`) e CSP no site
  (`next.config.mjs`), com `connect-src` liberado só para a origem da API.
- Rate limit persistido em banco, por IP + rota: padrão 120/60 s; login 5/15 min;
  verificação do código 10/15 min; cadastro, recuperação e reenvio 3/hora;
  redefinição 5/hora; mensagens 5/hora.
- Erro nunca vaza stack trace nem segredo em log; `request_id` correlaciona os
  registros.
- Política de senha: 7 a 128 caracteres, com maiúscula, minúscula, número e
  símbolo; recusa caractere repetido e uma lista de senhas comuns.

### Qualidade
- PHPStan nível 8 sem erros; PHP-CS-Fixer; PHPUnit (unidade e integração),
  executados em PHP 8.3 **e** 8.4 no CI.
- Biome, TypeScript sem erro, Knip sem código morto, Vitest, Playwright.
- Mutação instrumentada: Infection com `minMsi` 70 no backend; Stryker no
  frontend com limiar de quebra em 55.
- `quality-gate` consolida o CI; merge só com CI verde e ao menos 1 aprovação.

### Performance
- Orçamento de bundle: 400 KB de `.next/static` **medido em gzip** — é o que o
  visitante baixa. Última medição registrada: 319 KB (29/08/2026).
- Lighthouse CI: 0,9 em performance, boas práticas e SEO; 0,95 em
  acessibilidade.
- Imagens em AVIF/WebP; `optimizePackageImports` para o framer-motion.
- Toda listagem com índice; sem N+1; sem `SELECT *` em endpoint de listagem.

### Acessibilidade e responsividade
- Layout íntegro a partir de 320 px, alvos de toque de 44 px, sem rolagem
  horizontal.
- `prefers-reduced-motion` respeitado, com exceção para indicadores de
  carregamento (`[data-motion-loop]`).

### Privacidade e LGPD
- Consentimento demonstrável: versão dos documentos, data e IP em
  `legal_acceptances`. `TERMS_VERSION`/`PRIVACY_VERSION` no `.env` precisam
  bater com `src/lib/legal.ts`.
- Sentry (quando houver DSN) com `send_default_pii = false`.
- O conteúdo do portfólio não guarda endereço, CEP nem data de nascimento.

### Operação
- Expurgo manual (`database/purge.php`) — **precisa de agendamento em
  produção**, hoje inexistente.
- Migrations versionadas com rollback; o schema dos testes é o mesmo de
  produção.

---

## 3. Não identificado / a confirmar

- Metas numéricas de disponibilidade, RTO/RPO e política de backup em produção.
- Requisito de retenção legal dos dados de auditoria (os 180 dias vieram de
  decisão técnica, não de exigência documentada).
- Revisão jurídica dos Termos e da Política de Privacidade.
