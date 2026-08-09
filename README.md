# Portifolio

Portfólio pessoal de **Gustavo Henrique Santos Machado**, com área autenticada.

O repositório abriga duas versões: a **v1**, legada e em manutenção corretiva, e a
**v2**, em construção, que é o alvo do desenvolvimento.

---

## Estrutura

```
.
├── .github/            Workflows de CI e templates de Issue/PR
├── docs/               Documentação do projeto
├── docker/             Dockerfiles e configuração dos containers
├── v1/                 Legado — PHP procedural (somente correções de segurança)
├── v2/                 Alvo — API REST em PHP 8.3 + Next.js 14
│   ├── backend/            API (MVC próprio, PSR-4)
│   ├── frontend/           Aplicação web (TypeScript, App Router)
│   └── scripts/            Automação de repositório
├── docker-compose.yml  Ambiente local completo
├── Makefile            Atalhos (make help)
└── CONTEXTO-DO-PROJETO.md  ⚠️ leitura obrigatória antes de contribuir
```

---

## Por onde começar

| Você quer... | Leia |
|---|---|
| Contribuir com código | **[CONTEXTO-DO-PROJETO.md](CONTEXTO-DO-PROJETO.md)** — regras de trabalho, arquitetura e padrões |
| Rodar o projeto localmente | [docs/PASSO-A-PASSO.md](docs/PASSO-A-PASSO.md) |
| Entender o que havia de errado na v1 | [docs/RELATORIO-REFATORACAO.md](docs/RELATORIO-REFATORACAO.md) |
| Saber tudo que já foi feito e o que falta | [docs/HISTORICO-DA-SESSAO.md](docs/HISTORICO-DA-SESSAO.md) |

> **Agentes de IA:** leiam `CONTEXTO-DO-PROJETO.md` antes de qualquer alteração.
> Ele define o fluxo de Issues e Pull Requests, os limites entre camadas e os
> princípios de interface que valem para todo o repositório.

---

## Stack

**v2 — backend**
PHP 8.3 · MVC próprio (PSR-4) · MySQL 8 · JWT com refresh rotativo · PHPUnit · PHPStan

**v2 — frontend**
Next.js 14 (App Router) · TypeScript strict · Framer Motion · Biome · Vitest · Playwright

**Esteira**
GitHub Actions · Codecov · Stryker · Lighthouse CI · Gitleaks · CodeQL · Sentry · OpenTelemetry

---

## Início rápido — Docker (recomendado)

Único requisito: **Docker Desktop** instalado e rodando.

```bash
make secrets    # gera APP_KEY e JWT_SECRET em .env
make up         # sobe banco, API, web, servidor de e-mail e cliente de banco
```

| Serviço | Endereço | O que é |
|---|---|---|
| Web | http://localhost:3000 | A aplicação |
| API | http://localhost:8000/health | A API REST |
| E-mails | http://localhost:8025 | Caixa de entrada falsa — todo e-mail cai aqui |
| Banco | http://localhost:8080 | Adminer (servidor `db`, usuário `root`, senha `root`) |

As migrações rodam sozinhas no boot. `make help` lista todos os comandos.

<details>
<summary>Sem Docker (instalação manual)</summary>

```bash
# Backend
cd v2/backend
composer install
cp .env.example .env          # preencha APP_KEY e JWT_SECRET
php database/migrate.php
composer run serve            # http://127.0.0.1:8000

# Frontend (em outro terminal)
cd v2/frontend
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

</details>

Passo a passo completo, incluindo instalação no Windows e criação das Issues no
GitHub: **[docs/PASSO-A-PASSO.md](docs/PASSO-A-PASSO.md)**.

---

## Fluxo de contribuição

1. Toda mudança começa por uma **Issue**, classificada como `correção`, `melhoria` ou `nova função`.
2. Branch a partir de `develop`: `fix/<issue>-<slug>`, `feat/<issue>-<slug>` ou `chore/<issue>-<slug>`.
3. Commits em **Conventional Commits** — validados pelo Commitlint no CI.
4. **Pull Request** informando a Issue, o que mudou, como foi validado, e riscos e próximos passos.
5. Merge só com o **Quality Gate** verde e uma aprovação.

Detalhes em [CONTEXTO-DO-PROJETO.md](CONTEXTO-DO-PROJETO.md).

---

## Licença

Uso pessoal. O template visual original da v1 é o
[Namari](https://www.shapingrain.com), da ShapingRain.
