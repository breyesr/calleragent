.PHONY: up down logs ps migrate
up:
	docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build
down:
	docker compose --env-file infra/.env -f infra/docker-compose.yml down -v
logs:
	docker compose --env-file infra/.env -f infra/docker-compose.yml logs -f --tail=200
ps:
	docker compose --env-file infra/.env -f infra/docker-compose.yml ps

migrate:
	docker compose --env-file infra/.env -f infra/docker-compose.yml exec backend alembic upgrade head
