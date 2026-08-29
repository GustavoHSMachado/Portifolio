# Estado atual — Portifolio

**Última atualização:** 23 de agosto de 2026
**Branch de trabalho:** `dev` · **Produção:** `master`, intocada

Este documento descreve o projeto **como ele está hoje**. Para saber como ele
chegou até aqui, veja [HISTORICO-DA-SESSAO.md](HISTORICO-DA-SESSAO.md), que
registra os dias 08 e 09 de agosto e não foi atualizado desde então.

---

## Onde o projeto está

As fases 0 a 4 estão fechadas. O que resta é o encerramento: revisão de
segurança, validação dos quatro critérios e o PR para a `master`.

| Fase | O que era | Situação |
|---|---|---|
| 0 | Ambiente de pé, migrações, primeira execução da suíte | ✅ |
| 0.5 | Esteira de qualidade funcionando de verdade | ✅ |
| 1 | Definir o que entra no portfólio | ✅ |
| 2 | Conteúdo no banco, painel de edição, home pública | ✅ |
| 3 | Responsividade, acessibilidade, SEO, performance, assets | ✅ |
| 4 | Dívida técnica | ✅ |
| 5 | Revisão de segurança, validação final, PR | ▶ B26 e B27 feitos; falta o PR |
| 6 | Área administrativa: contas, registros e aparência | ✅ |

### Os quatro critérios

Validados em 23/08/2026 (B27), com medição e não por impressão:

| Critério | Como foi medido | Resultado |
|---|---|---|
| **Limpo** | PHPStan nível 8, Biome, Knip, TypeScript | 0 erros; 4 avisos de complexidade; sem código morto |
| **Funcional** | PHPUnit, Vitest, Playwright | 48 + 46 + 80 = **174 verificações**, todas verdes |
| **Rápido** | Build de produção servido e baixado recurso a recurso | **205 KB** de 500 KB do orçamento; 295 KB de folga |
| **Responsivo** | Home, login, código 2FA, painel e projetos em 320 px | Sem estouro, sem rolagem horizontal, alvos de 44 px |

Ressalva honesta sobre "Rápido": o peso foi medido de verdade, mas a **nota do
Lighthouse não** — ela exige baixar o `@lhci/cli`. O que está aferido é o
orçamento de bytes, o CLS zero e o build de produção completo.

---

## Números

| Métrica | Valor |
|---|---|
| Migrações | 15 |
| Rotas da API | 39 |
| Telas do frontend | 13 |
| Componentes de UI | 10 |
| Testes de backend (PHPUnit) | 48 |
| Testes de frontend (Vitest) | 60 |
| Cenários E2E (Playwright) | 80 (16 × 5 navegadores) |
| Erros do PHPStan nível 8 | 0 |

---

## Como rodar

```bash
make secrets    # gera APP_KEY e JWT_SECRET no .env, na primeira vez
make up         # sobe banco, API, web, servidor de e-mail e Adminer
make urls       # mostra os endereços reais desta máquina
```

As portas saem do `.env` e mudam quando outra coisa já ocupa a padrão — por isso
`make urls` vale mais que qualquer tabela escrita aqui.

### Qualidade

```bash
make check      # tudo que o CI roda: lint, tipos e testes
make test-e2e   # ponta a ponta, e limpa as contas que a suíte cria
```

O E2E roda no serviço `e2e`, com a imagem oficial do Playwright, e **não** no
container `web`. A tag da imagem no `docker-compose.yml` precisa acompanhar a
versão de `@playwright/test` no `package.json`; desalinhadas, o navegador não
abre.

### Manutenção

```bash
make purge-dry  # mostra o que o expurgo apagaria
make purge      # apaga tokens expirados e janelas de rate limit vencidas
```

Três tabelas crescem sozinhas: `refresh_tokens` ganha uma linha a cada rotação —
uma a cada quinze minutos por sessão ativa —, `verification_tokens` acumula
convites já usados e `rate_limits` guarda um contador por bucket. O expurgo não
roda sozinho; em produção, agende:

```
0 4 * * *  docker compose exec -T api php database/purge.php
```

---

## Decisões que não são óbvias no código

**A imagem web é Debian, não Alpine.** O `package-lock.json` foi gerado fora do
Alpine e suas entradas não trazem o campo `libc`, então o npm instalava só a
variante glibc do SWC — que no Alpine falha e derrubava o build de produção.

**O CORS vem antes do ErrorHandler no pipeline.** Um middleware só enxerga a
resposta que o seguinte devolve. Com o `Cors` abaixo do `ErrorHandler`, toda
resposta de erro saía sem `Access-Control-Allow-Origin`, e o navegador recusava
entregá-la ao JavaScript: "senha incorreta" chegava ao usuário como "não
conseguimos falar com o servidor".

**A fonte é servida do repositório.** `next/font/google` baixa no build, e um
timeout de rede publica a página com a fonte de sistema sem avisar. Junto disso
apareceu um desperdício antigo: `--font-sans` trazia a string literal
`"Open Sans"`, que só casa com a fonte instalada na máquina de quem visita — o
arquivo servido pelo site era baixado a cada visita e nunca aplicado.

**Exclusão de conta anonimiza.** Marcar `deleted_at` sem mais nada deixaria o
e-mail preso pela constraint única para sempre. Ver `User::softDelete`.

**O e-mail de cadastro sai depois do commit.** Dentro da transação, o SMTP a
segurava aberta pelo tempo da entrega, e o link podia chegar antes de o token
existir no banco.

**O E2E faz o login final numa aba nova.** A tela de login chega por navegação
do lado do cliente, e digitar durante a transição não funciona: a montagem limpa
os campos. Nem `goto` nem `reload` resolvem — disputam com a navegação em curso.

**A v1 fica no repositório, congelada.** Decisão de 22/08/2026. Ela é a evidência
do projeto que o portfólio destaca — a reconstrução a partir de uma auditoria com
22 falhas —, e sem ela a história perde o "antes". Continua isolada: nenhum
container a serve, e o `v1/README.md` recusa código novo.

Se este repositório algum dia for publicado inteiro num servidor com PHP, os 20
arquivos na raiz da `v1/` passariam a responder. O deploy previsto hoje é só a
v2 (Next e API em containers próprios), mas vale lembrar disso antes de mudar de
hospedagem.

**O login tem segundo fator por e-mail.** Desde 22/08/2026, senha correta não
abre sessão: ela dispara um código de 7 dígitos que precisa ser confirmado na
tela. Recuperar e trocar senha seguem o mesmo desenho. A política de senha
passou a exigir maiúscula, minúscula, número e símbolo, com mínimo de 7. Ver a
seção 10 do CONTEXTO-DO-PROJETO.md.

**Senha já usada não volta.** `password_history` guarda as últimas cinco de cada
conta, a em vigor inclusive, e troca e recuperação recusam antes de escrever
qualquer coisa. A senha continua em Argon2id — a pergunta sobre MD5 foi levantada
em 22/08/2026 e a medição decidiu: 3,5 milhões de hashes MD5 por segundo neste
container, contra 5 do Argon2id, sem contar que MD5 não tem sal.

**A área administrativa é de uma conta só.** `ADMIN_EMAIL` no `.env` amarra o
painel a um endereço: papel de admin no banco só vale para ele. O cadastro
público está fechado por padrão (`REGISTRATION_ENABLED`), e o administrador
nasce de `php database/create-admin.php`, que pede a senha no terminal com o
eco desligado.

**Toda habilidade declara onde foi usada.** As onze entradas da seção de
tecnologias trazem evidência ancorada numa fonte verificável — as experiências
cadastradas ou este repositório. A do Java declara o alcance real e o que fica
de fora, o que é mais útil numa entrevista técnica do que a omissão.

**O banco órfão foi apagado.** Havia um segundo banco `portifolio` no MySQL do
ambiente legado (`mysql_db`), separado do banco do projeto. Continha um usuário
de seed com `senha_hash = '!'` — que não autentica ninguém — e nenhum acesso
registrado. Removido em 22/08/2026, com dump guardado em
`Projetos/Backups/2026-08-22-banco-orfao-portifolio.sql`, fora do repositório.

---

## O que entrou em 23 de agosto de 2026

**Área administrativa (Fase 6).** Três telas atrás do `RequireAdmin`:
`/admin` para o conteúdo, `/admin/usuarios` para as contas e `/admin/acessos`
para os registros do sistema.

- **Auditoria.** O `AuditLog` registra 18 eventos — entrada, senha errada,
  código errado, cadastro, confirmação de e-mail, troca e redefinição de senha,
  reuso de sessão, conteúdo salvo e excluído, mensagem recebida e as ações de
  gestão. Guarda o que aconteceu, nunca o segredo envolvido, e o expurgo apaga o
  que passa de 180 dias.
- **Gestão de contas.** Bloquear, liberar e excluir. O servidor recusa a própria
  conta e a do `ADMIN_EMAIL`. Excluir anonimiza em vez de apagar a linha, para o
  histórico de auditoria não ficar órfão.
- **Aparência e textos.** A cor de destaque e os títulos das seções saíram do
  código e viraram ajustes editáveis. As outras quatro cores do tema derivam da
  escolhida, e o contraste é medido e **exibido** antes de salvar — a escolha
  final é de quem edita, e o servidor não recusa uma cor ilegível. A cor aceita
  apenas `#rrggbb`, no servidor e no cliente, porque é o único ajuste que termina
  dentro de uma folha de estilo.

**Dois defeitos reais, encontrados ao verificar o que estava sendo construído:**

- **A sessão caía a cada F5.** O `silentRefresh` passava por fora da
  deduplicação do `api.ts`, e com o StrictMode as duas montagens do efeito
  disparavam refresh com o mesmo cookie rotativo — que o servidor lê, com razão,
  como token roubado. Corrigido com uma promessa compartilhada. **O caso de duas
  abas simultâneas foi fechado em 29/08/2026** com a janela de tolerância na
  rotação, do lado do servidor: um token rotacionado há poucos segundos é tratado
  como corrida entre abas, não como roubo, e não é re-marcado — a janela fica
  ancorada na primeira rotação e não pode ser esticada indefinidamente. Ver
  `REFRESH_ROTATION_GRACE`.
- **A suíte E2E ficou cega com o SMTP real.** Mensagem para domínio reservado
  era descartada, e os testes leem exatamente essas mensagens no Mailpit. Passou
  a ser desviada para a captura. A intermitência que sobrou tinha outra causa: o
  `limparCaixa` apagava a caixa inteira, e com dois workers um cenário apagava o
  e-mail que o outro esperava.

**Verificação do dia:** PHPStan limpo, PHPUnit 48/48, Vitest 60/60, Knip limpo,
Playwright 80/80. O controle de acesso foi testado com conta comum de verdade,
inclusive com `role = 'admin'` forjado no banco e nas claims do token — 403 em
todas as rotas administrativas, nos dois casos.

---

## O que depende do Gustavo

1. **Limpar a senha de aplicativo do histórico.** A senha foi **revogada em
   23/08/2026** — o risco acabou ali. O que resta é higiene: o commit `aba029d`
   ainda a contém, e ela também está no conteúdo atual da `master`, não só no
   histórico. O script `limpar-senha-do-historico.sh` faz a reescrita e a
   conferência; o push com `--force-with-lease` fica por conta do Gustavo.
2. **Autorizar o PR da `dev` para a `master`**, ao final.

---

## Backlog em aberto

| ID | Fase | Tarefa | Pri |
|---|---|---|---|
| B28 | 5 | PR da `dev` para a `master` | P1 · com o Gustavo |
| B50 | 6 | Credencial no histórico público — **risco aceito em 29/08/2026**; falta decidir Gitleaks (limpar histórico ou `.gitleaksignore`) | P2  |
| B52 | 7 | Definir a hospedagem e publicar (compose de produção pronto) | P1 · com o Gustavo |
| ~~B53~~ | 7 | Subir o Next para a versão sem advisories — **feito em 29/08/2026**: 16.3.3 + React 19, `npm audit` em 0 | ✅ |
| ~~B54~~ | 7 | Cobertura E2E da área administrativa — **feito**: 7 cenários, suíte de 80 para 87 | ✅ |
| ~~B55~~ | 7 | Rollback de migração — **feito**: `migrate.php --rollback` + 5 testes | ✅ |

~~B51 — Reuso de refresh token com duas abas~~ — **fechado em 29/08/2026.**

Concluídos: B01–B27, B29–B51 — 50 itens, mais a Fase 6 inteira e a homologação
de produção. Em aberto: o PR para a `master`, a limpeza do histórico e a
publicação em si.

## Homologação para produção — 29/08/2026

Rodada completa registrada em `relatorio de trabalho/homologacao-producao/`.
Resultado: **não aprovado**, por ausência de caminho de publicação — não por
qualidade de código. A aplicação resistiu a todos os ataques testados, incluindo
token forjado com o `JWT_SECRET` real.

Corrigido na sequência: o build de produção do site (que congelava `localhost`
dentro do bundle), o gatilho do CI (que apontava para branches inexistentes e
por isso **nunca havia rodado**), a janela de tolerância no refresh, o cache do
`Config::get`, a enumeração no cadastro, o `request_id` nos logs, as sondas de
saúde e a configuração de produção inteira.

## O que a revisão de segurança encontrou (B26)

**Um XSS armazenado, real e explorável.** O JSON-LD da home é escrito num
`<script>` inline com conteúdo vindo do painel, e a função que deveria escapá-lo
não escapava nada: estava escrita como `.replace(/</g, "\u003c")`, e em
JavaScript `"\u003c"` **é** o caractere `<` — a troca não fazia efeito. Havia até
um comentário afirmando que aquilo protegia. Corrigido com barra dupla, e quatro
testes em `structured-data.test.ts` passaram a executar a função, porque um
comentário mente e um teste não.

Como passava despercebido: o React escapa o HTML visível corretamente, então a
tela parecia certa. Só o bloco de dados estruturados levava a carga.

**O site não tinha Content-Security-Policy** — a API tinha. Adicionada em
`next.config.mjs`. Ela não substitui escapar a saída, mas limita o estrago de um
escape que falhe: sem `connect-src` liberado, um script injetado não consegue
enviar para fora o que roubou.

O resto passou: token forjado e `alg: none` recusados, rotas protegidas
respondendo 401, cookie de sessão com `HttpOnly` e `SameSite`, sem stack trace em
erro e sem segredo em log.

> **Correção de 29/08/2026.** Esta seção afirmava também "sem enumeração de
> contas (nem por mensagem nem por tempo de resposta)". A afirmação estava
> incompleta e a conclusão, errada: a mensagem era mesmo ambígua e o tempo de
> resposta também, mas o **código de status** entregava a informação — o cadastro
> respondia 201 para e-mail novo e 202 para e-mail já existente, e um único
> `curl` distinguia os dois. Encontrado na homologação de produção e corrigido:
> os dois casos agora devolvem 201 com o mesmo corpo. Fica o registro de que uma
> revisão pode passar por três verificações certas e ainda assim concluir errado
> por não ter olhado a quarta.
