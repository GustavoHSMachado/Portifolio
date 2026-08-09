# Atalhos da stack local. Rode `make` para ver todos os comandos.
#
# Requisito único: Docker Desktop instalado e rodando.

SHELL := /bin/bash
COMPOSE := docker compose

# As portas e credenciais vivem no .env. Alvos que precisam delas carregam este
# trecho antes, para não repetir valores que já estão configurados em um lugar só.
LOAD_ENV := if [ -f .env ]; then set -a; . ./.env; set +a; fi

.DEFAULT_GOAL := help
.PHONY: help up down restart build rebuild logs ps shell-api shell-web shell-db \
        migrate migrate-status test test-api test-web test-e2e lint typecheck check \
        secrets clean reset urls

## ---------------------------------------------------------------- ##
##  Ambiente                                                         ##
## ---------------------------------------------------------------- ##

help: ## Mostra esta ajuda
	@echo ""
	@echo "  Portifolio — comandos disponíveis"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""

up: ## Sobe toda a stack (primeira vez demora: baixa imagens e instala deps)
	$(COMPOSE) up -d
	@echo ""
	@$(MAKE) --no-print-directory urls

down: ## Derruba a stack (mantém o banco)
	$(COMPOSE) down

restart: ## Reinicia os serviços
	$(COMPOSE) restart

build: ## Reconstrói as imagens
	$(COMPOSE) build

rebuild: ## Reconstrói do zero, ignorando cache
	$(COMPOSE) build --no-cache

logs: ## Acompanha os logs de todos os serviços
	$(COMPOSE) logs -f

ps: ## Estado dos containers
	$(COMPOSE) ps

urls: ## Mostra os endereços dos serviços
	@$(LOAD_ENV); \
	echo "  Web       http://localhost:$${WEB_PORT:-3000}"; \
	echo "  API       http://localhost:$${API_PORT:-8000}/health"; \
	echo "  E-mails   http://localhost:$${MAILPIT_PORT:-8025}"; \
	echo "  Banco     http://localhost:$${ADMINER_PORT:-8080}  (servidor: db · usuário: root · senha: $${DB_ROOT_PASSWORD:-root})"; \
	echo ""

## ---------------------------------------------------------------- ##
##  Terminais                                                        ##
## ---------------------------------------------------------------- ##

shell-api: ## Abre um shell no container da API
	$(COMPOSE) exec api sh

shell-web: ## Abre um shell no container do frontend
	$(COMPOSE) exec web sh

shell-db: ## Abre o cliente MySQL
	@$(LOAD_ENV); \
	$(COMPOSE) exec db mysql -uroot -p"$${DB_ROOT_PASSWORD:-root}" "$${DB_NAME:-portifolio}"

## ---------------------------------------------------------------- ##
##  Banco de dados                                                   ##
## ---------------------------------------------------------------- ##

migrate: ## Aplica as migrações pendentes
	$(COMPOSE) exec api php database/migrate.php

migrate-status: ## Lista migrações aplicadas e pendentes
	$(COMPOSE) exec api php database/migrate.php --status

## ---------------------------------------------------------------- ##
##  Qualidade                                                        ##
## ---------------------------------------------------------------- ##

test: test-api test-web ## Roda os testes de backend e frontend

test-api: ## Testes do backend (PHPUnit)
	$(COMPOSE) exec api composer run test

test-web: ## Testes do frontend (Vitest)
	$(COMPOSE) exec web npm run test

test-e2e: ## Testes de ponta a ponta (Playwright)
	$(COMPOSE) exec web npm run test:e2e

lint: ## Lint de backend e frontend
	$(COMPOSE) exec api composer run lint
	$(COMPOSE) exec web npm run lint

typecheck: ## Verificação de tipos do frontend
	$(COMPOSE) exec web npm run typecheck

check: lint typecheck test ## Roda tudo que o CI roda, localmente

## ---------------------------------------------------------------- ##
##  Utilidades                                                       ##
## ---------------------------------------------------------------- ##

secrets: ## Gera .env a partir do .env.example, com APP_KEY e JWT_SECRET novos
	@if [ -f .env ]; then \
		echo "  .env já existe. Remova-o antes se quiser regenerar."; \
	else \
		sed -e "s|^APP_KEY=.*|APP_KEY=$$(openssl rand -hex 32)|" \
		    -e "s|^JWT_SECRET=.*|JWT_SECRET=$$(openssl rand -hex 32)|" \
		    .env.example > .env; \
		echo "  ✓ .env criado a partir de .env.example, com segredos novos."; \
		echo "    Se alguma porta já estiver ocupada, ajuste ali antes do 'make up'."; \
	fi

clean: ## Remove containers e volumes de build (mantém o banco)
	$(COMPOSE) down --remove-orphans
	docker volume rm -f portifolio_web-node-modules portifolio_web-next portifolio_api-vendor 2>/dev/null || true

reset: ## ⚠️ Apaga TUDO, inclusive o banco, e sobe do zero
	@read -p "  Isto apaga o banco de dados. Continuar? [s/N] " ok; \
	if [ "$$ok" = "s" ] || [ "$$ok" = "S" ]; then \
		$(COMPOSE) down -v --remove-orphans; \
		$(COMPOSE) up -d --build; \
		echo "  ✓ ambiente recriado."; \
	else \
		echo "  cancelado."; \
	fi
