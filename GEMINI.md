# Project Overview

This is a monorepo containing a full-stack application with a Next.js frontend and a FastAPI backend. The project is containerized using Docker and uses PostgreSQL as the database. The backend also includes Celery for asynchronous task processing.

## Building and Running

The primary way to build and run the project is through Docker Compose, which is managed via a `Makefile`.

- **Start the application:**
  ```bash
  make up
  ```
- **Stop the application:**
  ```bash
  make down
  ```
- **View logs:**
  ```bash
  make logs
  ```
- **Run database migrations:**
  ```bash
  make migrate
  ```
- **Run frontend tests:**
  ```bash
  make frontend-test
  ```

## Development Conventions

### Backend

- The backend is a FastAPI application.
- It uses Alembic for database migrations.
- API endpoints are organized by resource under `backend/app/api/v1/endpoints`.
- It uses Celery for background tasks.

### Frontend

- The frontend is a Next.js application.
- It uses `vitest` for testing.
- It uses `openapi-typescript` to generate API types from the backend's OpenAPI schema. The command to do this is `npm run gen:api`.
- It uses `zustand` for state management.
