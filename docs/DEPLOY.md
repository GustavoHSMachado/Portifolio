# Deploy

Como publicar a v2 e como voltar atrás. Criado na homologação de 29/08/2026,
que reprovou a publicação justamente por este procedimento não existir.

---

## Antes do primeiro deploy

1. **Escolher onde hospedar.** O compose de produção assume um servidor com
   Docker (VPS ou similar). Ele não cobre hospedagem compartilhada.
2. **Apontar os domínios.** Dois nomes: um para o site e um para a API — por
   exemplo `gustavohsmachado.com.br` e `api.gustavohsmachado.com.br`.

   > Os dois precisam compartilhar o mesmo domínio registrável. O cookie de
   > sessão usa `SameSite=Strict`, e domínios diferentes fariam o navegador
   > nunca enviá-lo: o refresh silencioso pararia de funcionar e a sessão cairia
   > a cada 15 minutos.

3. **Preencher o `.env`.** Ver a seção `PRODUÇÃO` do `.env.example`. Gere as
   chaves com `openssl rand -hex 32` — não reaproveite as do ambiente local.
4. **Terminar o TLS na borda.** O compose expõe HTTP na rede interna; o
   certificado fica com quem está na frente (painel da hospedagem, Traefik,
   Caddy ou nginx com certbot). Dois pontos que não podem faltar ali:
   - **HSTS no site.** A API já manda `Strict-Transport-Security` sozinha
     quando `APP_FORCE_HTTPS=true`. O Next **não** manda — precisa vir da borda.
   - **Redirecionar HTTP para HTTPS**, senão o cookie `Secure` nunca chega.
5. **Criar o administrador**, uma vez só:

       docker compose -f docker-compose.prod.yml exec api php database/create-admin.php

   O e-mail precisa ser exatamente o de `ADMIN_EMAIL`.

---

## Publicar

```bash
# 1. Trazer o código
git pull

# 2. Conferir o .env (ver a seção PRODUÇÃO do .env.example)

# 3. BACKUP DO BANCO — sem exceção, e antes de tudo
docker compose -f docker-compose.prod.yml exec -T db \
  mysqldump -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" \
  > "backup-$(date +%Y%m%d-%H%M).sql"

# 4. Marcar as imagens atuais, para poder voltar
docker tag portifolio-prod-api:latest portifolio-prod-api:$(date +%Y%m%d-%H%M)
docker tag portifolio-prod-web:latest portifolio-prod-web:$(date +%Y%m%d-%H%M)

# 5. Construir
docker compose -f docker-compose.prod.yml build

# 6. Migrar (serviço separado, roda e sai)
docker compose -f docker-compose.prod.yml run --rm migrate

# 7. Subir
docker compose -f docker-compose.prod.yml up -d

# 8. Smoke test — ver abaixo
```

> **O passo 5 reconstrói a imagem do site com as URLs de produção gravadas
> dentro dela.** Mudar `APP_URL` ou `FRONTEND_URL` no `.env` sem reconstruir
> não tem efeito nenhum no site: os valores `NEXT_PUBLIC_*` são congelados no
> build. Foi o defeito crítico que a homologação encontrou.

---

## Smoke test depois de publicar

```bash
curl -s https://api.SEU-DOMINIO/health          # 200, "service":"portifolio-api"
curl -s https://api.SEU-DOMINIO/health/ready    # 200, "database":"up"
curl -sI https://SEU-DOMINIO | grep -i strict-transport-security
curl -s https://SEU-DOMINIO/sitemap.xml | head  # precisa ter o domínio real
```

E, no navegador: abrir o site, entrar, ver o painel, sair. Se qualquer um
falhar, faça rollback antes de investigar.

---

## Rollback

### Banco

Duas voltas, e a ordem de preferência importa.

**1. O dump do passo 3 — sempre a resposta certa quando houve perda de dado.**

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  mysql -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" < backup-AAAAMMDD-HHMM.sql
```

**2. `--rollback`, para desfazer o último lote de migrações.**

```bash
docker compose -f docker-compose.prod.yml exec api php database/migrate.php --rollback
```

Ele desfaz o último lote na ordem inversa, lendo os comentários `-- ROLLBACK:`
de cada arquivo, e apaga o registro correspondente. Pede confirmação digitada e
**recusa rodar fora de um terminal interativo** — script de CI não reverte banco
sozinho.

> **Rollback devolve a ESTRUTURA, nunca o CONTEÚDO.** Um `DROP TABLE` recria a
> tabela vazia quando você migrar de novo; ele não traz de volta as linhas que
> estavam nela. Para migração que apaga ou transforma dado, `--rollback` não
> serve — o dump é a única resposta.
>
> Ele também recusa o lote inteiro se qualquer migração dele não declarar
> rollback. Meio lote revertido deixa o banco num estado que nem o código novo
> nem o velho esperam.

### Aplicação

```bash
docker tag portifolio-prod-api:AAAAMMDD-HHMM portifolio-prod-api:latest
docker tag portifolio-prod-web:AAAAMMDD-HHMM portifolio-prod-web:latest
docker compose -f docker-compose.prod.yml up -d --no-build
```

### Regra

**Todo deploy que traz migração faz o dump antes.** Se você não tem o dump, não
tem rollback — tem só esperança.

---

## Manutenção agendada

O expurgo de tokens vencidos e janelas de rate limit **não roda sozinho**. Três
tabelas crescem para sempre sem ele: `refresh_tokens` ganha uma linha a cada
rotação, `verification_tokens` acumula códigos usados e `rate_limits` guarda um
contador por bucket.

No crontab do servidor:

```
0 4 * * * cd /caminho/do/projeto && docker compose -f docker-compose.prod.yml exec -T api php database/purge.php
```

Para ver o que ele apagaria sem apagar:

```bash
docker compose -f docker-compose.prod.yml exec -T api php database/purge.php --dry-run
```

---

## O que NÃO fazer

- **Não suba o `docker-compose.yml` normal em produção.** Ele fixa
  `APP_ENV=local` e `APP_DEBUG=true`, e sobe Mailpit e Adminer junto.
- **Não publique a porta 3306.** O compose de produção não tem `ports` no
  serviço `db` de propósito.
- **Não copie os `RATE_LIMIT_*` do ambiente local.** Lá eles estão afrouxados
  para a suíte E2E poder repetir. Sem sobrescrita, valem os padrões do código,
  que já são os de produção.
- **Não publique o repositório inteiro num servidor com PHP.** A `v1/` continua
  no repositório, congelada; se algum dia ela for servida, os arquivos na raiz
  dela voltam a responder.
