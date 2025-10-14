COMPOSE = docker compose --env-file infra/.env -f infra/docker-compose.yml

.PHONY: up down logs ps migrate restart backend-shell frontend-shell smoke backend-install frontend-install frontend-test help
up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

migrate:
	$(COMPOSE) exec backend alembic upgrade head

restart:
	$(COMPOSE) down && $(COMPOSE) up -d --build

backend-shell:
	$(COMPOSE) exec backend bash

frontend-shell:
	$(COMPOSE) exec frontend sh

smoke:
	$(COMPOSE) exec backend bash /app/scripts/smoke.sh

backend-install:
	python3 -m pip install -r backend/requirements.txt

frontend-install:
	cd frontend && npm install

frontend-test:
	cd frontend && npm test

help:
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:' $(MAKEFILE_LIST) | cut -d: -f1 | sort | uniq
