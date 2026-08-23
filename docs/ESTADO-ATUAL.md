# Estado atual — Portifolio

**Última atualização:** 22 de agosto de 2026
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
| 5 | Revisão de segurança, validação final, PR | ⬜ |

### Os quatro critérios

| Critério | Situação |
|---|---|
| **Limpo** | Atendido no que a esteira mede: 8 gates verdes, sem código morto |
| **Funcional** | Fluxos cobertos por 154 verificações automatizadas |
| **Rápido** | 196 KB efetivos contra orçamento de 500 KB; CLS zero |
| **Responsivo** | Auditado em 320, 375, 768 e 1280 px, sem estouro horizontal |

A validação formal dos quatro é o item B27, ainda em aberto — o que está acima é
medição pontual, não a auditoria de fechamento.

---

## Números

| Métrica | Valor |
|---|---|
| Migrações | 11 |
| Rotas da API | 28 |
| Telas do frontend | 10 |
| Componentes de UI | 6 |
| Testes de backend (PHPUnit) | 48 |
| Testes de frontend (Vitest) | 42 |
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

## O que depende do Gustavo

1. **Revogar a senha de aplicativo do Gmail.** Está no histórico público do Git,
   no commit `aba029d`, e continua válida. Depois, preencher `MAIL_PASS` no
   `v1/.env`. É a pendência mais antiga do projeto.
2. **Autorizar o PR da `dev` para a `master`**, ao final.

---

## Backlog em aberto

| ID | Fase | Tarefa | Pri |
|---|---|---|---|
| B26 | 5 | Revisão de segurança final | P1 |
| B27 | 5 | Validar os quatro critérios | P1 |
| B28 | 5 | PR da `dev` para a `master` | P1 · com o Gustavo |

Concluídos até aqui: B01–B25, B29–B43 — 40 itens. Restam apenas os três da Fase 5.
