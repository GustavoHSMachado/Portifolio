# Passo a passo — como corrigir tudo

Este guia é para ser seguido de cima para baixo, sem pular. Cada passo diz
exatamente o que digitar, o que colar e o que você deve ver na tela.

Se você quiser entender **por que** cada correção existe, isso está em
[`plano-de-correcao.md`](plano-de-correcao.md). Aqui é só a execução.

---

## Antes de começar — leia esta parte inteira

### O que precisa estar funcionando

1. **Docker Desktop aberto.** Procure o ícone da baleia perto do relógio do
   Windows. Se não estiver lá, abra o Docker Desktop pelo menu Iniciar e espere
   até parar de dizer "Starting".
2. **Um terminal Git Bash.** Abra o Explorador de Arquivos, vá até a pasta
   `Área de Trabalho\Projetos\Portifolio`, clique com o botão direito num
   espaço vazio e escolha **"Git Bash Here"** (ou "Abrir no Terminal" e depois
   troque para Git Bash).

### Como usar os comandos deste guia

Cada bloco cinza é **um comando**. Para executar:

1. Selecione o texto do bloco e copie (`Ctrl+C`).
2. Clique dentro da janela do terminal.
3. Cole com **`Shift+Insert`** ou clicando com o botão direito → Paste.
   (`Ctrl+V` não funciona no Git Bash.)
4. Aperte `Enter`.

**Comando que não devolve nada geralmente deu certo.** Erro sempre aparece
escrito.

### Como confirmar que você está na pasta certa

Cole isto primeiro:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && pwd && ls
```

Você deve ver a lista com `docker`, `docs`, `v1`, `v2`, `Makefile`, `README.md`.
Se aparecer "No such file or directory", pare e me avise — o caminho da pasta
mudou.

### Como abrir e editar um arquivo

Quando o guia disser "abra o arquivo X", use o **Bloco de Notas** ou o VS Code.
Para abrir pelo terminal, no Bloco de Notas:

```bash
notepad "v2/backend/src/Core/Config.php"
```

Ao salvar no Bloco de Notas: `Arquivo → Salvar` (não "Salvar como").

### A rede de segurança

Antes de começar qualquer alteração, faça uma cópia de segurança de tudo:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git bundle create "../portifolio-backup-$(date +%Y%m%d-%H%M).bundle" --all && echo "BACKUP FEITO"
```

Deve terminar com **BACKUP FEITO**. Esse arquivo fica na pasta `Projetos`, um
nível acima. Guarde-o.

### Quais passos você consegue fazer sozinho

| Passos | Quem faz |
|---|---|
| 1 a 3 (senha vazada) | **Você** — é clicar e copiar comandos |
| 4 a 8 (deploy) | **Você**, criando arquivos com o conteúdo pronto daqui |
| 9 a 14 (código) | **Você**, mas é edição de código: siga ao pé da letra |
| 15 (Next.js) | **Precisa de desenvolvedor** — não tente sozinho |
| 16 a 20 | **Você** |

Faça um passo por vez. Ao fim de cada um há um teste. **Se o teste falhar, pare
naquele passo** e resolva antes de seguir.

---

# PARTE 1 — A senha vazada (faça hoje)

## Passo 1 — Revogar a senha do Gmail

**Por quê:** existe uma senha de aplicativo do seu Gmail escrita em texto puro
dentro do repositório público. Enquanto ela for válida, qualquer pessoa que a
leia pode enviar e-mail como você. Apagar do repositório não resolve — **só
revogar resolve**.

**Como:**

1. Abra no navegador: **https://myaccount.google.com/apppasswords**
2. Faça login se pedir.
3. Você verá uma lista de "Senhas de app". Se houver alguma antiga relacionada
   ao portfólio, clique no **ícone de lixeira** ao lado dela.
4. Confirme a remoção.

**Se a lista estiver vazia:** ótimo, já foi revogada antes. Siga em frente.

**Isso quebra alguma coisa?** Não. O projeto hoje envia e-mail pela Hostinger
(`no-reply@gustavohsmachado.com.br`), não pelo Gmail.

**Confira também** se ninguém usou a conta: abra
https://myaccount.google.com/notifications e veja se há acesso estranho.

---

## Passo 2 — Apagar a senha do histórico do projeto

**Por quê:** a senha continua escrita em 3 versões antigas do projeto e na
página inicial do repositório no GitHub. Isso é limpeza — a proteção de verdade
foi o passo 1.

**Antes de rodar, confirme que não há trabalho pendente:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git status --short
```

Você deve ver **no máximo** estas quatro linhas:

```
 M .github/workflows/ci.yml
 M docker/web/Dockerfile
?? limpar-senha-do-historico.sh
?? "relatorio de trabalho/"
```

Se aparecer mais coisa, o script vai recusar rodar. Guarde as alterações antes:

```bash
git stash push -u -m "antes da limpeza do historico"
```

**Agora rode o script:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && ./limpar-senha-do-historico.sh
```

Ele demora alguns minutos e vai imprimindo o que está fazendo. **Espere
terminar sem fechar a janela.**

**O que você deve ver no fim:**

```
==> Conferindo se sobrou alguma ocorrencia...
    Nenhuma ocorrencia em nenhum commit.

==> SHAs depois da reescrita:
    ...
==> Pronto. Confira o resultado e, se estiver certo, envie com:
```

**Se aparecer "ERRO: a limpeza nao ficou completa. NAO faca push":** pare aqui e
me avise. Não envie nada.

**Se você usou o `git stash` acima, recupere agora:**

```bash
git stash pop
```

---

## Passo 3 — Enviar a limpeza para o GitHub

**Por quê:** até aqui você limpou só o seu computador. O GitHub ainda tem a
versão antiga.

**Envie:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git push --force-with-lease origin dev && git push --force-with-lease origin master
```

**Se aparecer erro falando em "protected branch":** o GitHub está protegendo a
branch. Faça assim:

1. Abra https://github.com/GustavoHSMachado/Portifolio/settings/branches
2. Ache a regra da branch `master` e clique em **Delete** (ou desative
   temporariamente).
3. Rode o comando de envio de novo.
4. **Recrie a proteção depois** — não esqueça.

**Confirme que funcionou:** abra
https://github.com/GustavoHSMachado/Portifolio e procure na lista de arquivos
por `configEmail.php`. Clique nele. A linha da senha deve mostrar
`SENHA-REMOVIDA-DO-HISTORICO`.

**Um aviso importante que muita gente não sabe:** mesmo depois disso, as versões
antigas continuam guardadas nos servidores do GitHub e podem ser acessadas por
link direto. Para apagá-las de vez:

1. Abra **https://support.github.com/**
2. Abra um chamado dizendo, em inglês ou português:
   > *Solicito a remoção de commits órfãos (stale/unreachable commits) do
   > repositório GustavoHSMachado/Portifolio. Os commits aba029d, 97a4974 e
   > e9483c1 continham uma credencial e o histórico foi reescrito.*

Isso costuma levar alguns dias. Enquanto isso, a proteção continua sendo o
passo 1.

---

# PARTE 2 — Preparar a publicação

Esta é a parte mais longa. São **arquivos novos** — você não vai alterar nada
que já existe, então o risco é baixo.

## Passo 4 — Criar o servidor web da API

**Por quê:** a API de produção "fala" um idioma que navegador não entende
(FastCGI). Este arquivo cria o tradutor.

**Crie a pasta:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && mkdir -p docker/nginx && echo "PASTA CRIADA"
```

**Crie o arquivo:**

```bash
notepad docker/nginx/api.conf
```

O Bloco de Notas vai perguntar se quer criar o arquivo — responda **Sim**.

**Cole exatamente isto e salve:**

```nginx
# API — nginx apenas como tradutor HTTP → FastCGI.
#
# Não há try_files nem root compartilhado de propósito: a API devolve só JSON e
# o único arquivo em public/ é o index.php. Mandar tudo direto para o FastCGI
# dispensa montar o código também neste container.
server {
    listen 80;
    server_name _;

    # Igual ao post_max_size do PHP, para o nginx recusar antes e com mensagem.
    client_max_body_size 8m;

    # Não anuncia a versão do nginx.
    server_tokens off;

    location / {
        fastcgi_pass  api:9000;
        include       fastcgi_params;

        fastcgi_param SCRIPT_FILENAME /app/public/index.php;
        fastcgi_param SCRIPT_NAME     /index.php;
        fastcgi_param DOCUMENT_ROOT   /app/public;

        # A API já define os seus próprios cabeçalhos de segurança.
        fastcgi_hide_header X-Powered-By;

        fastcgi_read_timeout 30s;
    }
}
```

**Confira que salvou:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && head -3 docker/nginx/api.conf
```

Deve mostrar as três primeiras linhas do comentário.

---

## Passo 5 — Criar a configuração de produção

**Por quê:** hoje só existe a configuração do seu computador, que liga o modo de
desenvolvimento. Publicar com ela exporia detalhes internos.

**Crie o arquivo:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad docker-compose.prod.yml
```

Responda **Sim** para criar. **Cole exatamente isto e salve:**

```yaml
# Stack de produção. Suba com:
#
#   docker compose -f docker-compose.prod.yml up -d --build
#
# Este arquivo NÃO estende o docker-compose.yml de propósito: aquele carrega
# APP_ENV=local, APP_DEBUG=true, Mailpit, Adminer e limites de rate afrouxados.
# Herdar dele e desfazer item por item é como se publica um ambiente de
# desenvolvimento sem querer.

name: portifolio-prod

services:
  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:?defina no .env}
      MYSQL_DATABASE: ${DB_NAME:?defina no .env}
    volumes:
      - db-data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${DB_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 10
    # Sem `ports`: o banco só existe dentro da rede. Publicar 3306 na internet
    # é o erro de infraestrutura mais comum e mais caro que existe.
    networks: [interna]

  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
      target: prod
    restart: always
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      APP_NAME: portifolio-api
      APP_VERSION: ${APP_VERSION:-2.0.0}
      APP_URL: ${APP_URL:?ex.: https://api.gustavohsmachado.com.br}
      FRONTEND_URL: ${FRONTEND_URL:?ex.: https://gustavohsmachado.com.br}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:?mesma origem do FRONTEND_URL}
      APP_FORCE_HTTPS: "true"
      APP_SECURE_COOKIES: "true"
      APP_KEY: ${APP_KEY:?gere com openssl rand -hex 32}
      JWT_SECRET: ${JWT_SECRET:?gere com openssl rand -hex 32}

      # IP fixo do proxy. A comparação no código é por igualdade exata e não
      # aceita faixa — por isso o proxy tem IP fixo lá embaixo.
      TRUSTED_PROXIES: 172.30.0.10

      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER:-root}
      DB_PASS: ${DB_ROOT_PASSWORD}

      MAIL_HOST: ${MAIL_HOST}
      MAIL_PORT: ${MAIL_PORT}
      MAIL_ENCRYPTION: ${MAIL_ENCRYPTION}
      MAIL_USERNAME: ${MAIL_USERNAME}
      MAIL_PASSWORD: ${MAIL_PASSWORD}
      MAIL_FROM_ADDRESS: ${MAIL_FROM_ADDRESS}
      MAIL_FROM_NAME: ${MAIL_FROM_NAME}
      # Vazio descarta a mensagem em vez de desviá-la. Em produção não há
      # servidor de captura, e domínio reservado não deve sair mesmo.
      MAIL_SANDBOX_HOST: ""

      ADMIN_EMAIL: ${ADMIN_EMAIL:?a conta que abre o painel}
      REGISTRATION_ENABLED: ${REGISTRATION_ENABLED:-true}

      LOG_LEVEL: ${LOG_LEVEL:-info}
      SENTRY_DSN: ${SENTRY_DSN:-}

      # Nenhum RATE_LIMIT_* aqui: sem sobrescrita valem os padrões do código,
      # que são os de produção. Ver RateLimit::STRICT_RULES.
    depends_on:
      db:
        condition: service_healthy
    networks: [interna]

  # Roda as migrações e sai. O container da API não as roda em produção, e é
  # assim que deve ser: com mais de uma réplica, N containers subindo ao mesmo
  # tempo aplicariam a mesma migração em paralelo.
  #
  #   docker compose -f docker-compose.prod.yml run --rm migrate
  migrate:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
      target: prod
    profiles: [manutencao]
    environment:
      APP_ENV: production
      APP_KEY: ${APP_KEY}
      JWT_SECRET: ${JWT_SECRET}
      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER:-root}
      DB_PASS: ${DB_ROOT_PASSWORD}
    command: ["php", "database/migrate.php"]
    depends_on:
      db:
        condition: service_healthy
    networks: [interna]

  web:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
      target: prod
      # ATENÇÃO: args, e não environment. Os valores NEXT_PUBLIC_* são gravados
      # dentro do site no momento da construção. Passar depois não tem efeito.
      args:
        NEXT_PUBLIC_API_URL: ${APP_URL:?}
        NEXT_PUBLIC_SITE_URL: ${FRONTEND_URL:?}
    restart: always
    environment:
      NODE_ENV: production
      # Server-side, lido em tempo de execução: o Next fala com a API por dentro
      # da rede, sem sair para a internet e voltar.
      API_INTERNAL_URL: http://proxy
    depends_on: [api]
    networks: [interna]

  proxy:
    image: nginx:1.27-alpine
    restart: always
    volumes:
      - ./docker/nginx/api.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: [api]
    networks:
      interna:
        ipv4_address: 172.30.0.10

volumes:
  db-data:

networks:
  interna:
    ipam:
      config:
        - subnet: 172.30.0.0/24
```

**Teste que o arquivo está válido:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose -f docker-compose.prod.yml config > /dev/null && echo "ARQUIVO VALIDO"
```

**Se aparecer "ARQUIVO VALIDO":** perfeito, siga.

**Se aparecer erro dizendo `required variable APP_URL is missing`:** isso é
**esperado e correto**. Significa que o arquivo está funcionando e recusando
subir sem as informações de produção. Você vai preenchê-las no passo 6.

**Se aparecer erro de "yaml" ou "line N":** o texto foi colado errado. Apague o
arquivo e cole de novo com atenção.

---

## Passo 6 — Documentar as variáveis de produção

**Por quê:** quem for configurar o servidor precisa da lista do que preencher.
Esquecer uma delas quebra o site de um jeito difícil de descobrir.

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad .env.example
```

O arquivo vai abrir com conteúdo. **Vá até o fim de tudo** (`Ctrl+End`), dê dois
Enters e **cole isto no final**:

```bash
# ======================================================================
#  PRODUÇÃO — usado por docker-compose.prod.yml
#
#  Nada aqui tem padrão seguro. O compose de produção usa a sintaxe
#  ${VAR:?mensagem}, que recusa subir se a variável estiver faltando —
#  é melhor não subir do que subir errado e descobrir depois.
# ======================================================================

# Domínios. APP_URL é onde a API responde; FRONTEND_URL é o site.
# CORS_ALLOWED_ORIGINS precisa ser exatamente a origem do site (sem barra final).
# APP_URL=https://api.gustavohsmachado.com.br
# FRONTEND_URL=https://gustavohsmachado.com.br
# CORS_ALLOWED_ORIGINS=https://gustavohsmachado.com.br

# Versão publicada — aparece no /health e no Sentry. Use a tag da imagem.
# APP_VERSION=2.0.0

# IP do proxy reverso. A comparação é por igualdade exata e não aceita faixa:
# por isso o docker-compose.prod.yml fixa o IP do proxy. Deixar vazio faz o
# rate limit contar tudo contra o IP do proxy — um único balde para toda a
# internet, e o primeiro robô tranca o login de todo mundo.
# TRUSTED_PROXIES=172.30.0.10

# Observabilidade. Sem DSN, o Sentry fica desligado.
# SENTRY_DSN=
# SENTRY_TRACES_SAMPLE_RATE=0.2
# LOG_LEVEL=info

# Nome do serviço nos logs e no /health.
# APP_NAME=portifolio-api

# Em produção não há servidor de captura. Vazio descarta a mensagem endereçada
# a domínio reservado, em vez de tentar desviá-la para um host inexistente.
# MAIL_SANDBOX_HOST=

# ----------------------------------------------------------------------
#  Fixados pelo docker-compose.prod.yml — NÃO defina aqui:
#    APP_ENV=production   APP_DEBUG=false
#    APP_FORCE_HTTPS=true APP_SECURE_COOKIES=true
#
#  E não copie nenhum RATE_LIMIT_* do ambiente local: sem sobrescrita valem
#  os padrões do código, que são os valores de produção.
# ----------------------------------------------------------------------
```

Salve e feche.

**Confira:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && tail -5 .env.example
```

Deve mostrar as últimas linhas do bloco que você colou.

---

## Passo 7 — Escrever o manual de publicação

**Por quê:** para você não depender da memória no dia do deploy — e para ter um
caminho de volta se algo der errado.

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad docs/DEPLOY.md
```

Responda **Sim** para criar. **Cole isto e salve:**

```markdown
# Deploy

## Publicar

1. `git pull` na branch `master`, no servidor.
2. Conferir o `.env` — ver a seção PRODUÇÃO do `.env.example`.
3. **Backup do banco antes de qualquer coisa** (ver Rollback, abaixo).
4. Marcar a imagem atual, para poder voltar:

       docker tag portifolio-prod-api:latest portifolio-prod-api:$(date +%Y%m%d-%H%M)
       docker tag portifolio-prod-web:latest portifolio-prod-web:$(date +%Y%m%d-%H%M)

5. Construir:

       docker compose -f docker-compose.prod.yml build

6. Migrar:

       docker compose -f docker-compose.prod.yml run --rm migrate

7. Subir:

       docker compose -f docker-compose.prod.yml up -d

8. Smoke test — ver a seção 21 do relatório de homologação.

## Rollback

**Banco (faça o backup ANTES de todo deploy):**

    docker compose -f docker-compose.prod.yml exec -T db \
      mysqldump -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup-antes-do-deploy.sql

Para restaurar:

    docker compose -f docker-compose.prod.yml exec -T db \
      mysql -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" < backup-antes-do-deploy.sql

**Aplicação:** volte para a tag anterior (passo 4 acima) e suba de novo.

**Regra sem exceção:** todo deploy que traz migração faz o dump antes. As
migrações não têm mecanismo de desfazer — o dump é a única volta.

## Manutenção agendada

O expurgo de tokens vencidos não roda sozinho. No crontab do servidor:

    0 4 * * * cd /caminho/do/projeto && docker compose -f docker-compose.prod.yml exec -T api php database/purge.php
```

---

## Passo 8 — Agendar a limpeza automática

**Por quê:** três tabelas do banco crescem sozinhas para sempre. Sem limpeza,
o banco incha até ficar lento.

Isto só pode ser feito **no servidor onde o site vai rodar**, não no seu
computador. Guarde a linha abaixo para o dia da publicação:

```
0 4 * * * cd /caminho/do/projeto && docker compose -f docker-compose.prod.yml exec -T api php database/purge.php
```

**Como isso se lê:** "todo dia às 4 da manhã, rode a limpeza".

Já está anotado no `docs/DEPLOY.md` que você criou no passo 7. Marque este passo
como pendente até ter o servidor.

**Se quiser ver o que ela apagaria hoje, sem apagar nada:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api php database/purge.php --dry-run
```

---

# PARTE 3 — Correções no código

A partir daqui você vai **alterar arquivos existentes**. Duas regras:

1. **Nunca digite o código à mão.** Copie e cole. Um caractere errado quebra tudo.
2. **Faça um passo por vez e rode o teste no fim de cada um.** Se o teste
   falhar, o problema está no passo que você acabou de fazer — não no anterior.

Se em algum momento você se perder e quiser voltar tudo de um arquivo ao estado
original, use (trocando o caminho pelo do arquivo):

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git checkout -- v2/backend/src/Core/Config.php
```

---

## Passo 9 — Fazer a verificação de saúde parar de depender do banco

**Por quê:** hoje, se o banco cair, o endereço que diz "a API está viva"
responde "erro". Um servidor de produção lê isso como "a API morreu" e fica
reiniciando o container em loop — justamente durante um problema, piorando tudo.

**Abra o arquivo:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Http/Middleware/RateLimit.php
```

### 9.1 — Primeira alteração

**PROCURE por este trecho** (use `Ctrl+F` e busque por `OPTIONS`):

```php
    public function handle(Request $request, callable $next): Response
    {
        if ($request->method === 'OPTIONS') {
            return $next($request);
        }
```

**TROQUE por:**

```php
    public function handle(Request $request, callable $next): Response
    {
        if ($request->method === 'OPTIONS' || $this->isSonda($request->path)) {
            return $next($request);
        }
```

> A única diferença é o pedaço `|| $this->isSonda($request->path)` acrescentado
> dentro do parêntese.

### 9.2 — Segunda alteração

**PROCURE por esta linha** (é o começo do último método do arquivo):

```php
    /** @return array{int,int} [tentativas, janela em segundos] */
```

**Cole o bloco abaixo IMEDIATAMENTE ANTES dessa linha** (deixe uma linha em
branco entre eles):

```php
    /**
     * Sondas de saúde não passam pelo contador.
     *
     * Dois motivos, e o segundo é o que importa. O primeiro é volume: um
     * orquestrador chama a sonda a cada poucos segundos e consumiria a cota
     * global sozinho.
     *
     * O segundo é a dependência invertida. O contador vive no banco, então
     * passar por aqui faz a sonda de liveness depender do banco. Com o banco
     * fora, /health devolvia 500 e o orquestrador concluía que o processo
     * morreu — reiniciando em laço um container saudável, no exato momento em
     * que o problema é outro. Liveness responde sobre o processo; quem responde
     * sobre as dependências é /health/ready, e ele já sabe fazer isso: tem um
     * try/catch que devolve 503 com o diagnóstico, e que nunca era alcançado
     * porque a exceção acontecia aqui, dois middlewares antes do controller.
     */
    private function isSonda(string $path): bool
    {
        return $path === '/health' || str_starts_with($path, '/health/');
    }

```

Salve e feche.

### 9.3 — Teste

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose restart api && sleep 5 && curl -s http://localhost:8001/health
```

**Deve aparecer** algo como `{"data":{"status":"ok",...}}`.

**Se aparecer erro sobre "syntax error" ou "unexpected":** você colou o código
no lugar errado ou apagou uma chave `}`. Desfaça e refaça:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git checkout -- v2/backend/src/Http/Middleware/RateLimit.php
```

**Rode a suíte de testes:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test
```

**Deve terminar com:** `OK (48 tests, 94 assertions)`

---

## Passo 10 — Corrigir a memória das configurações

**Por quê:** existe um defeito onde a primeira parte do sistema que lê uma
configuração "trava" o valor para todas as outras, ignorando o valor padrão que
elas pedem. Hoje isso só deixa um campo vazio no monitoramento, mas amanhã pode
fazer um valor de segurança sumir sem ninguém perceber.

**Abra:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Core/Config.php
```

**PROCURE por este trecho inteiro** (busque por `array_key_exists`):

```php
    public static function get(string $key, ?string $default = null): ?string
    {
        if (array_key_exists($key, self::$cache)) {
            return self::$cache[$key];
        }

        // O ?? já descarta null em cada etapa, e getenv devolve string|false —
        // então só false sobra para tratar aqui. Testar null de novo era código
        // morto: a condição nunca podia ser verdadeira.
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        $value = $value === false ? $default : (string) $value;

        return self::$cache[$key] = $value;
    }
```

**TROQUE o trecho inteiro por:**

```php
    /**
     * Valor da chave no ambiente, ou o padrão de quem chamou.
     *
     * O cache guarda o que o AMBIENTE disse — nunca o padrão do chamador.
     * Misturar os dois fazia o primeiro chamador decidir o valor para todos os
     * seguintes: Logger lê Config::get('APP_NAME') sem padrão, grava null, e o
     * HealthController pedindo Config::get('APP_NAME', 'portifolio-api') recebia
     * o null de volta com o padrão descartado. O sintoma era um "service": null
     * no /health; o problema é que o valor de uma chave passava a depender da
     * ORDEM em que o código a lesse.
     *
     * Ausência é cacheada como null e continua sendo ausência: o padrão é
     * aplicado na leitura, não na gravação.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        if (!array_key_exists($key, self::$cache)) {
            $bruto = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

            // getenv devolve string|false; false significa "não definida".
            self::$cache[$key] = $bruto === false ? null : (string) $bruto;
        }

        return self::$cache[$key] ?? $default;
    }
```

Salve e feche.

**Teste:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose restart api && sleep 5 && docker compose exec -T api php -r 'require "/app/vendor/autoload.php"; use App\Core\Config; Config::boot("/app"); var_dump(Config::get("NAO_EXISTE"), Config::get("NAO_EXISTE", "padrao"));'
```

**Deve aparecer exatamente:**

```
NULL
string(6) "padrao"
```

**Antes da correção aparecia `NULL` duas vezes.** Se ainda aparecer `NULL` duas
vezes, a alteração não foi salva ou foi colada no lugar errado.

**Rode os testes e a análise:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse
```

**Deve terminar com** `OK (48 tests, ...)` e `[OK] No errors`.

---

## Passo 11 — Impedir que duas abas derrubem a sessão

**Por quê:** hoje, com o site aberto em duas abas, atualizar as duas quase junto
desloga a pessoa de tudo — e ela precisa fazer login de novo, incluindo esperar
um novo código por e-mail. Pior: o sistema registra isso como "sessão roubada",
enchendo o painel de alarmes falsos.

Este é o passo mais delicado do guia. **Leia inteiro antes de começar.**

**Abra:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Services/AuthService.php
```

### 11.1 — Primeira alteração

**PROCURE por este trecho** (busque por `Reuso de refresh token`):

```php
        if ($row['rotated_at'] !== null) {
            $this->refreshTokens->revokeFamily($row['family_id']);
            $this->logger->error('Reuso de refresh token detectado — família revogada', [
                'user_id'   => $row['user_id'],
                'family_id' => $row['family_id'],
                'ip'        => $ip,
            ]);
            $this->audit->record(AuditLog::SESSAO_COMPROMETIDA, (int) $row['user_id'], $ip, $userAgent);

            throw HttpException::unauthorized('Sessão comprometida. Faça login novamente.');
        }

        if (!$this->refreshTokens->isUsable($row)) {
            throw HttpException::unauthorized('Sessão expirada. Faça login novamente.');
        }
```

**TROQUE o trecho inteiro por:**

```php
        /*
         * Um token já rotacionado voltando é o sinal de roubo — mas só depois de
         * uma janela curta.
         *
         * Duas abas do site montam ao mesmo tempo e disparam refresh com o mesmo
         * cookie: a primeira rotaciona, a segunda chega com um token marcado. Sem
         * a janela, esse gesto banal derrubava a família inteira, obrigava a
         * refazer o login com segundo fator, e gravava um alarme de sessão
         * comprometida no audit_log. O alarme é o único sinal de roubo que o
         * sistema tem; com falso positivo trivial de produzir, ele deixa de valer.
         *
         * Quem rouba um token não o apresenta no mesmo segundo que o dono. Quem
         * tem duas abas, sim.
         */
        $dentroDaJanela = false;

        if ($row['rotated_at'] !== null) {
            $janela = Config::int('REFRESH_ROTATION_GRACE', 10);
            $rotacionadoHa = time() - (new \DateTimeImmutable((string) $row['rotated_at']))->getTimestamp();

            $dentroDaJanela = $row['revoked_at'] === null
                && $rotacionadoHa >= 0
                && $rotacionadoHa <= $janela;

            if (!$dentroDaJanela) {
                $this->refreshTokens->revokeFamily($row['family_id']);
                $this->logger->error('Reuso de refresh token detectado — família revogada', [
                    'user_id'   => $row['user_id'],
                    'family_id' => $row['family_id'],
                    'ip'        => $ip,
                ]);
                $this->audit->record(AuditLog::SESSAO_COMPROMETIDA, (int) $row['user_id'], $ip, $userAgent);

                throw HttpException::unauthorized('Sessão comprometida. Faça login novamente.');
            }

            $this->logger->info('Refresh concorrente dentro da janela de tolerância', [
                'user_id'   => $row['user_id'],
                'family_id' => $row['family_id'],
            ]);
        }

        // Revogação e expiração valem nos dois caminhos. isUsable() exige
        // rotated_at nulo, então não serve para o caminho da janela.
        if ($row['revoked_at'] !== null
            || new \DateTimeImmutable((string) $row['expires_at']) <= new \DateTimeImmutable()) {
            throw HttpException::unauthorized('Sessão expirada. Faça login novamente.');
        }
```

### 11.2 — Segunda alteração (no mesmo arquivo, mais abaixo)

**PROCURE por** (busque por `markRotated`):

```php
        $newToken = $this->db->transaction(function () use ($row, $userAgent, $ip): string {
            $this->refreshTokens->markRotated((int) $row['id']);
```

**TROQUE por:**

```php
        $newToken = $this->db->transaction(function () use ($row, $userAgent, $ip, $dentroDaJanela): string {
            /*
             * Dentro da janela o token NÃO é re-marcado, de propósito. Marcar de
             * novo empurraria rotated_at para frente a cada reapresentação e a
             * janela nunca fecharia — um token roubado seria renovável para
             * sempre, de dez em dez segundos. A janela fica ancorada na primeira
             * rotação.
             */
            if (!$dentroDaJanela) {
                $this->refreshTokens->markRotated((int) $row['id']);
            }
```

> **Atenção:** repare que na primeira linha entrou `, $dentroDaJanela` dentro do
> `use (...)`. Sem isso o código quebra.

Salve e feche.

### 11.3 — Documentar a nova configuração

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad .env.example
```

Vá até o fim (`Ctrl+End`) e acrescente:

```bash
# Segundos em que um refresh token já rotacionado ainda é aceito sem ser tratado
# como roubo. Cobre a corrida entre duas abas do site montando ao mesmo tempo.
# Curto de propósito: é o intervalo em que a detecção de reuso fica suspensa.
# REFRESH_ROTATION_GRACE=10
```

### 11.4 — Teste

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose restart api && sleep 5 && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse
```

**Deve terminar com** `OK (48 tests, ...)` e `[OK] No errors`.

**Teste de verdade, no navegador:**

1. Abra http://localhost:3000 e faça login.
2. Com a sessão aberta em `/painel`, **duplique a aba** (`Ctrl+Shift+K` no
   Chrome, ou botão direito na aba → Duplicar).
3. Atualize as **duas abas** rapidamente, uma logo após a outra (`F5` em cada).
4. **Antes da correção:** uma ia para a tela de login e a outra caía no F5
   seguinte.
   **Depois da correção:** as duas continuam em `/painel`.

**Confira o log:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose logs api --since 2m | grep -i "janela de tolerância\|Reuso de refresh"
```

Deve aparecer `Refresh concorrente dentro da janela de tolerância` com
`"level_name":"INFO"` — e **não** mais `Reuso de refresh token detectado` com
`"ERROR"`.

**Rode o teste completo de ponta a ponta** (demora ~4 minutos):

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && make test-e2e
```

**Deve terminar com** `80 passed`.

---

## Passo 12 — Ajustar o limite de tamanho do site no CI

**Por quê:** o teste automático mede o tamanho do site de um jeito que não
corresponde ao que o visitante baixa, e por isso vai acusar erro para sempre. Um
teste que sempre falha para de ser lido.

**Primeiro, descubra o tamanho real:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio/v2/frontend" && docker compose -f ../../docker-compose.yml exec -T web sh -c "npm run build > /dev/null 2>&1 && find .next/static -type f \( -name '*.js' -o -name '*.css' \) -exec gzip -c -9 {} + | wc -c"
```

Anote o número que aparecer. Divida por 1024 para ter o valor em KB. Exemplo: se
aparecer `230000`, são cerca de **225 KB**. Escolha um teto com folga — nesse
exemplo, **300**.

**Abra o arquivo do CI:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad .github/workflows/ci.yml
```

**PROCURE por** (busque por `Orçamento de bundle`):

```yaml
      - name: Orçamento de bundle
        run: |
          SIZE=$(du -sk .next/static | cut -f1)
          echo "Bundle estático: ${SIZE}KB"
          if [ "$SIZE" -gt 1024 ]; then
            echo "::error::Bundle acima do orçamento de 1024KB (atual: ${SIZE}KB)"
            exit 1
          fi
```

**TROQUE por** (ajustando o número `450` para o teto que você escolheu):

```yaml
      - name: Orçamento de bundle
        run: |
          # Medido comprimido, e não em disco: é o que o navegador baixa, e é o
          # que aparece no tempo de carregamento. O tamanho em disco sem
          # compressão não corresponde a nada que o visitante experimente.
          BYTES=$(find .next/static -type f \
                    \( -name '*.js' -o -name '*.css' \) \
                    -exec gzip -c -9 {} + | wc -c)
          KB=$((BYTES / 1024))
          ORCAMENTO=450
          echo "Bundle estático (gzip): ${KB}KB de ${ORCAMENTO}KB"
          if [ "$KB" -gt "$ORCAMENTO" ]; then
            echo "::error::Bundle acima do orçamento de ${ORCAMENTO}KB (atual: ${KB}KB)"
            exit 1
          fi
```

Salve e feche.

**Teste que o arquivo continua válido:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker run --rm -i mikefarah/yq:latest '.jobs | keys' < .github/workflows/ci.yml | grep -c "" && echo "YAML OK"
```

Deve terminar com **YAML OK**.

---

## Passo 13 — Parar de revelar quais e-mails têm conta

**Por quê:** hoje dá para descobrir, com um único comando, se um endereço de
e-mail tem conta no site — porque a resposta do cadastro é diferente nos dois
casos.

São **três arquivos**. Faça os três antes de testar.

### 13.1 — Arquivo 1 de 3

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Services/AuthService.php
```

**PROCURE por** (busque por `emailExists`):

```php
        if ($this->users->emailExists($email)) {
            $this->logger->warning('Tentativa de registro com e-mail existente', [
                'email' => str_mask_email($email),
            ]);

            throw new HttpException(
                'Se este e-mail estiver disponível, você receberá uma confirmação em instantes.',
                202,
                errorCode: 'registration_pending'
            );
        }
```

**TROQUE por:**

```php
        if ($this->users->emailExists($email)) {
            $this->logger->warning('Tentativa de registro com e-mail existente', [
                'email' => str_mask_email($email),
            ]);

            /*
             * Retorno silencioso, e não exceção com status próprio.
             *
             * O 202 que ficava aqui deixava a resposta distinguível do 201 do
             * caminho feliz, e um curl respondia em uma requisição se o endereço
             * tem conta. A mensagem já era ambígua e o tempo de resposta também;
             * o código de status era o que faltava.
             */
            return;
        }
```

**No mesmo arquivo**, mais três pequenos ajustes. Faça exatamente nesta ordem.

**Ajuste 1 — o tipo de retorno do método.**

> ⚠️ Existem **três** linhas `): array {` neste arquivo. Você quer a que vem
> logo depois de `userAgent`. Para não errar, busque pelo **par de linhas
> abaixo** e troque as duas de uma vez.

PROCURE por estas duas linhas juntas:

```php
        array $context = ['ip' => '', 'userAgent' => null],
    ): array {
```

TROQUE pelas duas linhas:

```php
        array $context = ['ip' => '', 'userAgent' => null],
    ): void {
```

**Ajuste 2 — apagar a última linha do método.**

PROCURE por (só existe uma no arquivo inteiro):

```php
        return ['user' => User::toPublic($this->users->findById($userId) ?? [])];
```

**APAGUE essa linha inteira.**

**Ajuste 3 — apagar o comentário que descrevia o retorno.**

Logo acima do método, no bloco de comentário, PROCURE por esta linha e
**APAGUE-A**:

```php
     * @return array{user: array<string,mixed>}
```

> Cuidado: existe outra linha parecida mais abaixo no arquivo, com
> `accessToken` e `refreshToken` dentro. **Não é essa.** A que você quer termina
> em `array<string,mixed>}` e nada mais.

Salve e feche.

### 13.2 — Arquivo 2 de 3

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Http/Controllers/AuthController.php
```

**PROCURE por** (busque por `$result = $this->auth->register`):

```php
        $result = $this->auth->register(
            $data['name'],
            $data['email'],
            $data['phone'],
            $data['password'],
            ['ip' => $request->ip, 'userAgent' => $request->header('user-agent')],
        );

        return Response::created(
            $result,
            'Conta criada. Enviamos um link de confirmação para o seu e-mail.'
        );
```

**TROQUE por:**

```php
        $this->auth->register(
            $data['name'],
            $data['email'],
            $data['phone'],
            $data['password'],
            ['ip' => $request->ip, 'userAgent' => $request->header('user-agent')],
        );

        /*
         * Mesma resposta nos dois casos — conta criada ou e-mail já cadastrado.
         * O corpo não traz o usuário porque a tela nunca o usou (ela mostra o
         * e-mail que a própria pessoa digitou) e porque devolvê-lo só no caminho
         * feliz é o que tornava os dois distinguíveis.
         */
        return Response::created(
            null,
            'Se este e-mail estiver disponível, enviamos um link de confirmação para ele.'
        );
```

Salve e feche.

### 13.3 — Arquivo 3 de 3

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad "v2/frontend/src/app/(auth)/criar-conta/page.tsx"
```

**PROCURE por** (busque por `error.status === 202`):

```tsx
      // 202 significa "e-mail possivelmente já cadastrado" — a API responde
      // de forma deliberadamente ambígua para não permitir enumeração de contas.
      // Do lado do usuário legítimo, o resultado visual é o mesmo do sucesso.
      if (error.status === 202) {
        setRegistered(payload.email);
        return;
      }

```

**APAGUE esse bloco inteiro**, incluindo a linha em branco depois dele.

Salve e feche.

### 13.4 — Teste

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose restart api && sleep 5 && A=http://localhost:8001 && T=$(date +%s) && D="{\"name\":\"Teste Enum\",\"email\":\"enum-$T@example.com\",\"phone\":\"11987654321\",\"password\":\"Enum#2026\",\"password_confirmation\":\"Enum#2026\",\"acceptedTerms\":true}" && echo "primeira vez:" && curl -s -o /dev/null -w "%{http_code}\n" -X POST $A/api/v1/auth/register -H "Content-Type: application/json" -d "$D" && echo "segunda vez:" && curl -s -o /dev/null -w "%{http_code}\n" -X POST $A/api/v1/auth/register -H "Content-Type: application/json" -d "$D"
```

**Deve aparecer `201` nas duas vezes.** Antes aparecia `201` e depois `202`.

**Rode tudo:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse && docker compose exec -T web npm run typecheck && make test-e2e
```

**Limpe a conta de teste que você criou:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T db mysql -uroot -proot portifolio -e "DELETE FROM users WHERE email LIKE 'enum-%@example.com';" && echo "LIMPO"
```

### 13.5 — Corrigir a documentação

O arquivo `docs/ESTADO-ATUAL.md` afirma que a revisão de segurança não encontrou
esse problema. Isso estava errado.

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad docs/ESTADO-ATUAL.md
```

Busque por `sem enumeração de contas` e acrescente logo depois:
`(a enumeração pelo código de status no cadastro foi encontrada na homologação de
29/08/2026 e corrigida)`.

---

## Passo 14 — Fazer os registros do sistema serem rastreáveis

**Por quê:** cada requisição ganha um número de identificação, e ele aparece na
resposta — mas **não** aparece nos registros internos. Quando alguém reportar um
erro com esse número, você não vai conseguir reconstruir o que aconteceu.

São **dois arquivos**.

### 14.1 — Arquivo 1 de 2

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Support/Logger.php
```

**PROCURE pelo método inteiro** (busque por `withRequestId`):

```php
    public function withRequestId(string $requestId): self
    {
        $clone = clone $this;
        $clone->logger = $this->logger->withName($this->logger->getName());
        // O Monolog 3 entrega um LogRecord, não um array. Com a assinatura
        // antiga isto lançava TypeError na primeira linha de log — o recurso de
        // correlação nunca funcionou, e nunca foi notado porque nada o chamava.
        $clone->logger->pushProcessor(
            static fn (LogRecord $record): LogRecord => $record->with(
                extra: [...$record->extra, 'request_id' => $requestId],
            )
        );

        return $clone;
    }
```

**TROQUE o método inteiro por:**

```php
    private ?string $requestId = null;

    /**
     * Passa a carimbar todo log desta requisição com o id de correlação.
     *
     * Campo mutável num singleton, e não clone imutável, de propósito. O clone
     * exigiria reconfigurar o container no meio da requisição: quando o
     * RequestId roda, ErrorHandler, AuthService, MailService e MessageController
     * já foram construídos com a instância original, e o clone nunca os
     * alcançaria. Foi por isso que withRequestId() existiu por tanto tempo sem
     * um único chamador.
     *
     * O compartilhamento é seguro porque uma requisição PHP é um processo: não
     * há duas requisições dentro do mesmo Logger ao mesmo tempo.
     */
    public function setRequestId(string $requestId): void
    {
        $this->requestId = $requestId;
    }
```

**Ainda no mesmo arquivo**, agora troque **três linhas iguais**. Busque por
`$this->redact($context)` — vão aparecer 3 ocorrências, dentro dos métodos
`info`, `warning` e `error`. Em **cada uma delas**, troque:

```php
$this->redact($context)
```

por:

```php
$this->prepara($context)
```

**Por último**, PROCURE pela linha que começa o último método (busque por
`private function redact`):

```php
    private function redact(array $context): array
```

Suba até o comentário acima dela e **cole o bloco abaixo imediatamente antes do
comentário `/**` que precede o `redact`**:

```php
    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function prepara(array $context): array
    {
        if ($this->requestId !== null && !array_key_exists('request_id', $context)) {
            $context['request_id'] = $this->requestId;
        }

        return $this->redact($context);
    }

```

**Uma limpeza final:** como `LogRecord` não é mais usado, busque no topo do
arquivo pela linha `use Monolog\LogRecord;` e **apague-a**.

Salve e feche.

### 14.2 — Arquivo 2 de 2

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Http/Middleware/RequestId.php
```

Este arquivo é pequeno. **Apague tudo** (`Ctrl+A`, depois `Delete`) e **cole
isto no lugar:**

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Support\Logger;

/**
 * Correlation ID: todo log e toda resposta carregam o mesmo identificador,
 * permitindo rastrear uma requisição do front até o banco (agente 10).
 */
final class RequestId implements MiddlewareInterface
{
    public const HEADER = 'X-Request-Id';

    public function __construct(private readonly Logger $logger)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        $incoming = $request->header('x-request-id');
        $requestId = ($incoming !== null && preg_match('/^[A-Za-z0-9\-]{8,64}$/', $incoming) === 1)
            ? $incoming
            : bin2hex(random_bytes(16));

        // A partir daqui, todo log desta requisição sai correlacionado.
        $this->logger->setRequestId($requestId);

        return $next($request->withAttribute('request_id', $requestId))
            ->withHeader(self::HEADER, $requestId);
    }
}
```

Salve e feche.

### 14.3 — Teste

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose restart api && sleep 5 && curl -s -o /dev/null -H "X-Request-Id: teste-do-gustavo-123" -X POST http://localhost:8001/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"naoexiste@example.com","password":"Xx#12345"}' && sleep 1 && docker compose logs api --since 1m | grep "teste-do-gustavo-123"
```

**Deve aparecer** uma linha de log contendo `"request_id":"teste-do-gustavo-123"`.

**Se não aparecer nada**, a alteração no `Logger.php` não pegou. Confira se você
trocou as **três** ocorrências de `redact` por `prepara`.

**Rode tudo:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse
```

---

# PARTE 4 — Ajustes finais

## Passo 15 — Atualizar o Next.js

> ## ⛔ NÃO FAÇA ESTE PASSO SOZINHO
>
> Este é o único passo do guia que **precisa de um desenvolvedor**. Ele troca a
> versão do framework que constrói o site inteiro (Next 14 → 16 e React 18 →
> 19). São mudanças que quebram código, e consertar exige ler o código.
>
> **Nunca rode `npm audit fix --force`.** Esse comando faz a troca sem a
> migração e deixa o site quebrado de um jeito que só aparece depois de
> publicado.

**Por quê:** a versão atual do Next tem falhas conhecidas que permitem derrubar
o site. Não expõem dados nem dão acesso a nada — mas derrubam.

**O que passar para quem for fazer:**

- Branch própria: `chore/upgrade-next-16`
- `npm i next@16 react@19 react-dom@19` mais os `@types/*`
- Rodar, nesta ordem: `npm run typecheck`, `npm run lint`, `npm run build`,
  `npm run test`, e a suíte completa do Playwright
- Reconferir depois: CSP, `sitemap.xml`, `robots.txt`, os cabeçalhos do
  `next.config.mjs`, a sessão sobrevivendo ao F5, e o orçamento de bundle
- Fechar com `npm audit --omit=dev` sem achados de severidade alta

**Enquanto isso não acontece:** anote numa Issue do GitHub que o risco é
conhecido e aceito, com a data. Um risco anotado é gestão; um risco esquecido é
outra coisa.

---

## Passo 16 — Tirar arquivos de teste da imagem publicada

**Por quê:** a versão do sistema que vai para o servidor está levando junto os
arquivos de teste e caches da sua máquina. Não é perigoso, mas é peso e sujeira
desnecessários.

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad .dockerignore
```

Vá até o fim (`Ctrl+End`) e **acrescente**:

```
# Ferramentas e artefatos de teste não têm o que fazer na imagem de produção.
# O alvo dev não é afetado: o docker-compose monta ./v2/backend:/app por bind,
# e o COPY do Dockerfile é só o caminho de fallback para build sem mount.
**/tests
**/phpunit.xml
**/phpstan.neon
**/infection.json5
**/coverage.xml
**/coverage-html
**/.phpunit.cache
**/.phpstan.cache
**/.php-cs-fixer.cache
**/.php-cs-fixer.dist.php
```

Salve e feche.

**Teste:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker build -q -f docker/api/Dockerfile --target prod -t portifolio-teste . > /dev/null && docker run --rm --entrypoint sh portifolio-teste -c 'ls -a /app' && docker rmi portifolio-teste > /dev/null && echo "--- FIM ---"
```

Na lista **não deve aparecer** `tests`, `phpunit.xml`, `coverage.xml` nem nada
terminado em `.cache`.

**Confirme que o ambiente local continua funcionando:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test
```

Deve continuar dando `OK (48 tests, ...)`.

---

## Passo 17 — Avisar direito quando alguém excede o limite

**Por quê:** quando o sistema bloqueia por excesso de tentativas, ele diz o
tempo de espera só em texto em português. Programas que conversam com a API não
conseguem ler isso — existe um cabeçalho padrão para essa informação, e ele está
faltando.

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad v2/backend/src/Http/Middleware/RateLimit.php
```

**PROCURE por** (busque por `tooManyRequests`):

```php
        if (!$result->allowed) {
            throw HttpException::tooManyRequests(
                sprintf('Muitas requisições. Tente novamente em %d segundos.', $result->retryAfter)
            );
        }
```

**TROQUE por:**

```php
        if (!$result->allowed) {
            /*
             * Resposta montada aqui, e não exceção, para o 429 sair com os
             * mesmos cabeçalhos das respostas permitidas. Lançando, o código
             * abaixo nunca roda e o cliente recebe o limite escrito em prosa,
             * em português, sem nada que uma biblioteca consiga ler.
             */
            return Response::error(
                sprintf('Muitas requisições. Tente novamente em %d segundos.', $result->retryAfter),
                429,
                code: 'rate_limited',
            )
                ->withHeader('Retry-After', (string) $result->retryAfter)
                ->withHeader('RateLimit-Limit', (string) $max)
                ->withHeader('RateLimit-Remaining', '0')
                ->withHeader('RateLimit-Reset', (string) $result->retryAfter);
        }
```

Salve e feche.

**Teste** (dispara o limite de propósito e olha os cabeçalhos):

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose restart api && sleep 5 && for i in 1 2 3 4 5 6 7; do curl -s -o /dev/null -X POST http://localhost:8001/api/v1/messages -H 'Content-Type: application/json' -d '{"name":"QA","email":"qa@example.com","body":"x"}'; done && curl -s -o /dev/null -D- -X POST http://localhost:8001/api/v1/messages -H 'Content-Type: application/json' -d '{"name":"QA","email":"qa@example.com","body":"x"}' | grep -iE "^HTTP|retry-after|ratelimit"
```

**Deve aparecer** `429` junto com `Retry-After:` e as três linhas `RateLimit-`.

**Limpe os contadores** para não ficar bloqueado no seu próprio ambiente:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T db mysql -uroot -proot portifolio -e "DELETE FROM rate_limits;" && echo "CONTADORES LIMPOS"
```

**Rode os testes:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse
```

---

## Passo 18 — Acabar com o falso erro de formatação

**Por quê:** quando você roda a verificação de estilo, ela acusa erro no
`tsconfig.json`. O arquivo está certo — é uma diferença de quebra de linha entre
Windows e Linux. Isso custa tempo toda vez que acontece.

**Crie o arquivo:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad .gitattributes
```

Responda **Sim** para criar. **Cole e salve:**

```gitattributes
# Normaliza a quebra de linha na entrada e na saída.
#
# Sem isto, o Git de uma máquina Windows com core.autocrlf=true escreve CRLF em
# disco. O repositório continua correto — o blob tem LF —, mas o Biome, rodando
# no container sobre o bind mount, enxerga o CRLF e reprova arquivos que estão
# certos. O CI (Linux) nunca via o problema, então ele só custava tempo de quem
# desenvolve no Windows.
* text=auto eol=lf

# Binários não passam por conversão nenhuma.
*.png  binary
*.jpg  binary
*.jpeg binary
*.gif  binary
*.ico  binary
*.pdf  binary
*.woff binary
*.woff2 binary
*.ttf  binary
*.otf  binary
```

**Aplique a normalização:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git add --renormalize . && git status --short | head -20
```

Pode aparecer uma lista grande de arquivos — é normal, é só a quebra de linha
sendo ajustada.

**Teste:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T web npm run lint
```

**Deve terminar com** `Found 4 warnings.` e **nenhuma** linha dizendo
`Found 1 error`.

---

## Passo 19 — Decidir sobre a cor do site

**Por quê:** o painel deixa você escolher uma cor que torna o texto ilegível
(branco puro, por exemplo). Ele **mostra** o nível de contraste, mas não impede
de salvar. A documentação dá a entender que impede.

**Você precisa escolher uma das duas saídas:**

### Saída A — só corrigir a documentação (5 minutos, recomendada se você não quer mexer em código)

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && notepad docs/ESTADO-ATUAL.md
```

Busque por `o contraste é medido antes de salvar` e **troque essa frase** por:

```
o contraste é medido e exibido antes de salvar, mas a escolha final é de quem edita
```

Salve. Pronto — agora o documento diz a verdade.

### Saída B — bloquear cores ilegíveis (precisa de desenvolvedor)

Envolve portar o cálculo de contraste do frontend para o backend. O passo a
passo está na seção 3.4 do [`plano-de-correcao.md`](plano-de-correcao.md).

**Sugestão:** faça a saída A agora e deixe a B para quando houver tempo. O
importante é que a documentação pare de prometer o que não entrega.

---

## Passo 20 — Criar testes para a área administrativa

> **Precisa de desenvolvedor.** É escrever testes novos.

**Por quê:** a área administrativa — bloquear conta, excluir conta, editar o
site — é a parte mais poderosa do sistema e a única sem testes automáticos. Ela
funciona hoje (foi verificada na homologação), mas nada avisa se quebrar amanhã.

**O que passar para quem for fazer:** a seção 3.8 do
[`plano-de-correcao.md`](plano-de-correcao.md) tem os seis cenários sugeridos e
explica o truque para contornar o segundo fator por e-mail nos testes.

---

# PARTE 5 — Fechamento

## Passo 21 — Rodar tudo de uma vez

Depois de tudo, rode a bateria completa:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse && docker compose exec -T web npm run test && docker compose exec -T web npm run typecheck && docker compose exec -T web npm run lint
```

E o teste de ponta a ponta (leva uns 4 minutos):

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && make test-e2e
```

**Os números que você deve ver — anote e compare:**

| Verificação | Resultado esperado |
|---|---|
| PHPUnit | `OK (48 tests, 94 assertions)` |
| PHPStan | `[OK] No errors` |
| Vitest | `Tests  68 passed (68)` |
| TypeScript | sem nenhuma saída (silêncio = sucesso) |
| Biome | `Found 4 warnings.` e **zero** erros |
| Playwright | `80 passed` |

**Se algum número estiver diferente**, o problema está no último passo que você
fez. Volte nele.

---

## Passo 22 — Salvar o trabalho

**Veja o que mudou:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git status --short
```

**Grave as alterações:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git add -A && git commit -m "fix: correcoes da homologacao para producao"
```

**Envie para o GitHub:**

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git push origin dev
```

**Atenção:** este envio vai disparar a esteira automática do GitHub pela
**primeira vez na história do projeto** — ela estava desligada por um erro no
nome das branches, corrigido na homologação.

Para acompanhar, abra:
**https://github.com/GustavoHSMachado/Portifolio/actions**

**Se algo ficar vermelho, é esperado e é bom** — significa que a esteira está
funcionando e encontrando coisas que ninguém via. Me mande o que aparecer.

---

## Onde você está

Depois destes passos, o que ainda falta para publicar de verdade:

| Falta | Depende de |
|---|---|
| Contratar/escolher onde hospedar o site | Você |
| Preencher o `.env` de produção com os domínios reais | Você, com o servidor escolhido |
| Configurar o HTTPS (certificado) na borda | Você ou o painel da hospedagem |
| Agendar o cron do passo 8 | No servidor |
| Refazer o smoke test já no servidor | Depois de publicado |
| Atualizar o Next.js (passo 15) | Desenvolvedor |

O sistema em si passou em tudo — 196 verificações automáticas, e resistiu a
todos os ataques testados na homologação. O que faltava era o caminho até o ar.

---

## Se travar em algum passo

Quando pedir ajuda, mande estas três coisas:

1. **O número do passo** em que travou.
2. **O comando** que você rodou.
3. **A mensagem de erro inteira**, copiada da tela — não um resumo.

E, se quiser desfazer tudo e voltar ao começo:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git checkout -- . && git status --short
```

Isso desfaz alterações **ainda não commitadas**. Arquivos novos que você criou
continuam lá — apague-os à mão se quiser.
