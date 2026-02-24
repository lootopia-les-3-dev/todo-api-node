# Todo API

A RESTful CRUD API for managing todos, built with **Express.js** and persisted in an embedded **SQLite** database (via `sql.js`).

## Features

- Full CRUD on todos with pagination and search
- Input validation with [Zod](https://zod.dev)
- Security: [Helmet](https://helmetjs.github.io), CORS, rate limiting
- Interactive API documentation at `/docs` (Swagger UI)
- Health check endpoint
- Docker support

## Requirements

- Node.js >= 18
- [pnpm](https://pnpm.io) (or npm / yarn)

## Getting started

```bash
pnpm install
pnpm start
```

The server starts on port **3000** by default.

For development with auto-reload:

```bash
pnpm dev
```

## Environment variables

| Variable               | Default            | Description                                      |
|------------------------|--------------------|--------------------------------------------------|
| `PORT`                 | `3000`             | Port the server listens on                       |
| `DB_PATH`              | `./todo.db`        | Path to the SQLite file. Use `:memory:` for in-memory (tests) |
| `ALLOWED_ORIGIN`       | `*`                | Value of the `Access-Control-Allow-Origin` header |
| `RATE_LIMIT_WINDOW_MS` | `60000`            | Rate-limit window in milliseconds                |
| `RATE_LIMIT_MAX`       | `100`              | Max requests per window per IP                   |
| `NODE_ENV`             | —                  | Set to `production` to hide error details        |
| `API_URL`              | `http://localhost:3000` | Base URL shown in the Swagger spec          |

Copy `.env.example` (if present) or create a `.env` file at the project root to override these values.

## API endpoints

| Method   | Path              | Description                          |
|----------|-------------------|--------------------------------------|
| `GET`    | `/`               | API root                             |
| `GET`    | `/health`         | Health check (`{ status, uptime }`)  |
| `GET`    | `/docs`           | Swagger UI                           |
| `GET`    | `/todos`          | List todos (`?skip=0&limit=10`)      |
| `POST`   | `/todos`          | Create a todo                        |
| `GET`    | `/todos/search`   | Search todos by title (`?q=keyword`) |
| `GET`    | `/todos/:id`      | Get a todo by ID                     |
| `PUT`    | `/todos/:id`      | Update a todo (partial update)       |
| `DELETE` | `/todos/:id`      | Delete a todo                        |

### Todo schema

```json
{
  "id": 1,
  "title": "Buy milk",
  "description": "Oat milk",
  "status": "pending"
}
```

`status` accepted values: `pending` · `in-progress` · `done`

## Running tests

```bash
# Run tests
pnpm test

# Run tests with coverage report
pnpm test:coverage
```

Coverage thresholds are enforced at **70 %** for statements, branches, functions, and lines.

## Linting

```bash
pnpm lint         # check
pnpm lint:fix     # auto-fix
```

## Docker

```bash
# Build the image
docker build -t todo-api .

# Run the container
docker run -p 3000:3000 todo-api
```

To persist the database, mount a volume:

```bash
docker run -p 3000:3000 -v $(pwd)/data:/app/data \
  -e DB_PATH=/app/data/todo.db \
  todo-api
```

