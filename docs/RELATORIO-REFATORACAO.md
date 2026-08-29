# Relatório de Modernização e Refatoração — Portifolio

**Data:** 08/08/2026
**Repositório:** github.com/GustavoHSMachado/Portifolio
**Agentes acionados:** 13 (Legado), 02 (Arquiteto), 03 (Backend), 06 (AppSec), 05 (DBA), 15 (Code Review)
**Stack:** PHP procedural + MySQL (mysqli) + template Namari (HTML/CSS/jQuery)

---

## 1. Sumário executivo

O projeto funciona, mas a área autenticada tinha **4 falhas críticas** que permitiriam
tomada de conta e vazamento de dados de qualquer usuário cadastrado. As correções foram
aplicadas de forma incremental, preservando o comportamento e o layout existentes —
nenhuma página foi reescrita do zero (regra do agente 13).

| Severidade | Qtd | Status |
|---|---|---|
| Crítica | 5 | Corrigida |
| Alta | 6 | Corrigida |
| Média | 7 | Corrigida |
| Baixa | 4 | 3 corrigidas, 1 no backlog |

**Ação manual pendente e urgente:** a senha de aplicativo do Gmail continua exposta no
histórico do Git. Revogue em https://myaccount.google.com/apppasswords.

---

## 2. Findings — Agente 06 (AppSec) + Agente 15 (Code Review)

### 🔴 CRÍTICO

**C1 — Senhas armazenadas em texto plano**
`verifyRegister.php`, `verifyLogin.php`, `verifyAlterData.php`, `VerifyResetPassword.php`
gravavam e comparavam a senha diretamente. Qualquer leitura do banco expunha todas as
credenciais — que usuários costumam reutilizar em outros serviços.
→ **Corrigido:** `password_hash()` / `password_verify()` com `PASSWORD_DEFAULT`, rehash
transparente em `Auth::attempt()`, e script único `database/migrate_passwords.php` para
converter as senhas já existentes.

**C2 — Reset de senha sem token (account takeover)**
`formail.php` enviava `resetPassword.php?email=vitima@x.com`. `VerifyResetPassword.php`
não validava absolutamente nada: bastava um POST com o e-mail da vítima para trocar a
senha dela. Qualquer pessoa da internet podia assumir qualquer conta.
→ **Corrigido:** token de 256 bits, armazenado apenas como hash SHA-256, uso único,
expiração de 30 minutos (`src/PasswordReset.php` + tabela `password_resets`).

**C3 — Segredo versionado no repositório público**
`configEmail.php` e `formail.php` continham a senha de aplicativo do Gmail em texto plano.
→ **Corrigido no código:** credenciais movidas para `.env` (fora do versionamento).
→ **Pendente com você:** revogar a senha antiga. Ela permanece no histórico do Git.

**C4 — SQL Injection**
`formail.php`: `"SELECT * FROM CADASTRO WHERE email = '$email'"` com input direto do POST.
→ **Corrigido:** prepared statement via `Database::run()`.

**C5 — Broken Access Control na área admin**
`pageAdmin.php` verificava apenas `isset($_SESSION["username"])`. Qualquer usuário comum
logado acessava o painel administrativo digitando a URL. Além disso, o redirect apontava
para `login.html`, arquivo inexistente.
→ **Corrigido:** `Auth::requireAdmin()`, com a flag `is_admin` definida no login.

### 🟠 ALTO

**A1 — Bug que quebrava a verificação de usuário duplicado**
`verifyRegister.php` criava `$checkUserStmt` mas lia `$checkUSerStmt` e fechava
`$checkUerStmt` — três nomes diferentes. Em PHP 8 isso gera erro fatal.
→ **Corrigido**, e reforçado com constraints `UNIQUE` no banco.

**A2 — Ausência total de proteção CSRF** em todos os 5 formulários.
→ **Corrigido:** Synchronizer Token Pattern (`src/Csrf.php`), validado em todo POST.

**A3 — XSS refletido/armazenado**
`echo "$name"` e `echo "<p>{$_SESSION["error_message"]}</p>"` sem escape.
→ **Corrigido:** helper `e()` aplicado em toda saída dinâmica.

**A4 — Session fixation.** Nenhum `session_regenerate_id()` após autenticação.
→ **Corrigido** em `Auth::login()`, junto com cookies `HttpOnly` + `SameSite=Lax`.

**A5 — `session_start()` chamado 2–3 vezes por request** em `verifyLogin.php` e
`verifyRegister.php` (gerando warnings), e **ausente** nas páginas de erro que liam
`$_SESSION` — as mensagens de erro simplesmente não apareciam.
→ **Corrigido:** sessão inicializada uma única vez em `bootstrap.php`.

**A6 — `type="senha"` nos campos de senha** de `resetPassword.php`. Tipo inválido em HTML,
o navegador renderiza como texto — a nova senha ficava visível na tela.
→ **Corrigido** para `type="password"`.

### 🟡 MÉDIO

- **M1** — Enumeração de contas: `formail.php` respondia "O e-mail fornecido não está registrado". → resposta genérica.
- **M2** — Sem rate limiting no login. → 5 tentativas / 15 min por sessão.
- **M3** — Validação de senha inexistente (aceitava "1"). → mínimo 8 caracteres, letras + números.
- **M4** — Erros de banco exibidos ao usuário (`die("Conexão Falhou: " . $conn->connect_error)`), vazando estrutura interna. → log no servidor, mensagem genérica na tela.
- **M5** — `id="tel"` duplicado no campo de e-mail em `register.php` (quebra `<label>` e acessibilidade). → corrigido.
- **M6** — `alterData.php` exigia redigitar a senha para alterar nome/telefone, e sobrescrevia a senha em toda edição. → senha agora é opcional; campos vêm preenchidos.
- **M7** — `mysqli` sem tratamento de erro e sem charset definido. → PDO com `ERRMODE_EXCEPTION`, `utf8mb4`, `EMULATE_PREPARES=false`.

### 🟢 BAIXO

- **B1** — `vendor/` versionado + `require` manual do PHPMailer duplicando o autoload. → `.gitignore` ajustado, autoload único.
- **B2** — Bloco de registro de acesso reabria conexão e sessão dentro do HTML. → extraído para `Database::run()` com try/catch.
- **B3** — `composer.json` sem versão de PHP nem extensões declaradas. → declarado (`>=8.1`, pdo_mysql, mbstring, openssl).
- **B4** — *(backlog)* Duplicação massiva de HTML: header, footer e social icons repetidos em 10 arquivos. Ver Fase 2.

---

## 3. Arquitetura alvo — Agente 02

O projeto é pequeno demais para microsserviços ou Clean Architecture completa. A regra
"não adote complexidade sem benefício comprovado" se aplica. O alvo é um **monólito modular
em camadas**, migrado incrementalmente.

```
Portifolio/
├── bootstrap.php              # inicialização única: env, sessão, headers, autoload
├── .env                       # segredos (NÃO versionado)
├── .env.example               # template versionado
├── src/
│   ├── Env.php                # leitor de .env sem dependência externa
│   ├── Database.php           # PDO singleton + helper run()
│   ├── Auth.php               # login, RBAC, guards
│   ├── Csrf.php               # tokens anti-CSRF
│   ├── Mailer.php             # PHPMailer configurado via .env
│   ├── PasswordReset.php      # tokens de redefinição
│   └── Validator.php          # validação server-side
├── database/
│   ├── migrations/*.sql       # schema versionado, com rollback
│   └── migrate_passwords.php  # script de migração única
├── verify*.php                # controllers (POST → ação → redirect)
└── *.php                      # views
```

**Decisões (ADR resumida):**

| Decisão | Motivo | Alternativa descartada |
|---|---|---|
| PDO em vez de mysqli | API consistente, exceções nativas, portabilidade | Manter mysqli — perpetua o tratamento de erro manual |
| Env loader próprio (~50 linhas) | Zero dependência nova para um projeto simples | `vlucas/phpdotenv` — peso desnecessário aqui |
| Classes estáticas | Reduz cerimônia sem container de DI | DI container — complexidade sem benefício nesta escala |
| Manter os nomes de arquivo atuais | Não quebra links, favoritos nem o histórico do Git | Reestruturar em `public/` — Fase 3 |

### Roadmap incremental

**Fase 1 — concluída nesta rodada.** Segurança, camada de dados, migrações.

**Fase 2 — próxima (sugerida).**
Extrair `partials/header.php`, `partials/footer.php` e `partials/social.php`. Hoje o mesmo
bloco de social icons está copiado 20 vezes (2× em cada um dos 10 arquivos) — mudar um link
exige 20 edições. Reduz o projeto em ~40% de linhas.

**Fase 3 — quando houver necessidade real.**
Mover assets e entrypoints para `public/`, deixando `src/`, `vendor/` e `.env` fora do
document root. Hoje `.env` está no diretório servido pelo Apache — protegido apenas pelo
fato de o PHP não servir arquivos `.env`, o que não é garantia. Adicionar `.htaccess`
bloqueando `.env`, `src/` e `database/` é um mitigador barato até lá.

---

## 4. Passos para rodar (ordem obrigatória)

```bash
# 1. Instalar dependências
composer install

# 2. Configurar segredos
cp .env.example .env
#    edite .env com credenciais de banco e a NOVA senha de app do Gmail

# 3. Backup do banco antes de qualquer migração
mysqldump -u root -p site > backup_antes_migracao.sql

# 4. Migrar o schema
mysql -u root -p site < database/migrations/002_hash_senhas_e_reset.sql

# 5. Converter as senhas existentes para hash (uma única vez)
php database/migrate_passwords.php
```

> ⚠️ Sem o passo 5, **nenhum usuário existente consegue logar**, porque o login agora usa
> `password_verify()` e as senhas no banco ainda estão em texto plano.

---

## 5. Validação executada — Agente 07 (QA)

- `php -l` em todos os 21 arquivos PHP (excluindo `vendor/`) — sem erros de sintaxe.
- Smoke test de `bootstrap.php` em PHP 8.1: carregamento das 7 classes, geração e
  verificação de token CSRF, escape HTML, regras do `Validator` (casos válido e inválido),
  ciclo `password_hash`/`password_verify` — todos passaram.

**Não testado (requer MySQL e servidor web):** fluxo end-to-end de login, registro,
alteração de dados e reset de senha; envio real de e-mail. Recomendado validar
manualmente após rodar as migrações.

---

## 6. Backlog priorizado

| # | Item | Agente | Esforço |
|---|---|---|---|
| 1 | **Revogar a senha de app do Gmail exposta** | 06 | 5 min |
| 2 | Considerar limpar o histórico do Git (`git filter-repo`) ou recriar o repositório | 06 | 1h |
| 3 | Extrair partials de header/footer/social (Fase 2) | 13 | 2h |
| 4 | Testes automatizados dos fluxos de auth (PHPUnit) | 07 | 4h |
| 5 | `.htaccess` bloqueando `.env`, `src/`, `database/` | 09 | 15 min |
| 6 | Migrar para HTTPS e ativar cookie `secure` | 09 | — |
| 7 | Rate limiting persistente (por IP, no banco) em vez de por sessão | 06 | 2h |
| 8 | Reestruturar em `public/` (Fase 3) | 02 | 3h |

---

## 7. Parecer final — Agente 15

**Aprovado com ressalva.** As vulnerabilidades críticas de código foram corrigidas e
validadas por análise estática e smoke test. A ressalva é o item 1 do backlog: o segredo
exposto é uma credencial real, ainda válida, em repositório público. Enquanto não for
revogada, o risco permanece independentemente do código.
