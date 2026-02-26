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
- **Monitoring**: Prometheus (`/telemetry`) + Grafana

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
