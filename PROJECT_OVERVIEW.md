# AgentCaller Technical Overview

## 1. Project Overview

This document provides a detailed technical overview of the AgentCaller project. The project is a monorepo containing a backend service built with FastAPI and a frontend web application built with Next.js. The primary goal of AgentCaller is to automate appointment bookings and reminders via WhatsApp, with Google Calendar integration.

### 1.1. Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis
- **Frontend**: TypeScript, React, Next.js, Tailwind CSS
- **Infrastructure**: Docker, Docker Compose

## 2. Architecture

The project is structured as a monorepo with three main components: `backend`, `frontend`, and `infra`.

### 2.1. Backend (FastAPI)

The backend is a FastAPI application responsible for handling business logic, data storage, and communication with external services.

#### 2.1.1. Project Structure

The backend code is located in the `backend/` directory. The main application is within the `backend/app/` directory, which is organized as follows:

```
backend/app/
├── api/
│   └── v1/
│       ├── endpoints/
│       │   ├── appointments.py
│       │   ├── auth.py
│       │   ├── calendar.py
│       │   ├── clients.py
│       │   ├── health.py
│       │   └── tasks.py
│       ├── schemas/
│       │   ├── appointment.py
│       │   ├── auth.py
│       │   └── client.py
│       ├── deps.py
│       └── routes.py
├── core/
│   ├── config.py
│   └── security.py
├── db/
│   ├── base.py
│   └── session.py
├── models/
│   ├── appointment.py
│   ├── client.py
│   └── user.py
├── tasks/
│   └── demo.py
├── celery_app.py
└── main.py
```

- **`main.py`**: The entry point of the FastAPI application.
- **`api/v1/`**: Contains the version 1 of the API, with endpoints, schemas, and dependencies.
- **`core/`**: Core components like configuration and security.
- **`db/`**: Database session management and base classes.
- **`models/`**: SQLAlchemy database models.
- **`schemas/`**: Pydantic schemas for data validation and serialization.
- **`tasks/`**: Celery tasks for background processing.
- **`celery_app.py`**: Celery application definition.

#### 2.1.2. API Endpoints

The API is versioned under `/v1`. The following are the main endpoints:

- **`/v1/auth`**: User authentication and registration.
  - `POST /register`: Register a new user.
  - `POST /login`: Log in a user and get an access token.
  - `GET /me`: Get the current user's information.
- **`/v1/clients`**: Client management.
  - `GET /`: List all clients with optional search.
  - `POST /`: Create a new client.
  - `GET /{client_id}`: Get a specific client.
  - `PATCH /{client_id}`: Update a client.
- **`/v1/appointments`**: Appointment management.
  - `GET /`: List all appointments with optional date filtering.
  - `POST /`: Create a new appointment.
  - `PATCH /{appointment_id}`: Update an appointment.
  - `DELETE /{appointment_id}`: Delete an appointment.
- **`/v1/calendar`**: Google Calendar integration.
  - `GET /auth-url`: Get the Google OAuth2 authorization URL.
  - `GET /callback`: Exchange the authorization code for an access token.
  - `GET /events`: List the next 10 events from the user's primary calendar.
- **`/v1/tasks`**: Celery task management.
  - `POST /ping`: Enqueue a simple ping task.
  - `POST /slow-add`: Enqueue a slow addition task.
  - `GET /result/{task_id}`: Get the result of a task.
- **`/v1/health`**: Health check.
  - `GET /ping`: A simple endpoint to check if the service is alive.

#### 2.1.3. Database Models

The database models are defined using SQLAlchemy's declarative mapping.

- **`User`**: Represents a user of the application.
  - `id`: Primary key.
  - `email`: User's email address (unique).
  - `hashed_password`: Hashed password.
  - `is_active`: Whether the user is active.
  - `created_at`: Timestamp of creation.
- **`Client`**: Represents a client of a user.
  - `id`: Primary key.
  - `name`: Client's name.
  - `phone`: Client's phone number.
- **`Appointment`**: Represents an appointment with a client.
  - `id`: Primary key.
  - `client_id`: Foreign key to the `Client` model.
  - `starts_at`: Start time of the appointment.
  - `ends_at`: End time of the appointment.
  - `notes`: Optional notes for the appointment.

#### 2.1.4. Authentication and Authorization

Authentication is handled using JWT (JSON Web Tokens). The `/v1/auth/login` endpoint returns an access token, which must be included in the `Authorization` header of subsequent requests as a Bearer token. Endpoints that require authentication use a dependency (`get_current_user`) to verify the token and get the current user.

#### 2.1.5. Asynchronous Tasks with Celery

The project uses Celery to run background tasks. The Celery application is defined in `backend/app/celery_app.py` and the tasks are in `backend/app/tasks/`. The `/v1/tasks` endpoints are used to enqueue and check the status of tasks.

### 2.2. Frontend (Next.js)

The frontend is a Next.js application that provides the user interface for interacting with the backend API.

#### 2.2.1. Project Structure

The frontend code is located in the `frontend/` directory. The main application is within the `frontend/app/` directory, which uses the Next.js App Router.

```
frontend/app/
├── (pages)
│   ├── appointments/
│   │   └── page.tsx
│   ├── clients/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   └── page.tsx
├── layout.tsx
└── ...
```

- **`layout.tsx`**: The root layout of the application.
- **`page.tsx`**: The home page of the application.
- **`appointments/page.tsx`**: Page for managing appointments.
- **`clients/page.tsx`**: Page for managing clients.
- **`login/page.tsx`**: Page for user login.
- **`dashboard/page.tsx`**: A placeholder page for a future dashboard.

#### 2.2.2. Pages and Routing

The application uses the Next.js App Router, where each `page.tsx` file corresponds to a route. The main pages are:

- `/`: Home page.
- `/clients`: Clients management page.
- `/appointments`: Appointments management page.
- `/login`: User login page.
- `/dashboard`: Dashboard page.

#### 2.2.3. Components

Reusable UI components are located in the `frontend/components/` directory. These include `Button`, `Input`, `Modal`, and `Select`.

#### 2.2.4. API Communication

The frontend communicates with the backend API using a custom `api` client built on top of `fetch` (`frontend/lib/api-client.ts`). The client automatically adds the JWT token to the headers of authenticated requests. It also handles 401 Unauthorized responses by redirecting the user to the login page. An alternative `api` client using `axios` is also available in `frontend/lib/api.ts`.

### 2.3. Infrastructure (Docker)

The project uses Docker and Docker Compose for local development. The `infra/docker-compose.yml` file defines the services needed to run the application.

#### 2.3.1. Services

- **`db`**: PostgreSQL database service.
- **`redis`**: Redis service for Celery message brokering.
- **`backend`**: The FastAPI backend service.
- **`worker`**: Celery worker for processing background tasks.
- **`beat`**: Celery beat for scheduling periodic tasks.
- **`frontend`**: The Next.js frontend service.

## 3. Getting Started

To run the project locally, you need Docker and Docker Compose installed.

1.  **Clone the repository.**
2.  **Set up environment variables**: Copy `backend/.env.example` to `infra/.env` and fill in the required values.
3.  **Run the application**: From the root of the project, run `make dev`. This will build and start all the services.
4.  **Access the application**:
    - Frontend: `http://localhost:3002`
    - Backend API: `http://localhost:8000/docs`

## 4. Developer Guidelines

The `AGENTS.md` file in the root of the project provides detailed guidelines for developers, including:

- Project structure and conventions.
- Available `make` commands.
- Coding style.
- Testing procedures.
- Commit conventions.

It is highly recommended to read this document before contributing to the project.
