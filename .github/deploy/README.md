# Deploy automático da API

Tudo que entra na `master` vai para produção sozinho — o site pela Vercel, a
API por aqui.

O job `deploy-api`, no fim de `.github/workflows/ci.yml`, roda **só em push na
`master`** e **só depois do `quality-gate` verde**. Os scripts desta pasta são
executados no servidor, por `ssh ... < script.sh`.

Enquanto os secrets não existirem, o job termina com um aviso e não falha o CI.

## Por que envio de arquivos, e não `git pull`

Verificado por SSH em 02/11/2026, no servidor real:

1. **A instalação não é um clone.** O código chegou lá por envio de pacote.
2. **A estrutura não espelha o repositório.** No servidor existe só o miolo de
   `v2/backend/`, e `public/` chama-se **`public_html/`**. Um clone traria
   `v1/`, o frontend inteiro e a pasta com o nome errado.
3. **O PHP do shell é 8.2.35** e o `composer.json` exige `>= 8.3`. Um
   `composer install` lá falharia por versão de plataforma.

Daí o desenho: o Composer roda **no runner**, com PHP 8.3, e só o resultado
viaja.

```
repositório                        servidor
v2/backend/src/        ──────→     src/
v2/backend/database/   ──────→     database/
v2/backend/vendor/     ──────→     vendor/        (instalado no runner)
v2/backend/composer.*  ──────→     composer.*
v2/backend/public/     ──────→     public_html/   (sem uploads/)
                                   .env           (nunca tocado)
                                   public_html/uploads/  (nunca tocado)
```

## O que ele faz, em ordem

1. **Instala dependências** no runner, com PHP 8.3 e `--no-dev`.
2. **Verifica o alvo** — a pasta existe, tem `composer.json`, `src` e
   `public_html`, tem `.env`, e o binário do PHP 8.3 está disponível. Qualquer
   desvio aborta antes de enviar nada.
3. **Faz backup do banco** — `mysqldump` comprimido em `~/backups-deploy`,
   guardando os 10 mais recentes. Roda sempre, haja migração ou não.
4. **Envia o código** — `src`, `database` e `vendor` com `--delete`, porque os
   três são inteiramente derivados do repositório e não guardam dado.
5. **Envia a raiz pública** — `public/` para `public_html/`, **sem `--delete`**
   e com `uploads/` excluído.
6. **Aplica migrações pendentes** — com `/opt/alt/php83/usr/bin/php`, e o
   `--status` no log antes e depois.
7. **Smoke test** — `/health` e `/api/v1/projects` precisam responder 200. A
   segunda é a rota de que a vitrine pública depende.

## O que ele não toca

- **`public_html/uploads/`** — as fotos dos projetos só existem ali. Não estão
  no Git, e o banco guarda apenas o caminho. Por isso a pasta é excluída do
  envio **e** o `--delete` fica de fora desse passo.
- **`.env` de produção** — não está no repositório e não é enviado. O
  `verificar-alvo.sh` recusa o deploy se ele sumir.
- **Os outros subdomínios da conta** — o job opera apenas no caminho de
  `HOSTINGER_API_PATH`.

## Secrets

Em *Settings → Secrets and variables → Actions → Repository secrets* — e não em
*Environments*, que só alcança jobs declarando `environment:`.

| Secret | Valor |
|---|---|
| `HOSTINGER_SSH_KEY` | a chave **privada**, conteúdo inteiro do arquivo |
| `HOSTINGER_SSH_HOST` | IP do servidor |
| `HOSTINGER_SSH_PORT` | porta SSH |
| `HOSTINGER_SSH_USER` | usuário da hospedagem |
| `HOSTINGER_API_PATH` | caminho absoluto da instalação |

A chave é **dedicada a este deploy**. Se um dia precisar revogar o acesso, você
revoga sem derrubar mais nada — a pública está no painel, em *Avançado → Acesso
SSH*, com o nome `deploy portifolio github actions`.

## Desfazer

O envio é idempotente: reexecutar o job com o commit anterior devolve o código
ao que era. As fotos não são afetadas em nenhum cenário.

Se o problema for a migração, os dumps estão em `~/backups-deploy` e cada
migração tem sua linha `-- ROLLBACK:`.

## Limitação conhecida

Durante o envio há uma janela de alguns segundos em que convivem arquivos
novos e antigos. Resolver isso exigiria deploy atômico — enviar para uma pasta
nova e trocar um link simbólico —, o que mudaria a estrutura do servidor. Para
o volume deste projeto, não compensa; fica registrado caso um dia compense.

## Se quiser aprovação manual antes de publicar

Crie um *Environment* chamado `producao` em *Settings → Environments*, marque
*Required reviewers*, e acrescente `environment: producao` ao job.
