# Correções aplicadas — 29/08/2026

Registro das alterações feitas **depois** da homologação, com autorização
explícita do dono do projeto. Complementa
[`relatorio-homologacao.md`](relatorio-homologacao.md) e executa
[`plano-de-correcao.md`](plano-de-correcao.md).

**Nada foi enviado para o repositório remoto.** Sem `commit`, sem `push`,
`master` intocada — por instrução direta.

---

## Resumo

| | Antes | Depois |
|---|---|---|
| PHPUnit | 48/48 | **50/50** (2 testes novos) |
| PHPStan nível 8 | 0 erros | **0 erros** |
| **PHP-CS-Fixer** | **14 arquivos reprovados** ⚠️ | **0** |
| Vitest | 68/68 | **68/68** |
| TypeScript | 0 erros | **0 erros** |
| Biome | **1 erro** + 4 avisos | **0 erros** + 4 avisos |
| Knip | limpo | limpo |
| Playwright E2E | 80/80 | **80/80** |

Problemas do relatório: **17**. Resolvidos agora: **11**. Já resolvidos durante a
homologação: **2**. Restam **4**, todos dependendo de decisão sua.

---

## Um achado novo, encontrado ao executar

**O `composer run lint` (PHP-CS-Fixer) reprovava 14 arquivos.** Eu não havia
rodado esse comando durante a homologação — rodei o PHPStan e assumi o estilo
coberto. Foi uma falha da minha verificação, e ela teria aparecido como job
vermelho no CI.

Confirmei que **não era artefato de CRLF**: copiei os arquivos para dentro do
container, converti tudo para LF e o fixer ainda reprovava 10. São violações
reais, acumuladas porque a esteira nunca rodou.

Aplicado `composer run lint:fix` depois de revisar o diff inteiro: só aspas
duplas viraram simples, alinhamento de `=>` e um `use` não utilizado removido.
Nenhuma mudança semântica, apesar de o `.php-cs-fixer.dist.php` ter
`setRiskyAllowed(true)`.

> **7 dos arquivos corrigidos não têm relação com as correções desta rodada**
> (`purge.php`, `ContentController`, `VerificationToken`, `Validator`,
> `ValidatorTest`, `create-admin.php`, `definir-senha.php`). É formatação
> mecânica pré-existente. Se você preferir separar, vale um commit próprio:
> `style(api): aplica o PHP-CS-Fixer`.

---

## O que foi corrigido

### CRI-01 · Build de produção do site — `docker/web/Dockerfile`

`ARG` + `ENV` para `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_SITE_URL` no estágio de
build, com padrão igual ao fallback do código.

**Verificado na imagem real:** o bundle passou a conter
`https://api.exemplo.local` e **não** contém mais `http://127.0.0.1:8000`.

---

### CRI-02 · Configuração e procedimento de produção — 4 arquivos novos

| Arquivo | O que é |
|---|---|
| `docker/nginx/api.conf` | O servidor web que faltava na frente do php-fpm |
| `docker-compose.prod.yml` | Stack de produção completa |
| `docs/DEPLOY.md` | Publicar, smoke test, rollback, cron, e o que não fazer |
| `.env.example` (seção nova) | Todas as variáveis de produção documentadas |

Decisões que valem registro:

- **O nginx não compartilha volume com a API.** A API não serve arquivo estático
  nenhum — `public/` só tem o `index.php` —, então tudo vai direto ao FastCGI,
  sem `try_files`. Um volume e um acoplamento a menos.
- **O compose de produção não estende o local.** Herdar dele e desfazer
  `APP_ENV=local`, `APP_DEBUG=true`, Mailpit, Adminer e os rate limits
  afrouxados, item por item, é como se publica um ambiente de desenvolvimento
  sem querer.
- **`${VAR:?mensagem}` em tudo que é obrigatório.** Testado: sem as variáveis, o
  compose **recusa subir**. É melhor não subir do que subir errado.
- **IP fixo para o proxy (`172.30.0.10`).** `Request::resolveIp()` compara por
  igualdade exata e não entende CIDR; com IP dinâmico do Docker, o
  `TRUSTED_PROXIES` deixaria de casar em silêncio na primeira recriação e o rate
  limit voltaria a contar a internet inteira contra um IP só.
- **Migração é serviço separado (`profiles: [manutencao]`)**, não entrypoint.
  Com réplicas, N containers aplicariam a mesma migração em paralelo.

**Verificado:** `docker compose -f docker-compose.prod.yml build` constrói as
duas imagens, e as `NEXT_PUBLIC_*` chegam como **build args**, não como
environment.

---

### ALT-04 · Janela de tolerância no refresh — `AuthService::refresh()`

Um token rotacionado há poucos segundos passa a ser tratado como corrida entre
abas, não como roubo. Fora da janela, o comportamento é o de antes: família
revogada e `SESSAO_COMPROMETIDA` na auditoria.

**O detalhe que impede a correção de virar um buraco novo:** dentro da janela o
token **não** é re-marcado como rotacionado. Fosse, cada reapresentação empurraria
`rotated_at` para frente e a janela nunca fecharia — um token roubado seria
renovável para sempre, de dez em dez segundos.

Nova variável `REFRESH_ROTATION_GRACE` (padrão 10s), documentada no
`.env.example`.

**Dois testes de integração novos:**

- `refresh_concorrente_dentro_da_janela_nao_derruba_a_sessao` — sucesso, família
  intacta, e assertiva explícita de que `rotated_at` **não** mudou.
- `refresh_de_token_rotacionado_fora_da_janela_derruba_a_familia` — 401, família
  revogada e o evento de auditoria gravado.

O segundo é o que importa: sem ele, o primeiro só provaria que a detecção foi
desligada.

**Verificado no navegador**, o mesmo teste que reprovou na homologação: duas abas
em `/painel`, recarregadas com 40ms de diferença. Antes, uma caía na hora e a
outra no F5 seguinte. Agora **as duas seguem logadas**, e a auditoria registrou
**zero** eventos de sessão comprometida.

---

### MED-06 · Cache do `Config::get` — `src/Core/Config.php`

O cache passa a guardar o que o **ambiente** disse; o padrão é aplicado na
leitura. Antes, o primeiro chamador decidia o valor para todos os seguintes.

```
antes:  Config::get("X") → NULL ; Config::get("X","padrao") → NULL
depois: Config::get("X") → NULL ; Config::get("X","padrao") → "padrao"
```

Resolve junto o **BAI-05**: `/health` devolve `"service":"portifolio-api"` em vez
de `null`.

---

### MED-03 · Sondas de saúde fora do rate limit — `RateLimit.php`

`/health` e `/health/*` não passam mais pelo contador, que vive no banco.

**Verificado na imagem de produção, com o banco inacessível:**

```
antes:   /health → 500          /health/ready → 500
depois:  /health → 200          /health/ready → 503 {"status":"degraded","checks":{"database":"down"}}
```

O liveness deixou de cair junto com o banco — um orquestrador não vai mais
reiniciar em laço um container saudável durante uma queda de banco. E o 503 com
diagnóstico, que estava escrito no controller e nunca era alcançado, finalmente
chega ao monitoramento.

---

### MED-01 · Enumeração de contas — 3 arquivos

`AuthService::register()` agora devolve `void` e sai em silêncio quando o e-mail
existe; o controller devolve **201 com o mesmo corpo genérico** nos dois casos; o
front deixou de tratar o 202.

```
antes:   e-mail novo → 201 {"data":{"user":{...}}}    e-mail existente → 202 {"error":...}
depois:  e-mail novo → 201 {"message":"Se este..."}   e-mail existente → 201 {"message":"Se este..."}
```

Resolve junto o **BAI-06** — a resposta não devolve mais o `id` sequencial.

Confirmado antes de mexer que a tela não usava o objeto `user` (ela mostra o
e-mail que a própria pessoa digitou) e que nenhum cenário do Playwright afirma
sobre a mensagem.

---

### MED-02 · `request_id` nos logs — `Logger.php` + `RequestId.php`

`withRequestId()` (imutável, sem um único chamador desde que existe) virou
`setRequestId()`, chamado pelo middleware. Campo mutável num singleton é seguro
aqui: uma requisição PHP é um processo.

**Verificado:**

```json
{"message":"Mensagem descartada pelo campo-armadilha",
 "context":{"ip":"172.20.0.1","request_id":"homologacao-abc-456"}, ...}
```

> **Observação que não é defeito, mas vale saber:** o caminho de login com e-mail
> inexistente não grava log nenhum — ele só faz `Hash::burn()` e lança. É
> comportamento anterior e deliberado (anti-timing), mas significa que essa
> tentativa específica não aparece em log nenhum, com ou sem correlação.

---

### MED-04 · Orçamento de bundle — `.github/workflows/ci.yml`

O critério passou a medir o conteúdo **comprimido**, que é o que o visitante
baixa, em vez do tamanho em disco.

```
em disco (critério antigo):  1296 KB  contra 1024 KB  → reprovaria sempre
gzip (critério novo):         319 KB  contra  400 KB  → passa com 20% de folga
```

O teto de 400 KB foi escolhido a partir da medição real, não chutado.

---

### BAI-01 · Imagem de produção limpa — `.dockerignore`

**Verificado.** `ls -a /app` na imagem agora devolve apenas:
`.env.example composer.json composer.lock database public src storage vendor` —
sem `tests`, sem `phpunit.xml`, sem `coverage.xml`, sem caches.

O ambiente local não é afetado: o compose monta `./v2/backend:/app` por bind.

---

### BAI-03 · `Retry-After` no 429 — `RateLimit.php`

O 429 passou a ser resposta montada em vez de exceção, e sai com `Retry-After`,
`RateLimit-Limit`, `RateLimit-Remaining` e `RateLimit-Reset`.

`HttpException::tooManyRequests()` ficou sem chamadores. **Mantida** — ela
compõe um conjunto coerente de fábricas de status HTTP na classe, e remover uma
deixaria um buraco arbitrário. Registrado aqui para não virar surpresa.

---

### BAI-04 · `.gitattributes`

`* text=auto eol=lf` mais os binários. `git add --renormalize .` aplicado.

Resolve o falso erro do Biome no `tsconfig.json` e o CRLF que inflava a contagem
do PHP-CS-Fixer.

---

### BAI-02 · Contraste da cor — documentação corrigida

Escolhida a **postura de só corrigir a frase**, que era a recomendação: o
servidor continua aceitando qualquer `#rrggbb`, e o `docs/ESTADO-ATUAL.md` agora
diz que o contraste é medido e **exibido**, com a escolha final de quem edita.

Bloquear no servidor continua disponível na seção 3.4 do plano, se você preferir.

---

### Documentação atualizada — `docs/ESTADO-ATUAL.md`

- A frase sobre contraste, corrigida.
- B51 marcado como fechado, com a explicação da janela de tolerância.
- **Correção explícita da conclusão errada da revisão B26**, que afirmava não
  haver enumeração de contas. Deixar a afirmação lá seria pior que o defeito:
  mandaria a próxima auditoria pular a verificação.
- Backlog novo (B52–B55) e uma seção sobre esta homologação.

---

## O que NÃO foi feito, e por quê

| Item | Motivo |
|---|---|
| **ALT-01** — revogar a senha do Gmail | **Risco aceito** pelo dono em 29/08/2026. Ver abaixo. |
| **ALT-01** — limpar o histórico e dar `push --force` | Exigiria enviar ao repositório remoto, e a instrução foi não subir nada. |
| **ALT-03** — subir o Next (2 majors + React 19) | Precisa de branch própria e migração assistida. Fazer junto com 11 outras correções seria imprudente. |
| **MED-05** — `--rollback` no Migrator | Fica coberto pelo dump obrigatório documentado no `DEPLOY.md`. A opção B da seção 3.2 do plano segue disponível. |
| **E2E da área administrativa** | Testes novos, escopo próprio. Registrado como B54. |
| **Qualquer `commit` ou `push`** | Instrução direta. Tudo está no diretório de trabalho, sem commit. |

### Risco aceito — credencial do Gmail (ALT-01)

**Decisão do dono do produto, tomada em 29/08/2026: risco aceito.**

A senha de aplicativo do Gmail exposta no histórico público **não será
revogada**. Ela é usada como senha de teste em outros sistemas do mesmo
desenvolvedor, e a decisão é mantê-la.

Consequências que ficam registradas para quem ler depois:

- O item deixa de ser pendência e passa a ser **risco aceito e datado**.
- A limpeza do histórico (`limpar-senha-do-historico.sh`), se for feita, tem
  valor de higiene e não de mitigação: reescrever o histórico não remove os
  objetos dos servidores do GitHub, que seguem acessíveis por SHA direto até a
  coleta de lixo deles.
- O Gitleaks, agora que o CI volta a rodar, vai apontar essa credencial em toda
  execução do job `security`. Será preciso ou limpar o histórico, ou registrar a
  exceção em `.gitleaksignore`, senão o job fica permanentemente vermelho — e um
  gate que sempre reprova para de ser lido.

Este último ponto é o único de efeito prático imediato, e precisa de uma escolha
antes do primeiro push com o CI ligado.

---

## Estado do repositório

```
Modificados:  .dockerignore  .env.example  .github/workflows/ci.yml
              docker/web/Dockerfile  docs/ESTADO-ATUAL.md
              v2/backend/  (9 arquivos: Config, AuthController, RateLimit,
                            RequestId, AuthService, Logger, AuthFlowTest,
                            + 7 de formatação mecânica)
              v2/frontend/src/app/(auth)/criar-conta/page.tsx

Novos:        .gitattributes  docker-compose.prod.yml  docker/nginx/api.conf
              docs/DEPLOY.md  relatorio de trabalho/

Sem commit. Sem push. master intocada.
```

**Backup antes de tudo:** `../portifolio-backup-antes-correcoes-20260829-1321.bundle`

Para desfazer qualquer arquivo: `git checkout -- caminho/do/arquivo`.

---

## Para chegar ao aprovado

1. **Decidir o que fazer com o Gitleaks** — limpar o histórico ou registrar a
   exceção em `.gitleaksignore`. Sem isso, o job `security` reprova sempre.
2. **Autorizar o commit e o push.**
3. **Escolher a hospedagem e publicar** — a configuração está pronta e validada;
   falta o destino, os domínios reais e o TLS na borda.
4. **Subir o Next** (ALT-03) — mudança controlada, em branch própria.

Feitos esses, a recomendação vira aprovação, com o risco de ALT-01 registrado
como aceito.

---

# Segunda rodada — itens 4, 5 e 6

Autorizados depois da primeira entrega. Continuam sem commit e sem push.

## Resumo

| | Primeira rodada | Agora |
|---|---|---|
| PHPUnit | 50/50 | **55/55** |
| Playwright E2E | 80/80 | **87/87** |
| `npm audit --omit=dev` | **2 HIGH** | **0 vulnerabilidades** |
| Next.js | 14.2.35 | **16.3.3** |
| React | 18.3.1 | **19.2.8** |
| Bundle (gzip) | 319 KB | **307 KB** |

---

## Um erro meu, que quase me fez reverter um upgrade que funcionava

Vale registrar porque é instrutivo, e porque contaminou medições que estão no
relatório principal.

O container de desenvolvimento tem **`NODE_ENV=development`** fixado no
Dockerfile. Rodar `npm run build` dentro dele produz um build de produção
compilado contra o React de desenvolvimento, e a prerrenderização quebra com
`TypeError: Cannot read properties of null (reading 'useContext')` — um erro que
não tem relação nenhuma com o código.

Foi assim que rodei o primeiro build depois de subir o Next 16. Concluí que o
upgrade era inviável, testei duas versões de React, dois `distDir`, com e sem a
otimização experimental, com e sem `global-error.tsx` próprio — e cheguei a
reverter tudo. Só quando o mesmo erro apareceu no **Next 14 já revertido**, com o
código original, é que ficou claro que o problema era o ambiente, não a versão.

**O que isso invalida:** a medição de bundle da primeira rodada saiu de um build
assim. Refeita corretamente, deu **319 KB** no Next 14 e **307 KB** no Next 16 —
o número quase não mudou e o orçamento de 400 KB continua certo. Mas o valor
anterior estava certo por sorte, não por método.

**A regra que fica:** build de produção se valida pelo `docker/web/Dockerfile`,
que instala do zero e não herda `NODE_ENV`. Para medir localmente, é obrigatório
`-e NODE_ENV=production`.

---

## 4 · ALT-03 — Next 16 e React 19

`next@14.2.35 → 16.3.3`, `react@18.3.1 → 19.2.8`, com os `@types/*`.

**Uma única mudança de código foi necessária no app inteiro:**
`src/components/ui/SkillIcon.tsx` usava `JSX.Element`, e o React 19 deixou de
declarar o namespace `JSX` global. Trocado por `ReactElement` importado de
`react` — que funciona nas duas versões.

A migração foi tão pequena porque o app não usava nada do que quebrou: não há
`cookies()`, `headers()`, `params` assíncrono, `rewrites`, `redirects` nem
`remotePatterns`. Verifiquei isso antes de começar, e foi o que tornou o upgrade
viável numa sessão.

**Validação:** typecheck limpo, Biome limpo, Knip limpo, Vitest 68/68,
**Playwright 87/87 nos cinco perfis**, build de produção pelo Dockerfile, imagem
subindo e servindo, CSP e `sitemap.xml` com as URLs de produção corretas.

**E o motivo de tudo:** `npm audit --omit=dev` saiu de **2 vulnerabilidades altas
para 0**.

### Efeito colateral que precisou de conserto

O `.dockerignore` da primeira rodada excluía `**/tests` do contexto de build. O
Next 16 passou a rodar `tsc` sobre `src/**/*.test.tsx`, que dependem dos matchers
declarados em `v2/frontend/tests/setup.ts` — e o build quebrou com dezenas de
erros de tipo.

Corrigido restringindo a exclusão ao backend (`v2/backend/tests`, etc.), que era
o alvo do achado BAI-01. O frontend não precisava dela: a imagem final copia
apenas `.next/standalone`, `.next/static` e `public`.

---

## 5 · Cobertura E2E da área administrativa

`tests/e2e/administracao.spec.ts` — **7 cenários novos**, de 80 para 87.

### O obstáculo, e como foi contornado

`ADMIN_EMAIL` amarrava o painel a um endereço real. Como o login tem segundo
fator, o código de 7 dígitos sairia por SMTP para uma caixa de verdade, e nenhum
teste conseguiria lê-lo. Foi por isso que essa área ficou sem cobertura.

**`ADMIN_EMAIL` passou a aceitar lista separada por vírgula** (`RequireAdmin`,
usando o `Config::list` que já existia). O ambiente local inclui
`admin@portifolio.local` — domínio reservado, que o `MailService` desvia para o
Mailpit. Produção segue com uma conta só: o `docker-compose.prod.yml` não inclui
o segundo endereço.

A propriedade de segurança não muda: a allowlist continua vivendo no arquivo do
servidor, fora do alcance de quem escreva na coluna `role`. **Verificado na
prática:** os dois endereços da lista devolvem 200; uma conta com `role='admin'`
no banco e fora da lista devolve **403**.

`database/seed-e2e-admin.php` cria a conta, recusa rodar com
`APP_ENV=production`, e é chamado pelo `make test-e2e` antes da suíte. O
`purge.php --test-data` já a remove junto com as demais `@portifolio.local`.

### Os cenários

1. Sem sessão, `/admin` manda para o login
2. **Conta comum não alcança o painel nem os dados** — as duas metades separadas,
   porque só a segunda é controle de acesso: 403 em quatro rotas administrativas
3. As três telas abrem com o conteúdo esperado
4. **Recusa bloquear e excluir a própria conta** — regra que só existe no
   servidor e cujo sintoma é irrecuperável pela interface
5. Bloqueia uma conta, impede a entrada, libera de volta
6. Um texto salvo no painel aparece na home pública — painel, API, banco,
   revalidação de cache e home
7. A trilha de auditoria acompanha o que foi feito

### Uma decisão de infraestrutura

O arquivo roda num **projeto próprio do Playwright**, fora dos outros cinco. Os
cenários escrevem em `site_settings`, que é estado global do site: cinco
navegadores salvando ao mesmo tempo se atropelariam, e a falha apareceria como
intermitência sem causa — foi o que já aconteceu nesta suíte quando um cenário
limpava a caixa do Mailpit que outro esperava.

Pelo mesmo motivo o spec limpa a caixa do administrador antes de cada login: o
endereço é reusado entre cenários, e `aguardarEmail` devolve a mensagem mais
recente que **já existe**, sem esperar pela próxima.

---

## 6 · MED-05 — Rollback de migração

`Migrator::rollback()` e `rollbackStatementsIn()`, mais
`php database/migrate.php --rollback`.

- **Lê as duas convenções que já existiam** nos arquivos `.sql` (`-- ROLLBACK: x`
  inline, e o bloco `-- ROLLBACK` seguido de linhas comentadas). Impor uma
  terceira só criaria trabalho de migrar as quinze existentes.
- **Desfaz na ordem inversa**, e o teste prova isso com uma chave estrangeira: se
  a ordem estiver errada, o `DROP` da tabela referenciada falha.
- **Recusa o lote inteiro** se qualquer migração dele não declarar volta, sem
  executar nada. Meio lote revertido deixa o banco num estado que nem o código
  novo nem o velho esperam.
- **Exige terminal interativo** e confirmação digitada. Script de CI não reverte
  banco sozinho.

A migração `000015` não declarava rollback — ninguém notou porque nada lia esses
comentários. Corrigida, e um teste passou a exigir que **todas** declarem.

**5 testes novos** em `MigratorRollbackTest.php`, incluindo o caminho negativo.

O `docs/DEPLOY.md` foi atualizado: o `--rollback` entra como segunda opção, com o
aviso de que ele **devolve a estrutura, nunca o conteúdo** — para migração que
apaga dado, o dump continua sendo a única resposta.

### Um detalhe que custou uma depuração

Os testes rodam contra um diretório temporário, mas a tabela `migrations` **não**
é truncada entre testes — a classe base a preserva de propósito, para o schema
ser aplicado uma vez por processo. Meus primeiros testes registravam migrações e
não as removiam, envenenando o teste seguinte: `pending()` devolvia vazio,
`run()` não criava nada, e a falha aparecia longe da causa. Resolvido com prefixo
único por teste e limpeza no `tearDown`.

---

## Estado depois desta rodada

| Verificação | Resultado |
|---|---|
| PHPUnit | **55/55** |
| PHPStan nível 8 | 0 erros |
| PHP-CS-Fixer | 0 arquivos |
| Vitest | 68/68 |
| TypeScript | 0 erros |
| Biome | 0 erros, 4 avisos |
| Knip | limpo |
| Playwright | **87/87** |
| `composer audit` | 0 |
| `npm audit --omit=dev` | **0** |
| Build de produção (Dockerfile) | API e site, os dois |

**Dos 17 problemas do relatório: 15 resolvidos.** Restam ALT-01, que é risco
aceito, e a publicação em si — que depende de hospedagem, domínios e TLS.

---

# Terceira rodada — Gitleaks

## Uma correção do que eu afirmei antes

Ao ir implementar o `.gitleaksignore`, rodei a ferramenta pela primeira vez —
e **duas coisas que eu havia dito estavam erradas**:

| O que eu disse | O que é |
|---|---|
| "O Gitleaks vai apontar a credencial em toda execução do CI" | **Falso.** Com as regras padrão, ele não a detecta. |
| "Se o CI estivesse rodando, o Gitleaks teria reprovado aquele commit em 2024" | **Falso.** Ele teria passado limpo. |

Verificado três vezes: varredura do histórico completo (62 commits) — nada;
varredura do arquivo isolado do commit `aba029d`, com a senha dentro — nada; e
teste de sanidade com uma chave privada PEM e um token do GitHub — **os dois
detectados**, o que descarta a ferramenta estar quebrada.

**A causa.** O conjunto padrão do Gitleaks reconhece segredo com formato próprio:
prefixo (`ghp_`, `AKIA`, `sk_live_`), estrutura (bloco PEM) ou entropia alta.
Uma senha de aplicativo do Gmail são quatro palavras minúsculas separadas por
espaço — sem prefixo, sem estrutura, com entropia de texto comum. Ela é
invisível para as regras padrão.

Isso é mais grave do que o achado que eu esperava. O `CONTEXTO-DO-PROJETO.md`
credita ao Gitleaks o controle que impede segredo commitado, e a seção 4 abre
com "Nenhum segredo no código (...) o Gitleaks roda no CI". **O controle
existia, mas não cobria a classe de segredo que este projeto de fato vazou.**

## O que foi feito

### `.gitleaks.toml` — regras do projeto

Três regras somadas ao conjunto padrão (`useDefault = true`):

| Regra | Pega |
|---|---|
| `senha-atribuida-no-codigo` | `->Password = '...'`, `->Senha = "..."` — o padrão do PHPMailer que vazou |
| `senha-preenchida-em-env` | `MAIL_PASSWORD`, `DB_PASSWORD` e afins **com valor real** em `.env`/`.ini`/`.conf` |
| `chave-de-app-preenchida` | `APP_KEY`/`JWT_SECRET` com valor de verdade em arquivo de ambiente |

As expressões usam RE2 (Go), que **não tem lookahead** — a primeira versão que
escrevi usava `(?!...)` e derrubou a ferramenta com um panic. O que seria
exclusão por lookahead foi para a allowlist.

Allowlist, com o motivo de cada entrada: `.env.example` (modelo, existe para ser
preenchido), `vendor/` e `node_modules/` (dependência de terceiro),
`relatorio de trabalho/` (descrever o vazamento não é vazar), as regras de
validação `required|...` (não são senhas), a senha do administrador de teste do
E2E, e o hash público de `Hash::burn()`.

### `.gitleaksignore` — os dois achados históricos

Com as regras novas, o commit `aba029d` passa a ser detectado — duas ocorrências,
em `configEmail.php` e `formail.php`. Elas estão registradas como exceção, com o
contexto inteiro escrito no arquivo: de quem é a credencial, que o risco foi
aceito em 29/08/2026, e que reescrever o histórico não apaga os objetos do
GitHub.

**O que continua reprovando:** qualquer senha nova. Testado — uma linha
`$mail->Password = "hunter2secreto"` num arquivo novo e um `MAIL_PASSWORD` com
valor real são detectados; `DB_PASSWORD=${DB_PASSWORD}` e variável vazia, não.

### CI

O passo do Gitleaks passou a apontar explicitamente para a configuração via
`GITLEAKS_CONFIG`, com o comentário explicando por que ela não é cosmética.

## Estado

```
varredura do histórico com as regras novas: no leaks found
```

O job `security` fica verde, e a proteção agora cobre a classe de segredo que o
projeto realmente vazou — que era o ponto.
