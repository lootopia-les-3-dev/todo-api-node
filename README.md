# Todo API

[![CI](https://github.com/lootopia-les-3-dev/todo-api-node/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lootopia-les-3-dev/todo-api-node/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=lootopia-les-3-dev_todo-api-node&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=lootopia-les-3-dev_todo-api-node)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=lootopia-les-3-dev_todo-api-node&metric=coverage)](https://sonarcloud.io/summary/new_code?id=lootopia-les-3-dev_todo-api-node)
[![Docker Image](https://ghcr.io/lootopia-les-3-dev/todo-api-node:latest)](https://github.com/lootopia-les-3-dev/todo-api-node/pkgs/container/todo-api-node)

A REST API for managing todos, built with Express.js and SQLite.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: SQLite (sql.js)
- **Docs**: Swagger UI (`/api-docs`)
- **CI/CD**: GitHub Actions → GHCR → Render

## Getting started

```bash
pnpm install
pnpm dev
```

## Running tests

```bash
pnpm test
pnpm test:coverage
```

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET | `/todos` | List todos (supports `?skip` & `?limit`) |
| GET | `/todos/:id` | Get a todo by ID |
| GET | `/todos/search?q=` | Search todos |
| POST | `/todos` | Create a todo |
| PUT | `/todos/:id` | Update a todo |
| DELETE | `/todos/:id` | Delete a todo |

## Docs

Swagger UI available at `/docs` when the server is running.

## Environments

| Branch | Environment | Auto-deploy |
|--------|-------------|-------------|
| `develop` | Staging | ✅ on push |
| `main` | Production | ✅ on push |
