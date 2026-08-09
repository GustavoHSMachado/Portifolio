# Passo a passo — Gustavo

Guia de execução do que foi preparado. Siga na ordem. Cada bloco diz **o que
você digita**, **o que deve acontecer** e **o que fazer se der errado**.

Tempo estimado: 40–60 minutos na primeira vez.

---

## Parte 0 — Antes de começar

**Com Docker** (recomendado) você precisa apenas de: **Git**, **GitHub CLI** e
**Docker Desktop**. PHP, MySQL, Node e servidor de e-mail vêm nos containers.

**Sem Docker**, você precisará também de PHP 8.3+, Composer, Node 20+ e MySQL 8 —
ver a Parte 6.

### 0.1 Verificar o que já está instalado

Abra o **PowerShell** e rode:

```powershell
git --version
gh --version
docker --version
```

Cada comando deve imprimir uma versão. O que der "não é reconhecido" precisa ser
instalado.

### 0.2 Instalar o que faltar

A forma mais simples no Windows é o **winget** (já vem no Windows 11):

```powershell
winget install --id Git.Git
winget install --id GitHub.cli
winget install --id Docker.DockerDesktop
winget install --id ezwinports.make
```

`make` é opcional — ele só encurta comandos. Sem ele, use `docker compose ...`
diretamente; o guia mostra as duas formas.

> **Importante:** depois de instalar, **feche e reabra o PowerShell**. Programas
> novos só aparecem no PATH em uma janela nova.

---

## Parte 1 — Autenticar no GitHub

Isso é o que permite ao script criar as Issues por você.

### 1.1 Login

```powershell
gh auth login
```

Responda as perguntas assim:

| Pergunta | Resposta |
|---|---|
| What account do you want to log into? | `GitHub.com` |
| What is your preferred protocol? | `HTTPS` |
| Authenticate Git with your GitHub credentials? | `Yes` |
| How would you like to authenticate? | `Login with a web browser` |

O terminal vai mostrar um código de 8 caracteres tipo `A1B2-C3D4`. **Copie esse
código**, aperte Enter, o navegador abre, cole o código e autorize.

### 1.2 Confirmar

```powershell
gh auth status
```

Deve aparecer `✓ Logged in to github.com as GustavoHSMachado`.

**Se falhar:** rode `gh auth logout` e repita o 1.1.

---

## Parte 2 — Criar as Issues

### 2.1 Entrar na pasta do projeto

```powershell
cd "$env:USERPROFILE\OneDrive\Área de Trabalho\Projetos\Portifolio"
```

Confirme que está no lugar certo:

```powershell
gh repo view --json nameWithOwner
```

Deve responder `GustavoHSMachado/Portifolio`.

### 2.2 Simular primeiro

**Sempre rode a simulação antes.** Ela mostra exatamente o que seria criado, sem
criar nada:

```powershell
bash v2/scripts/criar-issues.sh --dry-run
```

Você verá uma lista de 10 labels e 23 issues com `[simulação]` na frente.

> **Se der "bash não é reconhecido":** o Git para Windows traz o bash. Use o
> **Git Bash** (procure no menu Iniciar) em vez do PowerShell, ou rode:
> ```powershell
> & "C:\Program Files\Git\bin\bash.exe" v2/scripts/criar-issues.sh --dry-run
> ```

### 2.3 Criar de verdade

Se a simulação mostrou o que você esperava:

```powershell
bash v2/scripts/criar-issues.sh
```

Cada linha com `✓` é uma issue criada. Leva 1–2 minutos.

### 2.4 Conferir

```powershell
gh issue list --limit 30
```

Ou abra: https://github.com/GustavoHSMachado/Portifolio/issues

**Você deve ver 23 issues:** 8 correções, 11 novas funções, 6 melhorias.

> O script é **idempotente**: se você rodar de novo, ele detecta os títulos que
> já existem e não duplica. Pode rodar sem medo.

---

## Parte 3 — Configurar o repositório

Isso cria a branch `develop` e protege a `main` para que nada entre sem passar
pela esteira.

```powershell
bash v2/scripts/configurar-repo.sh
```

O script tenta ativar a proteção de branch automaticamente. **Se aparecer um
aviso**, configure na mão:

1. Abra https://github.com/GustavoHSMachado/Portifolio/settings/branches
2. Clique em **Add branch protection rule**
3. Branch name pattern: `main`
4. Marque:
   - ☑ Require a pull request before merging → Required approvals: **1**
   - ☑ Require status checks to pass before merging → busque e marque **Quality Gate**
   - ☑ Require conversation resolution before merging
   - ☐ Allow force pushes (deixe **desmarcado**)
5. **Create**

### 3.1 Cadastrar o token do Codecov (opcional, mas recomendado)

1. Entre em https://codecov.io com sua conta do GitHub
2. Adicione o repositório Portifolio
3. Copie o *Upload Token*
4. Rode:

```powershell
gh secret set CODECOV_TOKEN
```

Cole o token quando pedir e aperte Enter.

---

## Parte 4 — Subir o código da v2

O código está na sua pasta local mas ainda não foi para o GitHub.

### 4.1 Criar a branch de trabalho

```powershell
git checkout -b feat/fundacao-v2
```

### 4.2 Ver o que será enviado

```powershell
git status
```

**Antes de continuar, confirme que NÃO aparece nenhum arquivo `.env`.** Só
`.env.example` pode ser versionado. Se aparecer `.env`, pare e me avise.

### 4.3 Commitar

```powershell
git add .
git commit -m "feat(api): fundacao da v2 com MVC, auth e esteira de qualidade

Adiciona a arquitetura completa da v2:
- backend PHP 8.3 com MVC proprio, PSR-4 e API REST
- autenticacao com JWT e refresh token rotativo
- confirmacao de email e recuperacao de senha por token
- middlewares de seguranca, rate limit e RBAC
- frontend Next.js com design system e primitivas de motion
- esteira de CI com quality gate

Refs #9 #10 #11 #12 #13 #16"
```

> Ajuste os números das issues conforme os que o GitHub gerou. Veja com
> `gh issue list`.

### 4.4 Enviar

```powershell
git push -u origin feat/fundacao-v2
```

### 4.5 Abrir o Pull Request

```powershell
gh pr create --base develop --fill
```

Isso abre o PR usando o template. **Preencha as quatro seções obrigatórias:**
issue relacionada, o que mudou, como foi validado, riscos e limitações.

Para editar no navegador:

```powershell
gh pr view --web
```

---

---

## Parte 5 — Rodar tudo com Docker (caminho recomendado)

Com Docker você não instala PHP, MySQL, Node nem servidor de e-mail. Um comando
sobe tudo já configurado e conversando entre si.

### 5.1 Instalar o Docker Desktop

```powershell
winget install --id Docker.DockerDesktop
```

Depois de instalar, **abra o Docker Desktop** e espere o ícone da baleia ficar
estável. Confirme:

```powershell
docker --version
docker compose version
```

> No Windows o Docker precisa do **WSL 2**. Se o instalador reclamar, rode
> `wsl --install` no PowerShell **como administrador**, reinicie o computador e
> abra o Docker Desktop de novo.

### 5.2 Gerar os segredos

Na pasta do projeto:

```powershell
cd "$env:USERPROFILE\OneDrive\Área de Trabalho\Projetos\Portifolio"
make secrets
```

Isso cria um `.env` com `APP_KEY` e `JWT_SECRET` aleatórios.

> **Se `make` não existir** (é normal no Windows), instale com
> `winget install ezwinports.make`, ou use o Git Bash, ou rode o comando direto:
> ```powershell
> "APP_KEY=$(openssl rand -hex 32)`nJWT_SECRET=$(openssl rand -hex 32)`nDB_ROOT_PASSWORD=root`nDB_NAME=portifolio`nDB_PORT=3307" | Out-File -Encoding utf8 .env
> ```

### 5.3 Subir

```powershell
make up
```

Ou, sem `make`:

```powershell
docker compose up -d
```

**A primeira vez demora** — 3 a 8 minutos. O Docker baixa as imagens, instala as
dependências do Composer e do npm e aplica as migrações. Nas próximas vezes leva
segundos.

Acompanhe o progresso:

```powershell
make logs
# ou: docker compose logs -f
```

Você vai ver o entrypoint da API dizendo `banco disponível`, depois
`Aplicando migrações` e por fim `API pronta`.

### 5.4 Conferir se subiu

| Serviço | Endereço | O que esperar |
|---|---|---|
| **Web** | http://localhost:3000 | A página inicial do portfólio |
| **API** | http://localhost:8000/health | JSON com `"status":"ok"` |
| **E-mails** | http://localhost:8025 | Caixa de entrada vazia (por enquanto) |
| **Banco** | http://localhost:8080 | Login do Adminer |

Para entrar no Adminer: sistema `MySQL`, servidor `db`, usuário `root`, senha
`root`, base `portifolio`.

### 5.5 Testar o fluxo completo

Este é o teste que prova que tudo está conectado:

1. Abra http://localhost:3000/criar-conta
2. Preencha e envie o formulário.
3. Abra http://localhost:8025 — **o e-mail de confirmação está lá**. Nenhum
   e-mail sai de verdade em desenvolvimento; o Mailpit captura todos.
4. Clique no link de confirmação dentro do e-mail.
5. Faça login em http://localhost:3000/entrar
6. Você cai em `/painel`.

Repita com "Esqueci minha senha" para validar o fluxo de redefinição.

### 5.6 Comandos do dia a dia

```powershell
make up               # sobe
make down             # derruba (mantém o banco)
make logs             # acompanha os logs
make ps               # estado dos containers
make migrate          # aplica migrações pendentes
make test             # roda os testes
make check            # roda tudo que o CI roda
make shell-api        # terminal dentro do container da API
make shell-db         # cliente MySQL
make reset            # ⚠️ apaga o banco e recria do zero
make help             # lista tudo
```

### 5.7 Quando algo der errado

| Sintoma | Causa provável | Solução |
|---|---|---|
| `port is already allocated` | Outra coisa usando a porta | Mude a porta no `.env` (ex.: `DB_PORT=3308`) ou pare o serviço conflitante |
| `Cannot connect to the Docker daemon` | Docker Desktop fechado | Abra o Docker Desktop e espere iniciar |
| API responde 500 | Migração falhou | `make logs` e procure o erro; depois `make migrate` |
| Web não atualiza ao salvar arquivo | Watcher não pegou a alteração | Já tratado com `WATCHPACK_POLLING`; se persistir, `make restart` |
| `npm ci` falhou no build | Falta `package-lock.json` | `make shell-web` e rode `npm install` uma vez |
| Tudo estranho depois de mudar Dockerfile | Cache de imagem | `make rebuild` |
| Quero começar do zero | — | `make reset` |

---

## Parte 6 — Rodar sem Docker (alternativa)

### 6.1 Banco de dados

Abra o MySQL e crie o banco:

```powershell
mysql -u root -p
```

Dentro do MySQL:

```sql
CREATE DATABASE portifolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE portifolio_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 6.2 Backend

```powershell
cd v2\backend
composer install
copy .env.example .env
```

Agora **gere os segredos**. Rode duas vezes e guarde cada resultado:

```powershell
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Abra `v2\backend\.env` no editor e preencha:

```
APP_KEY=<primeiro resultado>
JWT_SECRET=<segundo resultado>
DB_USER=root
DB_PASS=<sua senha do MySQL>
MAIL_DRIVER=log
```

> `MAIL_DRIVER=log` faz os e-mails serem gravados em `storage/logs/` como HTML
> em vez de enviados. Perfeito para desenvolver sem configurar SMTP. Para ler o
> link de confirmação, abra o arquivo mais recente dessa pasta no navegador.

Aplique as migrações e suba a API:

```powershell
php database\migrate.php
composer run serve
```

A API responde em http://127.0.0.1:8000. Teste:

```powershell
curl http://127.0.0.1:8000/health
```

Deve devolver um JSON com `"status":"ok"`.

### 6.3 Frontend

Abra **outro terminal** (o backend precisa continuar rodando):

```powershell
cd "$env:USERPROFILE\OneDrive\Área de Trabalho\Projetos\Portifolio\v2\frontend"
npm install
```

Crie o arquivo `.env.local` com uma linha:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Suba:

```powershell
npm run dev
```

Abra http://localhost:3000/entrar

### 6.4 Rodar os testes

Backend:

```powershell
cd v2\backend
composer run test
```

Frontend:

```powershell
cd v2\frontend
npm run test
npm run typecheck
npm run lint
```

---

## Parte 7 — O ciclo do dia a dia

A partir daqui, **toda mudança segue este ciclo**. Sem exceção.

```powershell
# 1. Escolha uma issue
gh issue list

# 2. Crie a branch a partir dela (o número vem da issue)
git checkout develop
git pull
git checkout -b fix/12-nome-curto-da-tarefa

# 3. Trabalhe. Commite em partes pequenas.
git add .
git commit -m "fix(auth): valida token antes de trocar a senha

Refs #12"

# 4. Envie e abra o PR
git push -u origin fix/12-nome-curto-da-tarefa
gh pr create --base develop --fill

# 5. Preencha o template do PR (as 4 seções obrigatórias)
gh pr view --web

# 6. Espere o CI ficar verde
gh pr checks --watch

# 7. Faça o merge
gh pr merge --squash --delete-branch
```

### Quando o CI reprovar

```powershell
gh pr checks                 # ver quais jobs falharam
gh run view --log-failed     # ver o log do erro
```

Corrija, commite e envie de novo — o PR atualiza sozinho.

---

## Parte 8 — Ações que só você pode fazer

Três coisas dependem de decisão ou acesso seus. Estão como issues no GitHub.

### 8.1 ⚠️ Revogar a senha do Gmail — faça hoje

A senha de aplicativo do Gmail está no histórico público do Git. Está removida
do código atual, mas **quem clonar o repositório consegue recuperá-la** e usá-la
para enviar e-mails como você.

1. Abra https://myaccount.google.com/apppasswords
2. Revogue a senha antiga
3. Gere uma nova
4. Coloque em `v2/backend/.env`, campo `MAIL_PASSWORD`

### 8.2 Decidir sobre o histórico do Git

Revogar a senha resolve o risco imediato. Limpar o histórico é opcional e tem
duas saídas:

- **`git filter-repo`** — reescreve o histórico. Todos os hashes de commit mudam;
  qualquer clone existente quebra.
- **Recriar o repositório** — mais simples, mas perde stars, issues antigas e histórico.

Como é um portfólio pessoal sem colaboradores, `filter-repo` é viável. Me avise
se quiser que eu prepare os comandos.

### 8.3 Revisão jurídica dos termos

Os Termos de Uso e a Política de Privacidade estão na issue como pendentes. Posso
redigir as minutas, mas **elas precisam de revisão de um advogado antes de irem
ao ar** — o sistema coleta nome, e-mail, telefone e IP, e a LGPD se aplica.

---

## Resolução de problemas

| Erro | Causa | Solução |
|---|---|---|
| `bash: comando não encontrado` | PowerShell não tem bash | Use o Git Bash, ou `& "C:\Program Files\Git\bin\bash.exe" <script>` |
| `gh: command not found` | GitHub CLI não instalado ou terminal antigo | `winget install GitHub.cli` e **reabra o terminal** |
| `Configuração ausente no .env` | `APP_KEY` ou `JWT_SECRET` em branco | Gere com `php -r "echo bin2hex(random_bytes(32));"` |
| `JWT_SECRET deve ter no mínimo 32 caracteres` | Segredo curto | Gere um novo com o comando acima |
| `SQLSTATE[HY000] [1045] Access denied` | Senha do MySQL errada | Confira `DB_USER` e `DB_PASS` no `.env` |
| `SQLSTATE[HY000] [1049] Unknown database` | Banco não existe | Rode o `CREATE DATABASE` da parte 5.1 |
| CORS bloqueado no navegador | Origem não liberada | `CORS_ALLOWED_ORIGINS=http://localhost:3000` no `.env` do backend |
| E-mail não chega | `MAIL_DRIVER=log` | É esperado. Abra o HTML em `v2/backend/storage/logs/` |
| `Permission denied` ao rodar script | Bit de execução | `bash v2/scripts/criar-issues.sh` (chamando o bash explicitamente) |

---

## Referência rápida

```powershell
# Issues
gh issue list                      # listar
gh issue view 12                   # ver detalhes
gh issue create                    # criar (abre o seletor de template)

# Pull Requests
gh pr create --base develop --fill # abrir
gh pr checks --watch               # acompanhar o CI
gh pr view --web                   # abrir no navegador
gh pr merge --squash --delete-branch

# Ambiente (Docker)
make up                            # sobe tudo
make down                          # derruba
make logs                          # acompanha
make migrate                       # aplica migrações
make test                          # todos os testes
make check                         # tudo que o CI roda
make reset                         # recria do zero (apaga o banco)
make help                          # lista completa

# Dentro dos containers
make shell-api                     # terminal da API
make shell-web                     # terminal do frontend
make shell-db                      # cliente MySQL
```

**Endereços com a stack no ar**

| Serviço | Endereço |
|---|---|
| Aplicação | http://localhost:3000 |
| API | http://localhost:8000/health |
| E-mails capturados | http://localhost:8025 |
| Banco (Adminer) | http://localhost:8080 |
