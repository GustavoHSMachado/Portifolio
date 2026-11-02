# Deploy automático da API

Tudo que entra na `master` vai para produção sozinho — o site pela Vercel, a
API por aqui.

O job `deploy-api`, no fim de `.github/workflows/ci.yml`, roda **só em push na
`master`** e **só depois do `quality-gate` verde**. Os scripts desta pasta são
executados no servidor, por `ssh ... < script.sh`.

Enquanto os secrets não existirem, o job termina com um aviso e não falha o CI.

## O que ele faz, em ordem

1. **Verifica o alvo** — a pasta existe, é um clone deste repositório, e não há
   alteração não commitada no servidor. Qualquer desvio aborta antes de tocar
   em nada.
2. **Faz backup do banco** — `mysqldump` comprimido em `~/backups-deploy`,
   guardando os 10 mais recentes. Roda sempre, haja migração ou não.
3. **Traz o código** — `git merge --ff-only` **no commit exato que o CI
   aprovou**, não na ponta da `master`. `composer install --no-dev` apenas se o
   `composer.lock` tiver mudado.
4. **Aplica migrações pendentes** — o migrador é idempotente e o `--status`
   fica no log, antes e depois.
5. **Smoke test** — `/health` e `/api/v1/projects` precisam responder 200. A
   segunda é a rota de que a vitrine pública depende.

## O que ele não toca

- **`public/uploads/`** — as fotos não são versionadas, e `git pull` não mexe em
  arquivo que o repositório desconhece. É a razão de não usarmos FTP: sync
  apagaria tudo.
- **`.env` de produção** — está no `.gitignore`.
- **Os outros subdomínios da conta** — o job opera apenas no caminho de
  `HOSTINGER_API_PATH`.

## Secrets a configurar

Em *Settings → Secrets and variables → Actions → New repository secret*:

| Secret | O que é |
|---|---|
| `HOSTINGER_SSH_KEY` | a chave **privada**, conteúdo inteiro do arquivo |
| `HOSTINGER_SSH_HOST` | o IP do servidor |
| `HOSTINGER_SSH_PORT` | a porta SSH |
| `HOSTINGER_SSH_USER` | o usuário da hospedagem |
| `HOSTINGER_API_PATH` | caminho absoluto da instalação da API no servidor |

### Chave dedicada, não reaproveitada

Gere um par só para isto:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/portifolio_deploy -C "deploy-portifolio" -N ""
```

A **pública** (`.pub`) vai para a Hostinger, em *Avançado → Acesso SSH*. A
**privada** vai para `HOSTINGER_SSH_KEY` e não precisa existir em mais lugar
nenhum.

Chave por finalidade: se um dia precisar revogar o acesso do deploy, você
revoga sem derrubar nada mais.

## Pré-requisito que ainda não foi verificado

**A instalação da API no servidor precisa ser um clone deste repositório.**

Se ela foi feita por envio de pacote — o que é provável, dado que o
`.ai/estado.md` descreve o deploy assim —, não há de onde dar `git pull`, e o
passo 1 vai abortar com mensagem explícita dizendo isso. Essa é a primeira
execução servindo de diagnóstico.

Para converter, no servidor, com o `.env` e os uploads preservados:

```bash
cd <caminho-da-api>
git init
git remote add origin https://github.com/GustavoHSMachado/Portifolio.git
git fetch origin master
git checkout -f -t origin/master
```

O `checkout -f` sobrescreve os arquivos versionados com os do repositório e
**não remove** `.env` nem `public/uploads/`, que o Git desconhece. Ainda assim:
backup antes.

## Desfazer um deploy

O passo "Atualizar o código" imprime, no log do job, o comando pronto:

```bash
git -C <caminho-da-api> reset --hard <commit-anterior>
```

Se a migração for o problema, os dumps estão em `~/backups-deploy`, e cada
migração tem sua linha `-- ROLLBACK:`.

## Se quiser aprovação manual antes de publicar

Crie um *Environment* chamado `producao` em *Settings → Environments*, marque
*Required reviewers*, e acrescente `environment: producao` ao job. O deploy
passa a esperar seu clique — útil se um dia o automático incomodar.
