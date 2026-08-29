# Plano de Correção — o que corrigir, onde, como e por quê

**Complemento de** [`relatorio-homologacao.md`](relatorio-homologacao.md)
**Data:** 29 de agosto de 2026
**Base:** `dev` @ `3595e5e`, com as duas correções já aplicadas (CRI-01 e ALT-02)

Este documento é o passo a passo. Para cada item: **por que existe**, **onde
mexer**, **como mexer** (com o código), **como provar que funcionou** e **qual o
risco de mexer**.

> **Uma correção nova entrou depois do relatório.** Ao detalhar o item BAI-05
> (`"service": null` no `/health`), a causa raiz se revelou um defeito de
> verdade no `Config::get`, e não um campo cosmético não preenchido. Ele foi
> promovido a **MED-06** e está descrito na seção 3.6. O relatório principal foi
> corrigido para refletir isso.

---

## Ordem de execução

Não é lista de compras: a ordem importa, porque um item destrava o outro.

### Fase A — desbloquear a publicação (obrigatório antes de qualquer deploy)

| Ordem | Item | Gravidade | Esforço |
|---|---|---|---|
| 1 | **ALT-01** — Rotacionar a credencial e limpar o histórico público | ALTO | 1h |
| 2 | **CRI-02** — Construir a configuração de produção e o deploy | CRÍTICO | 1–2 dias |
| 3 | **MED-03** — Tirar a sonda de saúde do rate limit | MÉDIO | 15min |
| 4 | **MED-06** — Corrigir o cache do `Config::get` | MÉDIO | 20min |

**Por que nessa ordem.** ALT-01 vem primeiro porque é o único item cujo risco
está correndo agora, com o repositório público. CRI-02 é o maior e depende de
decisões suas (onde hospedar, qual domínio). MED-03 e MED-06 são pequenos e
precisam estar dentro da imagem que você for publicar — corrigi-los depois
significa republicar.

### Fase B — antes de abrir o site para o público

| Ordem | Item | Gravidade | Esforço |
|---|---|---|---|
| 5 | **ALT-04** — Janela de tolerância na rotação do refresh | ALTO | 2h |
| 6 | **MED-04** — Decidir o orçamento de bundle do CI | MÉDIO | 30min |
| 7 | **MED-01** — Fechar a enumeração de contas no cadastro | MÉDIO | 1h |
| 8 | **MED-02** — Ligar o `request_id` nos logs | MÉDIO | 30min |

**Por que aqui.** ALT-04 e MED-01 são visíveis para quem usa o site; MED-02 é o
que vai te salvar no primeiro problema em produção; MED-04 é o que impede o CI
de ficar vermelho para sempre e virar ruído que ninguém olha.

### Fase C — logo depois, como mudança controlada

| Ordem | Item | Gravidade | Esforço |
|---|---|---|---|
| 9 | **ALT-03** — Subir o Next para a versão sem advisories | ALTO | 1–3 dias |
| 10 | **MED-05** — Definir o rollback de migração | MÉDIO | 3h |
| 11 | **BAI-01 a BAI-04** — Higiene | BAIXO | 1h no total |
| 12 | **BAI-02** — Decidir sobre o contraste da cor | BAIXO | 1h |
| 13 | **MELHORIA** — Cobertura E2E da área administrativa | — | 1 dia |

---

# 1. Fase A — desbloquear a publicação

## 1.1 ALT-01 — Rotacionar a credencial e limpar o histórico público

### Por que

A senha de aplicativo do Gmail de `gustavo.hsmachado@gmail.com` está em texto
plano em `configEmail.php` e `formail.php`, no **conteúdo atual** da branch
`master` — que é a branch padrão de um repositório **público**. Não está só no
histórico: está na primeira tela que qualquer visitante vê.

**O ponto mais importante deste item, e o que muda a ordem das ações:**

> **Reescrever o histórico do Git NÃO apaga o segredo do GitHub.**

Quando você faz `push --force`, os commits antigos deixam de ser alcançáveis por
uma branch, mas continuam existindo no servidor do GitHub e permanecem
acessíveis **por SHA direto** — via URL (`/commit/aba029d`) e via API — até que o
GitHub faça coleta de lixo, o que não tem prazo garantido. Forks, clones e
caches de terceiros também guardam cópia.

Consequência prática: **a limpeza do histórico é higiene, não é mitigação.** A
única mitigação real de um segredo vazado é **revogar o segredo**. Por isso o
passo 1 abaixo não é opcional nem substituível pelos outros.

A documentação afirma que a revogação foi feita em 23/08/2026. Não tenho como
verificar isso de fora — confirme antes de seguir.

### Onde

- Credencial: https://myaccount.google.com/apppasswords
- Script pronto: `limpar-senha-do-historico.sh` (raiz do repositório, ainda não versionado)
- Commits afetados: `aba029d`, `97a4974`, `e9483c1`

### Como

**Passo 1 — confirmar a revogação (faça isto primeiro, sempre).**

Entre em https://myaccount.google.com/apppasswords e confirme que **não existe**
mais a senha de aplicativo antiga. Se existir, revogue agora. Aproveite e revise
a atividade recente da conta em https://myaccount.google.com/notifications.

O projeto hoje usa o SMTP da Hostinger (`no-reply@gustavohsmachado.com.br`), não
o Gmail — então revogar não quebra nada.

**Passo 2 — rodar o script.**

O script é bem escrito: exige árvore limpa, faz um bundle completo de backup
antes de tocar em qualquer coisa, lê a senha do próprio commit (ela nunca passa
pela linha de comando nem pelo histórico do shell), reescreve, expira o reflog,
roda `gc` e confere commit a commit se sobrou ocorrência. Ele **não faz push**.

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && ./limpar-senha-do-historico.sh
```

Anote os SHAs que ele imprime antes e depois.

**Passo 3 — conferir por conta própria antes de enviar.**

```bash
for c in $(git rev-list --all); do git grep -q "rgom" $c -- 2>/dev/null && echo "AINDA EM $c"; done; echo "conferencia concluida"
```

**Passo 4 — enviar.**

```bash
git push --force-with-lease origin dev && git push --force-with-lease origin master
```

Se houver proteção de branch na `master`, suspenda em Settings → Branches
durante o envio e **religue logo depois**.

**Passo 5 — pedir a purga ao GitHub (é este passo que fecha o buraco no servidor).**

Abra um chamado em https://support.github.com/ pedindo a remoção das referências
órfãs (*"stale/unreachable commits"*) do repositório `GustavoHSMachado/Portifolio`,
citando os SHAs `aba029d`, `97a4974` e `e9483c1`. Sem esse pedido, os commits
continuam acessíveis por URL direta.

**Passo 6 — versionar o script.**

Ele documenta o que foi feito e não contém segredo nenhum (lê do commit). Vale
commitar junto com o restante, ou mover para `docs/`.

### Como validar

- A senha antiga não aparece em `git rev-list --all` (passo 3).
- `https://github.com/GustavoHSMachado/Portifolio/blob/master/configEmail.php`
  devolve 404 ou o arquivo já saneado.
- A senha antiga não autentica mais no Gmail.

### Risco de mexer

**Médio, e conhecido.** Reescrita de histórico muda todos os SHAs. Qualquer
clone existente precisa ser refeito (`git clone` novo, não `git pull`). Como o
projeto tem um único autor, o impacto é seu e é pequeno. O bundle de backup que
o script gera antes cobre o pior caso:

```bash
git clone ../portifolio-backup-AAAAMMDD-HHMMSS.bundle repo-restaurado
```

---

## 1.2 CRI-02 — Construir a configuração de produção e o deploy

### Por que

Hoje não existe **nada** que descreva como este sistema roda fora da sua
máquina. Concretamente, o que falta:

1. O alvo `prod` da API é **php-fpm escutando na porta 9000**. php-fpm não fala
   HTTP — ele fala FastCGI. Sem um servidor web na frente, **não há como um
   navegador chegar nele**. Esse servidor não existe no repositório.
2. `docker-compose.yml` fixa `APP_ENV: local` e `APP_DEBUG: "true"` no serviço
   `api`, e não existe um segundo arquivo que sobrescreva isso. Subir o compose
   atual num servidor publicaria a API em modo local.
3. `.env.example` documenta **apenas** as variáveis do ambiente local. Quem for
   preencher o `.env` de produção não tem lista do que precisa preencher — e
   esquecer `CORS_ALLOWED_ORIGINS` significa um site sem dados, esquecer
   `APP_SECURE_COOKIES` significa cookie de sessão trafegando sem `Secure`.
4. As migrações rodam sozinhas **apenas** no `entrypoint.sh`, que é copiado só
   no alvo `dev`. Em produção, ninguém as chama.
5. `TRUSTED_PROXIES` vazio. Atrás de um proxy reverso, `REMOTE_ADDR` passa a ser
   o IP do proxy para todo mundo, e o rate limit — que é por IP — vira **um
   balde único para a internet inteira**. Cinco tentativas de login por 15
   minutos, somadas entre todos os visitantes do site. Na prática, o primeiro
   robô que aparecer tranca o login para todos.
6. Não há rollback definido, nem da aplicação nem do banco.

### Onde

Arquivos a criar:

```
docker/nginx/api.conf              (novo)
docker-compose.prod.yml            (novo)
docs/DEPLOY.md                     (novo)
```

Arquivo a estender:

```
.env.example                       (seção de produção)
```

### Como

#### (a) `docker/nginx/api.conf` — o servidor web na frente do php-fpm

**Simplificação que vale conhecer:** a API não serve **nenhum arquivo estático**.
O diretório `public/` contém só o `index.php`. Isso significa que o nginx não
precisa compartilhar volume com o container da API, nem fazer `try_files` — pode
mandar tudo direto para o FastCGI. Menos acoplamento e um volume a menos.

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

`fastcgi_params` já entrega `REQUEST_URI`, `REQUEST_METHOD`, `CONTENT_TYPE`,
`REMOTE_ADDR` e todos os `HTTP_*` — que é exatamente o que
`Request::fromGlobals()` lê. Nada mais é necessário.

#### (b) `docker-compose.prod.yml`

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
      APP_KEY: ${APP_KEY:?openssl rand -hex 32}
      JWT_SECRET: ${JWT_SECRET:?openssl rand -hex 32}

      # IP fixo do proxy — ver a nota sobre TRUSTED_PROXIES abaixo.
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
      # ⚠️ ARGS, não environment. Ver a correção CRI-01: NEXT_PUBLIC_* é
      # substituído DENTRO do bundle, no build. Passar em runtime não tem efeito.
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
        # IP fixo para o TRUSTED_PROXIES da API funcionar — ver a nota abaixo.
        ipv4_address: 172.30.0.10

volumes:
  db-data:

networks:
  interna:
    ipam:
      config:
        - subnet: 172.30.0.0/24
```

**Nota sobre `TRUSTED_PROXIES` — leia antes de copiar.**

`Request::resolveIp()` compara `REMOTE_ADDR` com a lista por **igualdade exata**:

```php
if ($trusted !== [] && in_array($remote, array_map('trim', $trusted), true)) {
```

Ela **não entende CIDR**. Como o Docker atribui IPs dinamicamente, o IP do
container do proxy mudaria a cada recriação e a lista deixaria de casar
silenciosamente — o rate limit voltaria a contar tudo contra um IP só, sem
nenhum erro visível. Por isso o `ipv4_address` fixo acima.

Se preferir suportar faixa em vez de IP fixo, é uma mudança pequena em
`v2/backend/src/Core/Request.php`, mas aí vira código novo com teste próprio. O
IP fixo resolve hoje, sem tocar em PHP.

**Nota sobre HTTPS.** O compose acima expõe HTTP na rede interna. O TLS deve ser
terminado por quem estiver na borda — o painel da Hostinger, um Traefik/Caddy,
ou um nginx de host com certbot. Dois pontos que **não** podem ser esquecidos ali:

- **HSTS no site.** A API já manda `Strict-Transport-Security` quando
  `APP_FORCE_HTTPS=true`. O frontend Next **não manda** — precisa vir da borda.
- **`SameSite=Strict` no cookie de sessão.** Funciona quando o site e a API
  compartilham o domínio registrável (`gustavohsmachado.com.br` e
  `api.gustavohsmachado.com.br` ✅). Domínios diferentes ❌ — o navegador nunca
  enviaria o cookie e o refresh nunca funcionaria.

#### (c) Seção de produção no `.env.example`

Acrescente ao fim do arquivo:

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

# IP do proxy reverso. Comparação é por igualdade exata, não aceita CIDR:
# fixe o IP do proxy no compose. Vazio faz o rate limit contar tudo contra o
# IP do proxy — um único balde para toda a internet.
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

#### (d) `docs/DEPLOY.md` — o procedimento e o rollback

```markdown
# Deploy

## Publicar

1. `git pull` na branch `master`, no servidor.
2. Conferir o `.env` (ver a seção PRODUÇÃO do `.env.example`).
3. Construir: `docker compose -f docker-compose.prod.yml build`
4. Migrar: `docker compose -f docker-compose.prod.yml run --rm migrate`
5. Subir: `docker compose -f docker-compose.prod.yml up -d`
6. Smoke test (seção 21 do relatório de homologação).

## Rollback

**Aplicação:** as imagens são versionadas por tag. Volte a anterior e suba de novo.
Marque a tag ANTES de publicar, senão não há para onde voltar:

    docker tag portifolio-prod-api:latest portifolio-prod-api:$(date +%Y%m%d-%H%M)

**Banco:** ver a seção MED-05 do plano de correção. Enquanto não houver `down`
nas migrações, o rollback de schema é o dump prévio:

    docker compose -f docker-compose.prod.yml exec -T db \
      mysqldump -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup-antes-do-deploy.sql

**Regra:** todo deploy que traz migração faz o dump antes. Sem exceção.

## Manutenção agendada

O expurgo não roda sozinho. No crontab do servidor:

    0 4 * * * cd /caminho/do/projeto && docker compose -f docker-compose.prod.yml exec -T api php database/purge.php
```

### Como validar

Antes de apontar o DNS, suba a stack de produção na própria máquina e rode:

```bash
docker compose -f docker-compose.prod.yml config
```

Isso resolve as variáveis e falha na hora se faltar alguma obrigatória. Depois:

- `GET /health` → 200 com `"service": "portifolio-api"` (depende de MED-06)
- `GET /health/ready` → 200 com `"database": "up"`
- Cabeçalho `Strict-Transport-Security` presente
- Cabeçalho `X-Powered-By` **ausente**
- CSP do site apontando para a API real, não `localhost`
- `sitemap.xml` com o domínio real
- Smoke test completo da seção 21 do relatório

### Risco de mexer

**Baixo para o que existe hoje** — são arquivos novos, nada é alterado. O risco
está em publicar com a configuração errada, e é justamente contra isso que serve
a sintaxe `${VAR:?}`: o compose recusa subir em vez de subir errado.

---

## 1.3 MED-03 — Tirar a sonda de saúde do rate limit

### Por que

Com o banco fora do ar, medido na imagem de produção:

```
GET /health        → 500    ← liveness
GET /health/ready  → 500    ← readiness (deveria ser 503 com o diagnóstico)
```

Isso tem duas consequências, e a primeira é a grave:

1. **A sonda de liveness depende do banco.** Um orquestrador que use `/health`
   para saber se o processo está vivo vai concluir que a API morreu — e
   **reiniciar o container em laço** — enquanto o processo da API está
   perfeitamente saudável e só o banco está fora. Reinício em laço durante uma
   queda de banco é o pior momento possível para perder os containers: você
   perde os logs em memória, o opcache aquecido, e ganha ruído em cima do
   incidente real.

2. **O 503 com diagnóstico nunca chega.** O `HealthController::ready` tem um
   `try/catch` escrito para devolver
   `{"status":"degraded","checks":{"database":"down"}}`. Ele nunca é alcançado.

**A causa.** `RateLimit` é middleware **global** e roda antes do controller. Ele
grava o contador **no banco**. Com o banco fora, ele estoura primeiro e o
`ErrorHandler` converte em 500 genérico. O rastro capturado com `APP_DEBUG` ligado
comprova:

```
#2 /app/src/Services/RateLimiter.php(27)
#3 /app/src/Http/Middleware/RateLimit.php(62)
```

O `try/catch` do controller nunca roda porque a exceção acontece dois
middlewares antes dele.

### Onde

`v2/backend/src/Http/Middleware/RateLimit.php`, no início de `handle()`.

### Como

Localize:

```php
    public function handle(Request $request, callable $next): Response
    {
        if ($request->method === 'OPTIONS') {
            return $next($request);
        }
```

Substitua por:

```php
    public function handle(Request $request, callable $next): Response
    {
        if ($request->method === 'OPTIONS' || $this->isSonda($request->path)) {
            return $next($request);
        }
```

E acrescente o método à classe:

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

### Como validar

```bash
docker build -f docker/api/Dockerfile --target prod -t portifolio-api:teste . && docker run -d --name teste-saude --network portifolio_portifolio -p 8096:8000 -e APP_ENV=production -e APP_DEBUG=false -e APP_KEY=k0000000000000000000000000000000000 -e JWT_SECRET=j000000000000000000000000000000000 -e DB_HOST=db -e DB_NAME=portifolio -e DB_USER=root -e DB_PASS=ERRADA --entrypoint php portifolio-api:teste -S 0.0.0.0:8000 -t public
```

Depois:

```bash
sleep 5; echo "liveness:"; curl -s -w " [%{http_code}]\n" http://localhost:8096/health; echo "readiness:"; curl -s -w " [%{http_code}]\n" http://localhost:8096/health/ready; docker rm -f teste-saude
```

**Esperado depois da correção:**

```
liveness:  {"data":{"status":"ok",...}}                                    [200]
readiness: {"status":"degraded","checks":{"database":"down"}}              [503]
```

### Risco de mexer

**Muito baixo.** As rotas `/health` e `/health/ready` são públicas, não recebem
corpo, não escrevem nada e só leem `SELECT 1`. Tirá-las do contador não abre
superfície de abuso relevante. Rode a suíte depois:

```bash
docker compose exec -T api composer run test
```

---

## 1.4 MED-06 — O cache do `Config::get` ignora o valor padrão (achado novo)

### Por que

Este item entrou depois do relatório. Ele começou como um detalhe cosmético — o
`/health` devolvia `"service": null` em vez do nome do serviço — e a causa raiz
é um defeito de verdade, que afeta **qualquer** chave de configuração.

`Config::get()` guarda em cache o **valor resolvido**, incluindo o padrão de
quem chamou primeiro. A partir daí, o padrão pedido por qualquer outro chamador
é ignorado. Comprovado no container:

```
1) Config::get("CHAVE_INEXISTENTE")            = NULL
2) Config::get("CHAVE_INEXISTENTE", "padrao")  = NULL      ← deveria ser "padrao"

3) Config::get("OUTRA", "padrao")              = 'padrao'
4) Config::get("OUTRA")                        = 'padrao'  ← deveria ser NULL
```

**Como isso produz o `"service": null`.** O `Logger`, construído cedo porque o
`ErrorHandler` depende dele, chama `Config::get('APP_NAME')` **sem padrão**
(`Logger.php:44`, dentro de um `?:`). Isso grava `null` no cache. Depois, o
`HealthController::live()` chama `Config::get('APP_NAME', 'portifolio-api')` — e
recebe o `null` cacheado, com o padrão descartado.

**Por que isso é MÉDIO e não cosmético.** O sintoma visível hoje é um campo de
monitoramento vazio. O problema é a regra: **qual valor uma chave assume passa a
depender da ordem em que o código a lê**. Hoje isso atinge `APP_NAME`. Amanhã,
alguém lê `Config::get('SOME_TTL')` num caminho novo antes do
`Config::int('SOME_TTL', 900)` e o padrão de segurança some sem aviso, sem erro e
sem teste vermelho. É uma armadilha silenciosa no ponto mais central da
configuração.

### Onde

`v2/backend/src/Core/Config.php`, método `get()`.

### Como

O conserto é separar duas coisas que hoje estão misturadas: **o que o ambiente
disse** (cacheável, imutável durante a requisição) e **o que o chamador quer
quando o ambiente não disse nada** (por chamada).

Substitua:

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

por:

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

**Cuidado com um efeito de borda.** Uma variável definida como **string vazia**
(`APP_NAME=` no `.env`) passa a ser cacheada como `''`, não `null` — e `''`
não aciona o `??`, então o padrão **não** entra. Esse é o comportamento correto e
o mesmo de antes ("definida como vazia" ≠ "não definida"), e os chamadores que
se importam já tratam:

```php
Config::get('APP_NAME') ?: 'portifolio-api'      // Logger.php — usa ?: e cobre ''
```

O `HealthController` usa `??`, então não cobre. Se você quiser que
`APP_NAME=` também caia no padrão, defina `APP_NAME` de verdade no compose de
produção (já está no modelo da seção 1.2b) ou troque o `??` por `?:` lá.

Enquanto estiver no arquivo, `Config::set()` continua correto — ele grava no
cache de propósito, e é usado só por testes.

### Como validar

```bash
docker compose exec -T api php -r 'require "/app/vendor/autoload.php"; use App\Core\Config; Config::boot("/app"); var_dump(Config::get("NAO_EXISTE"), Config::get("NAO_EXISTE", "padrao"));'
```

**Esperado:** `NULL` e depois `string(6) "padrao"`.

E, com `APP_NAME` definido no ambiente:

```bash
curl -s http://localhost:8001/health
```

**Esperado:** `"service":"portifolio-api"` em vez de `"service":null`.

Depois, a suíte inteira — este arquivo é lido por tudo:

```bash
docker compose exec -T api composer run test && docker compose exec -T api composer run analyse
```

### Risco de mexer

**Baixo, mas é o arquivo mais central do backend** — por isso a suíte completa é
obrigatória depois. O comportamento muda **apenas** no caso que hoje está errado
(chave ausente lida com padrões diferentes). Chave presente devolve o mesmo valor
de sempre.

---

# 2. Fase B — antes de abrir para o público

## 2.1 ALT-04 — Janela de tolerância na rotação do refresh token

### Por que

Duas abas do site abertas, recarregadas quase ao mesmo tempo, e a sessão inteira
cai. Reproduzido na interface real:

```
aba 1 → /entrar   (perdeu a sessão na hora)
aba 2 → /painel   (sobreviveu)
aba 2 → /entrar   (caiu no F5 seguinte)
```

Log da API no mesmo instante:

```json
{"message":"Reuso de refresh token detectado — família revogada","level_name":"ERROR"}
```

**O que acontece.** Cada aba, ao montar, dispara um `silentRefresh`. As duas
apresentam o **mesmo** cookie rotativo. A primeira rotaciona; a segunda chega com
um token já marcado como `rotated_at` — e o servidor, corretamente segundo a
regra escrita, conclui roubo e revoga a **família inteira**.

**Consequência 1 — usabilidade.** Não cai uma aba: cai a sessão. E como o login
tem segundo fator, refazer significa senha **mais** um novo código por e-mail.
Para o gesto mais banal que existe: duas abas do mesmo site.

**Consequência 2 — e esta não está documentada.** Cada ocorrência grava
`sessao.reuso_detectado` no `audit_log` e um log de nível ERROR. Esse é o **único
alarme de roubo de sessão que o sistema tem**, e ele dispara com uso normal. A
tela `/admin/acessos` existe para mostrar exatamente esse sinal. Com falso
positivo trivial de produzir, ninguém vai distinguir um roubo real de alguém que
apertou F5 duas vezes. **A detecção que funciona é a detecção em que se confia** —
e essa deixa de ser confiável na primeira semana de uso.

Por isso o backlog está subestimando: **B51 está como P3, e o correto é ALTO.**

### Onde

- `v2/backend/src/Services/AuthService.php`, método `refresh()`
- `.env.example` (variável nova)
- `v2/backend/tests/Integration/AuthFlowTest.php` (teste novo)

Sem mudança de schema — a coluna `rotated_at` já existe.

### Como

**A ideia.** Um token rotacionado que volta **poucos segundos** depois é uma
corrida entre abas, não um roubo: quem rouba um token não o apresenta no mesmo
segundo em que o dono o apresentou. Um token rotacionado que volta **minutos ou
dias** depois continua sendo roubo. A janela separa os dois casos.

É o desenho padrão da indústria (Auth0 e Okta chamam de *reuse interval*). Dez
segundos são suficientes para qualquer corrida entre abas e curtos demais para
servir a um atacante.

**O detalhe que impede a correção de virar um buraco novo:** dentro da janela, o
token antigo **não** pode ser re-marcado como rotacionado. Se fosse, cada
reapresentação empurraria `rotated_at` para frente e a janela nunca fecharia —
um token roubado poderia ser renovado para sempre, de dez em dez segundos. A
janela precisa ficar ancorada na **primeira** rotação.

Localize, em `AuthService::refresh()`:

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

Substitua por:

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

E, mais abaixo no mesmo método, localize:

```php
        $newToken = $this->db->transaction(function () use ($row, $userAgent, $ip): string {
            $this->refreshTokens->markRotated((int) $row['id']);
```

Substitua por:

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

Acrescente ao `.env.example`:

```bash
# Segundos em que um refresh token já rotacionado ainda é aceito sem ser tratado
# como roubo. Cobre a corrida entre duas abas do site montando ao mesmo tempo.
# Curto de propósito: é o intervalo em que a detecção de reuso fica suspensa.
# REFRESH_ROTATION_GRACE=10
```

**Reforço opcional no cliente.** A deduplicação de `lib/api.ts` é por aba
(promessa em escopo de módulo). Um `BroadcastChannel` faria as abas combinarem
quem refresca, reduzindo a corrida na origem. É complementar, não substituto: a
janela no servidor é a que resolve, porque também cobre abas em janelas
diferentes, restauração de sessão do navegador e o `bfcache`.

### Como validar

**Teste de integração** (acrescente em `tests/Integration/AuthFlowTest.php`):

1. Faz login, guarda o refresh token `T`.
2. Chama refresh com `T` → sucesso, recebe `T2`.
3. Chama refresh com `T` de novo, **imediatamente** → deve dar **sucesso** e
   emitir `T3`; a família **não** pode estar revogada.
4. Manipula o `rotated_at` de `T` para 60 segundos atrás e chama de novo → deve
   dar **401 `Sessão comprometida`** e a família **deve** estar revogada.

O passo 4 é o que prova que a proteção continua existindo — sem ele, o teste só
prova que você desligou a detecção.

**Teste manual, o mesmo que reproduziu o defeito:** duas abas em `/painel`,
recarregar as duas quase juntas. As duas devem continuar em `/painel`, e o log
deve mostrar `Refresh concorrente dentro da janela de tolerância` em nível
`info` — não mais `ERROR`.

### Risco de mexer

**Médio — é código de autenticação.** Duas coisas a ter em mente:

- Durante `REFRESH_ROTATION_GRACE` segundos após cada rotação, a detecção de
  reuso fica suspensa para aquele token. É a troca consciente que se está
  fazendo, e é por isso que o valor precisa ser pequeno.
- A alteração do `isUsable` para a checagem explícita muda o caminho de código
  de sessão expirada. Confira que `RefreshToken::isUsable()` ainda é usado em
  algum lugar; se não for mais, remova-o em vez de deixar código morto.

Por ser autenticação, este é um dos casos em que o `CONTEXTO-DO-PROJETO.md` §2.4
pede revisão de segurança explícita no PR. Marque a caixa.

---

## 2.2 MED-04 — Decidir o orçamento de bundle do CI

### Por que

Medido na imagem de produção, com a mesma conta que o CI faz:

```
du -sk .next/static     → 1316 KB      (o que o CI mede)
du -sk --apparent-size  → 1184 KB
soma real em bytes      → 1.117.610    (1091 KB)
```

O job `frontend` reprova acima de **1024 KB**. Por qualquer das três medidas, o
orçamento está estourado.

Como o CI nunca rodou (ALT-02), este limite nunca chegou a ser verificado. Agora
que o gatilho está corrigido, **a primeira execução vai ficar vermelha aqui**.

**O ponto importante, e o motivo de este item não ser "otimize o bundle":** o
número medido é o tamanho **em disco, sem compressão**, que não é o que ninguém
experimenta. O que o visitante baixa é o conteúdo comprimido, e esse número está
folgado:

```
peso da home em produção, com gzip: 233.540 bytes = 228 KB   (orçamento: 500 KB)
```

Ou seja: o orçamento que descreve a experiência real **passa**. O que reprova é
um orçamento que mede uma grandeza sem correspondência com o que o usuário sente.
A decisão certa aqui é sobre **o que medir**, não sobre cortar código.

### Onde

`.github/workflows/ci.yml`, passo `Orçamento de bundle` no job `frontend`.
Se você mudar o critério, atualize também `CONTEXTO-DO-PROJETO.md` §6.

### Como

**Opção recomendada — medir comprimido, que é o que trafega.**

Substitua o passo:

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

por:

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

**Antes de fixar o `ORCAMENTO`, meça o valor atual.** Rode o comando na sua
máquina e escolha um teto com folga de uns 20% sobre o número medido — o
objetivo de um orçamento é pegar crescimento, não reprovar o estado atual:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio/v2/frontend" && npm run build && find .next/static -type f \( -name '*.js' -o -name '*.css' \) -exec gzip -c -9 {} + | wc -c
```

**Opção alternativa — manter a medida em disco e subir o teto.** Legítima, desde
que o novo teto seja escolhido a partir da medição (1316 KB hoje → teto de 1500
KB, por exemplo) e o comentário diga que a grandeza é indicativa. O que não vale
é deixar 1024 e conviver com o CI vermelho: um gate que sempre reprova para de
ser lido, e aí ele não protege mais nada.

**O que NÃO fazer agora.** Sair cortando dependência para caber. Os maiores
pedaços são o runtime do React e do Next (`framework`, `main`, `polyfills` —
361 KB juntos), que não são negociáveis, e o `optimizePackageImports` do
`framer-motion` já está ligado. Otimização sem problema medido é exatamente o
que o `CONTEXTO-DO-PROJETO.md` §3.3 pede para não fazer.

### Como validar

Rode o comando novo localmente e confira que o número faz sentido, e que o
`ORCAMENTO` escolhido passa com folga.

### Risco de mexer

**Nenhum sobre a aplicação** — é só o critério do CI. O risco é escolher um teto
frouxo demais e o gate não pegar nada; por isso a folga de 20%, e não de 200%.

---

## 2.3 MED-01 — Fechar a enumeração de contas no cadastro

### Por que

```
POST /api/v1/auth/register  {e-mail novo}       → 201
POST /api/v1/auth/register  {e-mail existente}  → 202
```

Os corpos também diferem: `{"data":{"user":{...}}}` contra
`{"error":"Se este e-mail estiver disponível..."}`.

Um `curl` responde, em uma requisição, se um endereço tem conta no site.

**Isso contraria diretamente o que o projeto exige de si mesmo.** O
`CONTEXTO-DO-PROJETO.md` §4.6 diz "nunca revele se um e-mail existe", e o
`docs/ESTADO-ATUAL.md` registra que a revisão de segurança B26 concluiu "sem
enumeração de contas (nem por mensagem nem por tempo de resposta)". A mensagem é
mesmo ambígua e o tempo de resposta também — o esforço foi feito nos dois lugares
certos. O que passou foi o **código de status**, que ninguém olhou.

**O impacto real, para ser justo:** é um portfólio, não um banco. Saber que um
e-mail tem conta aqui não é grande coisa. O que pesa não é a gravidade isolada, é
que o controle está **documentado como implementado e não está** — e é assim que
uma auditoria futura passa direto por ele.

**O que já está certo:** a tela trata o 202 exatamente como sucesso, então o
usuário legítimo nunca percebe diferença. O vazamento é só no protocolo.

### Onde

- `v2/backend/src/Services/AuthService.php` — método `register()`
- `v2/backend/src/Http/Controllers/AuthController.php` — método `register()`
- `v2/frontend/src/app/(auth)/criar-conta/page.tsx` — tratamento do 202

### Como

**Verificação prévia que torna isto seguro:** a tela de sucesso do cadastro usa
`payload.email` (o que o próprio formulário digitou), **não** a resposta da API:

```tsx
await api.post("/api/v1/auth/register", payload, { skipAuth: true });
setRegistered(payload.email);
```

Ou seja, **o objeto `user` devolvido no 201 não é usado por ninguém**. Pode sair
sem quebrar a tela. Confirmei também que nenhum cenário do Playwright afirma
sobre a mensagem de sucesso do cadastro.

**Backend — `AuthService::register()`.** Troque o `throw` por um retorno
silencioso:

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
             *
             * Quem já tem conta e tentou de novo provavelmente esqueceu que
             * tinha: o e-mail de aviso abaixo é o que resolve para essa pessoa,
             * sem contar nada a quem está sondando.
             */
            $this->mail->sendPasswordResetHint($email); // ver nota abaixo

            return;
        }
```

E mude a assinatura para `: void`, removendo o `return ['user' => ...]` do fim.

> **Nota sobre o `sendPasswordResetHint`.** Ele não existe ainda. É opcional, mas
> recomendado: sem nenhum e-mail, quem já tinha conta e tentou se cadastrar de
> novo fica sem retorno nenhum e vai achar que o cadastro travou. Um e-mail curto
> — "você já tem conta aqui; se esqueceu a senha, use este link" — resolve para o
> dono real e não conta nada para quem está sondando, porque só o dono da caixa o
> recebe. Se preferir não criar agora, apague a linha; o resto da correção
> funciona sem ela.

**Backend — `AuthController::register()`.** Uma resposta só:

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

**Frontend — `criar-conta/page.tsx`.** Remova o bloco que trata o 202, já que
ele deixa de existir:

```tsx
      // 202 significa "e-mail possivelmente já cadastrado" — a API responde
      // de forma deliberadamente ambígua para não permitir enumeração de contas.
      // Do lado do usuário legítimo, o resultado visual é o mesmo do sucesso.
      if (error.status === 202) {
        setRegistered(payload.email);
        return;
      }
```

**Não esqueça:** atualize a afirmação em `docs/ESTADO-ATUAL.md` que diz que a
revisão B26 não encontrou enumeração. Ela estava errada; deixá-la é pior do que
o defeito, porque manda a próxima auditoria pular a verificação.

### Como validar

```bash
A=http://localhost:8001; T=$(date +%s); echo "novo:"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $A/api/v1/auth/register -H "Content-Type: application/json" -d "{\"name\":\"QA Enum\",\"email\":\"enum-$T@example.com\",\"phone\":\"11987654321\",\"password\":\"Enum#2026\",\"password_confirmation\":\"Enum#2026\",\"acceptedTerms\":true}"; echo "repetido:"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $A/api/v1/auth/register -H "Content-Type: application/json" -d "{\"name\":\"QA Enum\",\"email\":\"enum-$T@example.com\",\"phone\":\"11987654321\",\"password\":\"Enum#2026\",\"password_confirmation\":\"Enum#2026\",\"acceptedTerms\":true}"```

**Esperado depois da correção:** `201` nas duas linhas.

Confira também que o corpo é idêntico nos dois casos, e rode as suítes, porque o
contrato mudou:

```bash
docker compose exec -T api composer run test && docker compose exec -T web npm run test && docker compose --profile e2e run --rm e2e
```

### Risco de mexer

**Baixo–médio.** O contrato da API muda em dois pontos (status e corpo), mas o
único consumidor é a própria tela, e ela não usava nem um nem outro. O E2E de
cadastro exercita o caminho feliz e vai pegar qualquer engano. Se você tiver
qualquer outro cliente da API — não encontrei nenhum —, ele precisa saber.

---

## 2.4 MED-02 — Ligar o `request_id` nos logs

### Por que

`grep -rn "withRequestId" src/ tests/` devolve **uma linha**: a própria definição
do método, em `Support/Logger.php:68`. **Nada o chama.** O recurso existe, está
escrito, tem comentário explicando o cuidado que se teve com ele — e nunca foi
ligado.

O resultado, na saída real da API:

```json
{"message":"Login efetuado","context":{"user_id":862,"ip":"172.20.0.1"},
 "level_name":"INFO","extra":{}}
```

`extra` vazio em toda linha. O `RequestId` gera o identificador, devolve no
cabeçalho `X-Request-Id` e o guarda como atributo da requisição — e só o
`ErrorHandler` o lê, apenas para exceções não tratadas.

**Por que isso importa no dia em que der problema.** Alguém escreve: "não
consegui entrar, deu erro, o id era `abc123`". Você acha a linha do 500 pelo id.
E para. Não consegue puxar o que aconteceu **antes** dele na mesma requisição — a
senha conferida, o código recusado, o rate limit, a falha de e-mail. Justamente
as linhas que explicam o 500.

O `CONTEXTO-DO-PROJETO.md` §6 promete "logs estruturados em JSON com `request_id`
correlacionando front e back". Metade disso funciona.

O código já foi mexido uma vez: o comentário no `Logger.php` registra que a
assinatura estava errada para o Monolog 3 e que "o recurso de correlação nunca
funcionou, e nunca foi notado porque nada o chamava". A assinatura foi
consertada. **O chamador continua não existindo.**

### Onde

- `v2/backend/src/Support/Logger.php`
- `v2/backend/src/Http/Middleware/RequestId.php`

### Como

**Por que não usar o `withRequestId()` que já existe.** Ele é imutável: devolve
um clone. Para o clone chegar aos serviços, o container teria que ser
reconfigurado no meio da requisição — mas `AuthService`, `MailService`,
`MessageController` e o próprio `ErrorHandler` **já foram construídos** com a
instância original antes de o middleware rodar. Fazer o clone chegar até eles é
refatorar o container e o pipeline.

A alternativa é assumir o que já é verdade: em PHP, **uma requisição é um
processo**. Não há concorrência dentro dela. Um campo mutável no `Logger`
singleton é seguro aqui e resolve em dez linhas, sem tocar em container nem em
pipeline.

**`Logger.php`** — substitua o método `withRequestId()` (que ninguém chama) por:

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

E, no mesmo arquivo, faça o id entrar em todo registro. Troque as três chamadas
`$this->redact($context)` por `$this->prepara($context)` e acrescente:

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

O `array_key_exists` respeita quem já passou o seu próprio `request_id` — é o
caso do `ErrorHandler`, que continua funcionando sem alteração.

**`RequestId.php`** — passe a avisar o Logger:

```php
use App\Support\Logger;

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

O container resolve o `Logger` por autowiring — não é preciso registrar nada.

**Ganho de brinde:** o middleware já aceita um `X-Request-Id` vindo de fora
(validado por regex). Se o `lib/api.ts` passar a mandar um id gerado no
navegador, a correlação passa a ir de ponta a ponta, como o documento promete. É
uma linha no `finalHeaders` do `rawRequest`, e vale a pena.

### Como validar

Reinicie a API, mande uma requisição com um id conhecido e procure por ele no log:

```bash
docker compose restart api && sleep 4 && curl -s -o /dev/null -H "X-Request-Id: homologacao-teste-123" -X POST http://localhost:8001/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"naoexiste@example.com","password":"Xx#12345"}' && docker compose logs api --since 1m | grep homologacao-teste-123
```

**Esperado:** a linha de log da tentativa de login aparece contendo
`"request_id":"homologacao-teste-123"`. Hoje ela não aparece.

### Risco de mexer

**Baixo.** O `Logger` ganha estado, mas o estado dura uma requisição e é
sobrescrito no primeiro middleware da seguinte. Nos testes de integração, que
reusam o processo, cada `App::handle()` passa pelo `RequestId` e redefine o valor.

Se você **remover** o `withRequestId()`, confira antes que nada o usa
(`grep -rn withRequestId src/ tests/`) e rode o PHPStan.

---

# 3. Fase C — mudanças controladas, logo depois

## 3.1 ALT-03 — Subir o Next para a versão sem advisories

### Por que

`npm audit --omit=dev` — só dependências de produção — reporta **2
vulnerabilidades de severidade alta**. A versão instalada é **next@14.2.35**.

Advisories que a alcançam:

| Advisory | Severidade | Assunto | Alcança este projeto? |
|---|---|---|---|
| GHSA-955p-x3mx-jcvp | alta | Exposição de endpoints de Server Function | **Não** — `grep '"use server"'` não retorna nada |
| GHSA-h25m-26qc-wcjf | alta | DoS por desserialização em RSC | **Sim** |
| GHSA-8h8q-6873-q5fj | alta | DoS com Server Components | **Sim** |
| GHSA-3g8h-86w9-wvmq | alta | Cache poisoning em redirects de middleware | **Não** — sem middleware de redirect |
| GHSA-ggv3-7p47-pfv8 | moderada | Request smuggling em rewrites | **Não** — sem `rewrites` |
| GHSA-9g9p-9gw9-jx7f | alta | DoS no Image Optimizer via `remotePatterns` | **Não** — sem `remotePatterns` |
| postcss@8.4.31 | alta | Path traversal via `sourceMappingURL` | **Não** — só no build, não vai para o runtime |

**O que sobra é real:** o App Router usa React Server Components por definição,
então as duas classes de DoS por RSC alcançam esta aplicação. Não é
comprometimento de dados nem escalada de privilégio — é derrubar o site. Para um
portfólio o impacto é reputacional, e por ser um site pessoal a chance de alguém
se dar ao trabalho é baixa.

**Por que ainda assim precisa ser resolvido:** o job `security` do CI roda
`dependency-review-action` com `fail-on-severity: high`. Com o CI ligado
(ALT-02), ele vai reprovar em todo PR que toque dependência. E o
`CONTEXTO-DO-PROJETO.md` §6 lista "Vulnerabilidades — bloqueia em severidade
alta" como regra do próprio projeto.

### Onde

`v2/frontend/package.json` e `package-lock.json`, em branch própria.

### Como

O `npm audit` indica `next@16.3.3` como a versão que resolve. **Não é upgrade de
patch — são dois majors.** Next 16 exige React 19, e há mudanças de semântica de
cache e de APIs assíncronas. Trate como projeto, não como comando.

**Não rode `npm audit fix --force`.** Ele sobe o major sem migração e deixa a
aplicação quebrada de formas que só aparecem em runtime.

Roteiro:

1. Branch dedicada: `chore/upgrade-next-16`.
2. Ler o guia oficial de migração do Next 15 e do 16, e o do React 19.
3. Subir: `npm i next@16 react@19 react-dom@19` e os `@types/*` correspondentes.
4. `npm run typecheck` e `npm run lint` — é onde a maior parte das mudanças de
   API vai aparecer.
5. `npm run build` — atenção a mudanças de comportamento de cache e ao
   `output: "standalone"`.
6. Suíte completa: Vitest **e o Playwright inteiro** (os 80 cenários). O E2E é o
   que vai pegar regressão de navegação e hidratação, que é onde majors de Next
   costumam doer.
7. Reconferir o que a homologação validou e que depende do framework: CSP,
   `sitemap.xml`, `robots.txt`, headers do `next.config.mjs`, sessão sobrevivendo
   ao F5, e o orçamento de bundle (que vai mudar).
8. `npm audit --omit=dev` limpo.

**Se o esforço não couber agora,** a decisão intermediária honesta é registrar o
risco aceito por escrito, com data e revisão marcada — em vez de deixar o CI
vermelho e ninguém olhando. Um risco aceito e datado é gestão; um gate vermelho
ignorado é dívida disfarçada.

### Como validar

`npm audit --omit=dev` sem achados de severidade alta, com as 148 verificações de
frontend (68 Vitest + 80 Playwright) verdes.

### Risco de mexer

**Alto — o maior desta lista.** Dois majors de framework mais um de React. Por
isso é branch própria, por isso o E2E completo é obrigatório, e por isso este
item está na Fase C: publicar com o Next 14 e um risco conhecido e datado é mais
seguro do que publicar com um upgrade de framework feito às pressas.

---

## 3.2 MED-05 — Definir o rollback de migração

### Por que

O `Migrator` expõe `ensureControlTable`, `applied`, `pending`, `statementsIn`,
`apply`, `nextBatch` e `run`. **Não existe `down` nem `rollback`.** Os arquivos
`.sql` trazem um comentário:

```sql
-- ROLLBACK: DROP TABLE refresh_tokens;
```

que **nada lê**. É documentação de intenção, não mecanismo.

O risco hoje é baixo porque as 15 migrações já estão aplicadas e o próximo deploy
não traz nenhuma nova. Ele nasce na primeira migração publicada: se ela falhar no
meio, ou se a versão nova precisar voltar, não há caminho de volta automatizado —
e você vai descobrir isso durante o incidente.

### Onde

- `v2/backend/src/Database/Migrator.php`
- `v2/backend/database/migrate.php`
- `docs/DEPLOY.md`

### Como

**Opção A — o dump prévio (recomendada para agora).**

Não escreva código. Torne o backup obrigatório no procedimento de deploy, como já
está no `docs/DEPLOY.md` da seção 1.2d:

```bash
docker compose -f docker-compose.prod.yml exec -T db mysqldump -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup-antes-do-deploy.sql
```

**Por que isto é suficiente hoje:** o banco é pequeno, o deploy é manual e há um
único operador. Um dump restaura qualquer estado, inclusive os que um `down` mal
escrito não recuperaria — `down` de migração destrutiva não devolve dado apagado.
Ele só desfaz estrutura.

**Opção B — implementar o `down` de verdade.**

Vale quando as migrações passarem a ser frequentes. O formato já está lá; falta
lê-lo. Esboço:

1. Padronizar o marcador nos `.sql`, aceitando várias linhas:

```sql
-- ROLLBACK-INICIO
DROP TABLE refresh_tokens;
-- ROLLBACK-FIM
```

2. `Migrator::rollbackStatementsIn(string $file): array` — extrai o bloco entre
   os marcadores, reaproveitando a mesma limpeza de comentários que o
   `statementsIn` já faz. O comentário daquele método explica por que a ordem
   entre limpar comentários e dividir por `;` importa: repita o cuidado, foi um
   defeito real que já custou caro ali.
3. `Migrator::rollback(?int $batch = null): int` — pega as migrações do último
   lote em ordem **inversa**, executa o bloco de rollback e apaga a linha da
   tabela `migrations`.
4. `php database/migrate.php --rollback` na CLI, com confirmação interativa e uma
   trava de `APP_ENV` — o mesmo cuidado que o `purge.php --test-data` já tem.
5. Teste de integração: aplica, reverte, confere que a tabela sumiu, reaplica.

**Um alerta que precisa ficar escrito junto do código:** rollback só é seguro
para migração **estrutural aditiva** (criar tabela, criar coluna, criar índice).
Migração que apaga ou transforma dado não tem volta por SQL — para essas, o dump
é a única resposta. Deixe isso num comentário no `Migrator`, senão alguém vai
confiar no `--rollback` no pior momento possível.

### Como validar

Opção A: fazer o dump e restaurá-lo num banco descartável, conferindo que a
aplicação sobe contra ele.
Opção B: o teste de integração do passo 5.

### Risco de mexer

Opção A: **nenhum** — é procedimento.
Opção B: **médio** — é código que escreve DDL. Nunca teste contra o banco de
produção, e mantenha a trava de `APP_ENV`.

---

## 3.3 BAI-01 — Tirar arquivos de teste da imagem de produção

### Por que

```bash
docker run --rm --entrypoint sh portifolio-api:prod -c 'ls -a /app'
```

devolve, além do que precisa rodar: `tests/`, `phpunit.xml`, `phpstan.neon`,
`infection.json5`, `coverage.xml`, `.phpunit.cache`, `.phpstan.cache`,
`.php-cs-fixer.cache` e `.php-cs-fixer.dist.php`.

Não é explorável — só `public/` é servido pelo nginx, e nada disso está lá. É
peso e superfície sem motivo: arquivos que revelam a estrutura interna, e caches
de análise gerados na sua máquina, que nem deveriam ter entrado no contexto de
build.

### Onde

`.dockerignore`, na raiz.

### Como

Acrescente:

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

**Confirmado antes de recomendar:** o serviço `api` do `docker-compose.yml` monta
`./v2/backend:/app` (linha 91). O container de desenvolvimento enxerga o
diretório real do host, então `make test-api` continua funcionando exatamente
igual. O `.dockerignore` só afeta o que entra no **contexto de build**.

### Como validar

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker build -f docker/api/Dockerfile --target prod -t portifolio-api:teste . && docker run --rm --entrypoint sh portifolio-api:teste -c 'ls -a /app' && docker compose exec -T api composer run test
```

**Esperado:** sem `tests`, sem `*.cache`, sem `coverage.xml` — e a suíte local
ainda passando 48/48.

### Risco de mexer

**Muito baixo.** Confirme só que `composer.json` e `composer.lock` continuam no
contexto (o estágio `build` precisa deles) — eles não estão na lista acima.

---

## 3.4 BAI-02 — Decidir o que fazer com o contraste da cor de destaque

### Por que

```
PUT /api/v1/admin/settings {"cor_destaque":"#ffffff"}  → 200
```

Branco puro foi aceito. No tema claro isso dá contraste de **1:1** contra o fundo
— texto invisível.

O servidor valida **só o formato** `#rrggbb` (`SiteSettings::corValida`). O painel
calcula a razão de contraste e a exibe muito bem, mas o botão só trava em formato
inválido:

```tsx
<Button type="submit" loading={salvando} disabled={!corOk}>
```

`corOk` é `corValida(cor)` — formato, não contraste.

**Onde está o problema de verdade.** Só o dono alcança o painel, então isto é
autoinfligido e não é falha de segurança. O que incomoda é que
`docs/ESTADO-ATUAL.md` afirma:

> "As outras quatro cores do tema derivam da escolhida, e o contraste é medido
> antes de salvar."

"Medido" está tecnicamente correto — ele é medido e mostrado. Mas quem lê entende
"é exigido". **Documentação que se lê como garantia e não é garantia é pior do
que documentação nenhuma.**

### Onde

- `v2/backend/src/Models/SiteSettings.php` e `Http/Controllers/SettingsController.php`
- `v2/frontend/src/components/admin/AparenciaSection.tsx`
- `docs/ESTADO-ATUAL.md`

### Como

**Decida entre duas posturas. Qualquer uma serve; a mistura atual não.**

**Postura 1 — exigir (recomendada).** Contraste AA não é preferência estética, é
piso de acessibilidade. Bloquear é o certo, e o servidor precisa participar:
validação só no cliente é exatamente o que o `CONTEXTO-DO-PROJETO.md` §4.8 proíbe.

No `SiteSettings`, porte a matemática que já existe em
`v2/frontend/src/lib/cores.ts`: `luminancia`, `contraste`, e a razão contra os
**quatro** fundos (`#0b0b0f` e `#14141a` no escuro; `#ffffff` e `#f4f4f6` no
claro), tomando a pior. A fórmula é a da WCAG e já está testada em
`cores.test.ts` — porte junto os casos para o PHPUnit, para as duas
implementações não divergirem com o tempo.

No `SettingsController::update`, depois da checagem de formato:

```php
            if ($chave === SiteSettings::COR_DESTAQUE) {
                if ($valor !== '' && !SiteSettings::corValida($valor)) {
                    $erros[$chave][] = 'Use uma cor no formato #rrggbb, como #5aa9ff.';
                    continue;
                }

                // Contraste é piso de acessibilidade, não gosto: validado aqui e
                // não só na tela, porque esconder o botão não é controle.
                if ($valor !== '' && SiteSettings::contrastePior($valor) < 4.5) {
                    $erros[$chave][] = sprintf(
                        'Esta cor tem contraste de %.1f:1 contra o fundo. O mínimo legível é 4,5:1.',
                        SiteSettings::contrastePior($valor),
                    );
                    continue;
                }
            }
```

E no painel, trocar `disabled={!corOk}` por `disabled={!corOk || razao < 4.5}`,
com o texto do erro explicando o que fazer — não só que reprovou.

**Postura 2 — não exigir, e dizer isso.** Se a escolha é deixar o dono decidir,
tudo bem — mas conserte a frase em `docs/ESTADO-ATUAL.md` para algo como "o
contraste é medido e exibido antes de salvar; a escolha final é de quem edita", e
ponha um aviso explícito na tela quando a razão reprovar.

### Como validar

Postura 1: `#ffffff` passa a devolver **422** com a mensagem de contraste, e
`#5aa9ff` continua devolvendo **200**.

### Risco de mexer

**Baixo.** Só cuide de não travar a cor padrão do próprio tema: `#5aa9ff` mede
cerca de 8:1 no escuro e passa com folga. Rode a validação contra ela antes de
publicar, senão o painel fica sem conseguir salvar nada.

---

## 3.5 BAI-03 — `Retry-After` na resposta 429

### Por que

O 429 hoje sai assim:

```json
{"error":"Muitas requisições. Tente novamente em 3547 segundos.","code":"rate_limited"}
```

O tempo está no corpo, em português, para um humano ler. `Retry-After` é o
cabeçalho padrão (RFC 9110) que clientes, bibliotecas e proxies leem sozinhos
para decidir quando repetir. Sem ele, todo cliente precisa interpretar texto.

Pior: os cabeçalhos `RateLimit-Limit`, `RateLimit-Remaining` e `RateLimit-Reset`
saem nas respostas **permitidas** e somem justamente no 429 — que é quando
importam. Isso acontece porque o 429 sobe pelo caminho da exceção, e os
cabeçalhos são adicionados depois do `$next()`, que nunca retorna.

### Onde

`v2/backend/src/Http/Middleware/RateLimit.php`.

### Como

Em vez de lançar exceção, devolva a resposta com os cabeçalhos. Ela continua
subindo por `SecurityHeaders`, `ErrorHandler` e `Cors`, então nada se perde.

Troque:

```php
        if (!$result->allowed) {
            throw HttpException::tooManyRequests(
                sprintf('Muitas requisições. Tente novamente em %d segundos.', $result->retryAfter)
            );
        }
```

por:

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

Se `HttpException::tooManyRequests()` ficar sem nenhum chamador, remova-a — código
morto em classe de exceção envelhece mal.

### Como validar

Estoure o limite do formulário público (5 por hora, o valor de produção) e olhe
os cabeçalhos do 429. Limpe os contadores depois:

```bash
docker compose exec -T db mysql -uroot -proot portifolio -e "DELETE FROM rate_limits;"
```

### Risco de mexer

**Muito baixo.** O corpo e o status não mudam; só entram cabeçalhos. O
`RateLimiterTest` exercita o limitador diretamente e não depende do middleware.

---

## 3.6 BAI-04 — `.gitattributes` para acabar com o CRLF

### Por que

Na sua máquina, `core.autocrlf=true`. O Git guarda LF no repositório e escreve
CRLF em disco. O Biome, rodando dentro do container sobre o bind mount, vê CRLF e
reprova o `tsconfig.json`.

**Não é defeito do repositório.** Verificado: o blob no Git tem `\n`, só a cópia
em disco tem `\r\n`, e `git status` está limpo. No CI (Linux) não acontece — foi
por isso que descartei esse "erro" na homologação.

Mas custa tempo toda vez: você roda `make lint`, vê vermelho, e precisa
investigar para concluir que não é nada. Um arquivo de duas linhas encerra o
assunto para sempre, e para qualquer máquina que clone o projeto.

### Onde

`.gitattributes`, na raiz (não existe).

### Como

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

Depois de criar, normalize o que já está em disco:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && git add --renormalize . && git status --short
```

Se aparecerem arquivos modificados, é a normalização — confira o `git diff` (deve
ser só quebra de linha) e commite junto com o `.gitattributes`.

### Como validar

```bash
docker compose exec -T web npm run lint
```

**Esperado:** os 4 avisos de complexidade e **0 erros** — hoje sai 1 erro.

### Risco de mexer

**Baixo, com uma ressalva:** `git add --renormalize` pode tocar muitos arquivos de
uma vez, e isso polui um commit. Faça num commit isolado
(`chore(repo): normaliza quebras de linha`), e confira o diff antes.

---

## 3.7 BAI-05 e BAI-06 — resolvidos por tabela

**BAI-05 — `"service": null` no `/health`.** Já resolvido pela correção do
`Config::get` (MED-06, seção 1.4), somada a definir `APP_NAME: portifolio-api` no
compose de produção — já está no modelo da seção 1.2b. Nada mais a fazer.

**BAI-06 — id sequencial do usuário na resposta do cadastro.** Some sozinho com a
correção MED-01 (seção 2.3), que para de devolver o objeto `user`. Nada mais a
fazer.

---

## 3.8 MELHORIA — Cobertura E2E da área administrativa

### Por que

Os 16 cenários do Playwright cobrem páginas públicas, cadastro, confirmação de
e-mail, login com segundo fator e recuperação de senha. **Nenhum toca `/admin`,
`/admin/usuarios` ou `/admin/acessos`.**

A Fase 6 inteira — três telas, gestão de contas, edição de aparência, trilha de
auditoria — foi validada nesta homologação por HTTP, com token de administrador
real. Passou em tudo. Mas essa validação foi feita uma vez, por mim, hoje. Não há
nada que impeça uma regressão silenciosa amanhã.

É a maior área do sistema sem rede de proteção, e é justamente a que tem mais
poder: bloquear conta, excluir conta, reescrever o conteúdo público do site.

### Onde

`v2/frontend/tests/e2e/` — um `administracao.spec.ts` novo.

### Como

**O obstáculo, e como contorná-lo.** A conta de administrador está amarrada ao
`ADMIN_EMAIL`, que é um endereço real — e o segundo fator manda o código para
essa caixa. Foi exatamente por isso que eu não pude exercitar o painel pela
interface nesta homologação.

A saída é a mesma que o E2E já usa para tudo: um endereço em domínio reservado.
Basta que o ambiente de teste aponte `ADMIN_EMAIL` para `admin@portifolio.local`.
O `MailService` desvia mensagens desse domínio para o Mailpit, e o
`global-setup.ts` pode criar a conta com `php database/create-admin.php` e
confirmá-la.

No `docker-compose.yml`, no serviço `e2e` (ou como sobrescrita do serviço `api`
durante o E2E):

```yaml
      ADMIN_EMAIL: admin@portifolio.local
```

Cenários que valem o esforço, em ordem de retorno:

1. Conta comum autenticada tentando abrir `/admin` → redirecionada, e a API
   respondendo 403. É o controle de acesso, e é o mais importante.
2. Administrador entra, abre `/admin`, edita um texto da home, salva, e o texto
   novo aparece na home pública — exercita também o `/api/revalidar`.
3. Administrador troca a cor de destaque e a home reflete.
4. Administrador bloqueia uma conta; aquela conta não consegue mais entrar;
   desbloqueia; consegue.
5. Administrador tenta bloquear **a própria conta** → recusado.
6. `/admin/acessos` lista os eventos gerados pelos passos acima.

O passo 5 é o que eu mais recomendaria não deixar de fora: é regra de negócio que
só existe no servidor, é fácil de quebrar numa refatoração, e o sintoma —
administrador que se tranca para fora do próprio painel — é irrecuperável pela
interface.

### Como validar

`docker compose --profile e2e run --rm e2e` verde, com os cenários novos
aparecendo na contagem.

### Risco de mexer

**Nenhum sobre a aplicação** — é teste novo. O cuidado é o de sempre com E2E:
cada cenário precisa criar e limpar o que usa, senão um teste passa a depender do
estado que o outro deixou. O `purge.php --test-data` já cobre as contas em
`@portifolio.local`; garanta que a conta de administrador de teste também caia
nessa faixa.

---

# 4. Resumo em uma tabela

| Ordem | ID | Gravidade | O quê | Onde | Esforço |
|---|---|---|---|---|---|
| 1 | ALT-01 | ALTO | Rotacionar credencial, limpar histórico e pedir purga ao GitHub | Google · `limpar-senha-do-historico.sh` | 1h |
| 2 | CRI-02 | **CRÍTICO** | Criar configuração e procedimento de produção | `docker/nginx/` · `docker-compose.prod.yml` · `.env.example` · `docs/DEPLOY.md` | 1–2 dias |
| 3 | MED-03 | MÉDIO | Tirar `/health*` do rate limit | `Http/Middleware/RateLimit.php` | 15min |
| 4 | MED-06 | MÉDIO | Cache do `Config::get` ignorando o padrão | `Core/Config.php` | 20min |
| 5 | ALT-04 | ALTO | Janela de tolerância na rotação do refresh | `Services/AuthService.php` | 2h |
| 6 | MED-04 | MÉDIO | Decidir o orçamento de bundle | `.github/workflows/ci.yml` | 30min |
| 7 | MED-01 | MÉDIO | Fechar a enumeração de contas | `AuthService` · `AuthController` · `criar-conta/page.tsx` | 1h |
| 8 | MED-02 | MÉDIO | Ligar o `request_id` nos logs | `Support/Logger.php` · `Middleware/RequestId.php` | 30min |
| 9 | ALT-03 | ALTO | Subir o Next (branch própria) | `package.json` | 1–3 dias |
| 10 | MED-05 | MÉDIO | Definir rollback de migração | `docs/DEPLOY.md` (+ `Migrator.php` na opção B) | 3h |
| 11 | BAI-01 | BAIXO | Tirar testes da imagem de produção | `.dockerignore` | 10min |
| 12 | BAI-03 | BAIXO | `Retry-After` no 429 | `Middleware/RateLimit.php` | 20min |
| 13 | BAI-04 | BAIXO | `.gitattributes` | raiz | 10min |
| 14 | BAI-02 | BAIXO | Decidir sobre o contraste da cor | `SiteSettings` · `SettingsController` · `AparenciaSection` · `docs/` | 1h |
| 15 | — | MELHORIA | E2E da área administrativa | `tests/e2e/administracao.spec.ts` | 1 dia |

**BAI-05 e BAI-06 não aparecem na tabela** porque somem junto com MED-06 e
MED-01, respectivamente.

---

# 5. O que fazer depois de cada correção

Vale para todas, sem exceção:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && docker compose exec -T api composer run test && docker compose exec -T api composer run analyse && docker compose exec -T web npm run test && docker compose exec -T web npm run typecheck && docker compose exec -T web npm run lint
```

E, para qualquer coisa que toque autenticação, sessão ou rota — ALT-04, MED-01,
MED-02, MED-03 —, também o ponta a ponta:

```bash
cd "/c/Users/gusta/OneDrive/Área de Trabalho/Projetos/Portifolio" && make test-e2e
```

**Números de referência de hoje**, para você saber quando algo regrediu:
PHPUnit **48/48**, Vitest **68/68**, Playwright **80/80**, PHPStan **0 erros**,
TypeScript **0 erros**, Biome **0 erros** (4 avisos de complexidade), Knip limpo.

E o lembrete que o `CONTEXTO-DO-PROJETO.md` §2.4 já faz: ALT-04 e MED-01 mexem em
autenticação e em dados pessoais. Marque a caixa de revisão de segurança no PR, e
escreva os riscos de verdade — "riscos: nenhum" é justamente o que a seção 8
daquele documento proíbe.
