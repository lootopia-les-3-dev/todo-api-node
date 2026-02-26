# Todo API

[![CI](https://github.com/lootopia-les-3-dev/todo-api-node/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lootopia-les-3-dev/todo-api-node/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/lootopia-les-3-dev/todo-api-node/graph/badge.svg)](https://codecov.io/gh/lootopia-les-3-dev/todo-api-node)
[![Docker Image](https://ghcr.io/lootopia-les-3-dev/todo-api-node:latest)](https://github.com/lootopia-les-3-dev/todo-api-node/pkgs/container/todo-api-node)

A REST API for managing todos, built with Express.js and SQLite.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: SQLite (sql.js)
- **Docs**: Swagger UI (`/docs`)
- **CI/CD**: GitHub Actions → GHCR → Render

## Setup

### Prérequis

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9 (`npm install -g pnpm`)

### Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/lootopia-les-3-dev/todo-api-node.git
cd todo-api-node

# 2. Installer les dépendances
pnpm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire (les valeurs par défaut fonctionnent en dev)

# 4. Lancer le serveur en mode développement (hot-reload)
pnpm dev
```

Le serveur écoute sur [http://localhost:3000](http://localhost:3000).
La doc Swagger est disponible sur [http://localhost:3000/docs](http://localhost:3000/docs).

### Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3000` | Port d'écoute du serveur |
| `NODE_ENV` | `development` | Environnement (`development` \| `production`) |
| `DB_PATH` | `./todo.db` | Chemin vers le fichier SQLite |
| `API_URL` | `http://localhost:3000` | URL de base affichée dans Swagger |
| `ALLOWED_ORIGIN` | `*` | Origine autorisée pour CORS |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Fenêtre du rate limiting en ms |
| `RATE_LIMIT_MAX` | `100` | Nombre max de requêtes par fenêtre |

### Avec Docker

```bash
# Build de l'image
docker build -t todo-api-node .

# Lancer le conteneur
docker run -p 3000:3000 --env-file .env todo-api-node
```

### Commandes disponibles

```bash
pnpm dev          # Serveur avec hot-reload (nodemon)
pnpm start        # Serveur en production
pnpm test         # Tests unitaires
pnpm test:coverage # Tests avec rapport de couverture
pnpm lint         # Vérification ESLint
pnpm lint:fix     # Correction automatique ESLint
```

## Project structure

```
todo-api-node/
├── app.js                       # Express app: middleware, routes, error handlers
├── swagger.js                   # OpenAPI spec (swagger-jsdoc configuration)
├── database/
│   └── database.js              # SQLite (sql.js) init, in-memory DB, persistence
├── routes/
│   └── todo.js                  # /todos route handlers + Zod validation schemas
├── tests/
│   ├── todo.test.js             # CRUD endpoint tests
│   ├── database.test.js         # Database module tests
│   ├── error-handler.test.js    # Error handler (development) tests
│   ├── error-handler-prod.test.js # Error handler (production) tests
│   ├── route-errors.test.js     # Route-level error propagation tests
│   └── load.js                  # Test setup / DB seed helpers
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── eslint.config.js
└── sonar-project.properties
```

## API reference

### Data model

```jsonc
{
  "id": 1,                        // integer, auto-generated
  "title": "Buy groceries",       // string, 1–200 chars, required
  "description": "Oat milk, eggs",// string, max 1000 chars, or null
  "status": "pending"             // "pending" | "in-progress" | "done"
}
```

### Error formats

**Validation error** (`400`):
```json
{ "detail": [{ "path": ["fieldName"], "message": "reason" }] }
```

**Not found / generic** (`404` / `500`):
```json
{ "detail": "Todo not found" }
```

---

### System

#### `GET /`

Returns a welcome message. Useful for a quick liveness check.

**Response `200`**
```json
{ "message": "Todo API" }
```

---

#### `GET /health`

Returns the server status and process uptime.

**Response `200`**
```json
{ "status": "ok", "uptime": 3723.8 }
```

---

### Todos

#### `GET /todos`

Returns a paginated list of all todos, ordered by insertion.

| Query param | Type | Default | Constraints | Description |
|-------------|------|---------|-------------|-------------|
| `skip` | integer | `0` | ≥ 0 | Number of items to skip (offset) |
| `limit` | integer | `10` | 1–100 | Maximum number of items to return |

**Response `200`** — array of Todo objects (empty array if none match)

**Response `400`** — validation error (e.g. `limit` > 100)

```bash
GET /todos             # first 10
GET /todos?skip=10     # items 11–20
GET /todos?skip=0&limit=5
```

---

#### `GET /todos/search?q=`

Case-insensitive partial-match search on `title` (SQL `LIKE %q%`). Returns `[]` on no match — never `404`.

| Query param | Type | Required | Constraints | Description |
|-------------|------|----------|-------------|-------------|
| `q` | string | yes | 1–200 chars | Search term |

**Response `200`** — array of matching Todo objects

**Response `400`** — `q` missing or empty

```bash
GET /todos/search?q=grocery   # matches "Buy groceries", "Grocery run"
GET /todos/search?q=CALL      # case-insensitive
```

---

#### `POST /todos`

Creates a new todo. Returns the persisted object including its generated `id`.

**Request body**

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `title` | string | **yes** | — | 1–200 chars |
| `description` | string \| null | no | `null` | max 1000 chars |
| `status` | string | no | `"pending"` | `pending` \| `in-progress` \| `done` |

```json
{ "title": "Read a book" }
```

**Response `201`** — created Todo object

**Response `400`** — validation error (missing `title`, invalid `status`, …)

---

#### `GET /todos/:id`

Returns a single todo by its numeric ID.

**Path param** — `id`: integer

**Response `200`** — Todo object

**Response `404`** — `{ "detail": "Todo not found" }`

---

#### `PUT /todos/:id`

Partial update of an existing todo (**PATCH semantics** — omitted fields are preserved). Pass `"description": null` to clear it.

**Path param** — `id`: integer

**Request body** — all fields optional, at least one should be provided

| Field | Type | Constraints |
|-------|------|-------------|
| `title` | string | 1–200 chars |
| `description` | string \| null | max 1000 chars |
| `status` | string | `pending` \| `in-progress` \| `done` |

```json
{ "status": "done" }
```

**Response `200`** — updated Todo object

**Response `400`** — validation error

**Response `404`** — `{ "detail": "Todo not found" }`

---

#### `DELETE /todos/:id`

Permanently deletes a todo. This action is irreversible.

**Path param** — `id`: integer

**Response `200`** — `{ "detail": "Todo deleted" }`

**Response `404`** — `{ "detail": "Todo not found" }`

---

## Docs

Interactive Swagger UI available at `/docs` when the server is running.

## Environments

| Branch | Environment | Auto-deploy |
|--------|-------------|-------------|
| `develop` | Staging | ✅ on push |
| `main` | Production | ✅ on push |
