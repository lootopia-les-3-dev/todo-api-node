import swaggerJsdoc from "swagger-jsdoc"

/**
 * swagger-jsdoc configuration.
 *
 * The OpenAPI spec is assembled from two sources:
 *   1. This file — shared components (schemas, parameters, responses) and
 *      routes defined directly in app.js (/, /health).
 *   2. routes/todo.js — all /todos/** routes, each annotated with @swagger.
 */
const options = {
  definition: {
    openapi: "3.0.0",

    // -------------------------------------------------------------------------
    // API metadata
    // -------------------------------------------------------------------------
    info: {
      title: "Todo API",
      version: "1.0.0",
      description: [
        "A production-ready REST API for managing todos.",
        "",
        "## Features",
        "- Full CRUD on todos",
        "- Pagination (`skip` / `limit`) on list",
        "- Full-text search on title (LIKE)",
        "- Input validation via Zod (structured error arrays)",
        "- SQLite persistence via sql.js",
        "",
        "## Status values",
        "| Value | Meaning |",
        "|-------|---------|",
        "| `pending` | Not started yet (default) |",
        "| `in-progress` | Currently being worked on |",
        "| `done` | Completed |",
      ].join("\n"),
      contact: {
        name: "lootopia-les-3-dev",
        url: "https://github.com/lootopia-les-3-dev/todo-api-node",
      },
      license: { name: "MIT" },
    },

    // -------------------------------------------------------------------------
    // Servers — uses API_URL env var in production, localhost in dev
    // -------------------------------------------------------------------------
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000",
        description: process.env.API_URL ? /* istanbul ignore next */ "Production" : "Local development",
      },
    ],

    // -------------------------------------------------------------------------
    // Tags — used to group routes in the Swagger UI sidebar
    // -------------------------------------------------------------------------
    tags: [
      { name: "System", description: "Health check et informations de l'API" },
      { name: "Todos", description: "Opérations CRUD sur les todos" },
    ],

    // -------------------------------------------------------------------------
    // Reusable components shared across all routes
    // -------------------------------------------------------------------------
    components: {
      // --- Schemas -----------------------------------------------------------

      schemas: {
        /**
         * The canonical Todo object returned by all read/write endpoints.
         */
        Todo: {
          type: "object",
          description: "Un todo stocké en base de données",
          required: ["id", "title", "status"],
          properties: {
            id: {
              type: "integer",
              description: "Identifiant unique auto-incrémenté, généré par la BDD",
              example: 42,
              readOnly: true,
            },
            title: {
              type: "string",
              description: "Titre court de la tâche (1–200 caractères)",
              minLength: 1,
              maxLength: 200,
              example: "Buy groceries",
            },
            description: {
              type: "string",
              description: "Description longue optionnelle (max 1000 caractères). Peut être null.",
              maxLength: 1000,
              nullable: true,
              example: "Oat milk, sourdough bread, eggs",
            },
            status: {
              type: "string",
              description: "Statut actuel du cycle de vie du todo",
              enum: ["pending", "in-progress", "done"],
              default: "pending",
              example: "in-progress",
            },
          },
          example: {
            id: 42,
            title: "Buy groceries",
            description: "Oat milk, sourdough bread, eggs",
            status: "in-progress",
          },
        },

        /**
         * Payload accepted by POST /todos.
         * Only `title` is required — description defaults to null, status to "pending".
         */
        CreateTodoBody: {
          type: "object",
          description: "Payload pour créer un nouveau todo. Seul `title` est obligatoire.",
          required: ["title"],
          properties: {
            title: {
              type: "string",
              description: "Titre de la tâche (1–200 caractères)",
              minLength: 1,
              maxLength: 200,
              example: "Finish the project report",
            },
            description: {
              type: "string",
              description: "Détails optionnels sur la tâche (max 1000 caractères)",
              maxLength: 1000,
              nullable: true,
              example: "Include Q3 metrics and executive summary",
            },
            status: {
              type: "string",
              description: "Statut initial — `pending` si omis",
              enum: ["pending", "in-progress", "done"],
              default: "pending",
              example: "pending",
            },
          },
          example: {
            title: "Finish the project report",
            description: "Include Q3 metrics and executive summary",
            status: "pending",
          },
        },

        /**
         * Payload accepted by PUT /todos/:id.
         * All fields are optional — omitted fields keep their current value (patch semantics).
         */
        UpdateTodoBody: {
          type: "object",
          description: "Payload de mise à jour partielle. Seuls les champs fournis sont modifiés.",
          minProperties: 1,
          properties: {
            title: {
              type: "string",
              description: "Nouveau titre (1–200 caractères)",
              minLength: 1,
              maxLength: 200,
              example: "Buy organic groceries",
            },
            description: {
              type: "string",
              description: "Nouvelle description (max 1000 caractères). Passer `null` pour l'effacer.",
              maxLength: 1000,
              nullable: true,
              example: "From the farmers market only",
            },
            status: {
              type: "string",
              description: "Nouvelle valeur de statut",
              enum: ["pending", "in-progress", "done"],
              example: "done",
            },
          },
          example: { status: "done" },
        },

        /**
         * Structured validation error returned by Zod.
         * `detail` is an array of issue objects, each with a `path` and a `message`.
         */
        ValidationError: {
          type: "object",
          description: "Retourné quand le body ou les query params échouent la validation Zod.",
          properties: {
            detail: {
              description: "Tableau d'issues Zod — chaque issue a un `path` et un `message`",
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "array", items: { type: "string" }, example: ["title"] },
                      message: { type: "string", example: "String must contain at least 1 character(s)" },
                    },
                  },
                },
                { type: "string" },
              ],
              example: [
                { path: ["title"], message: "Required" },
                { path: ["status"], message: "Invalid enum value. Expected 'pending' | 'in-progress' | 'done'" },
              ],
            },
          },
        },

        /**
         * Generic error shape used for 404 and 500 responses.
         */
        Error: {
          type: "object",
          description: "Réponse d'erreur générique",
          properties: {
            detail: {
              type: "string",
              description: "Message d'erreur lisible par un humain",
              example: "Todo not found",
            },
          },
          example: { detail: "Todo not found" },
        },
      },

      // --- Reusable path parameters ------------------------------------------

      parameters: {
        /**
         * Numeric todo ID used in GET /todos/:id, PUT /todos/:id, DELETE /todos/:id.
         */
        TodoId: {
          in: "path",
          name: "id",
          required: true,
          description: "ID numérique du todo",
          schema: { type: "integer", minimum: 1, example: 42 },
        },
      },

      // --- Reusable headers --------------------------------------------------

      headers: {
        /**
         * Unique identifier attached to every response for log correlation.
         * Echoes the incoming X-Request-ID header if provided, otherwise a new UUID v4 is generated.
         */
        XRequestID: {
          description: "Identifiant unique de la requête pour la corrélation des logs. Reprend le header `X-Request-ID` entrant si fourni, sinon génère un UUID v4.",
          schema: {
            type: "string",
            format: "uuid",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
        },
      },

      // --- Reusable responses ------------------------------------------------

      responses: {
        /** Standard 404 when a todo ID does not exist. */
        NotFound: {
          description: "Todo introuvable",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { detail: "Todo not found" },
            },
          },
        },
        /** Standard 400 when Zod validation fails. */
        ValidationError: {
          description: "Échec de la validation de la requête",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" },
            },
          },
        },
      },
    },
  },

  // Files scanned by swagger-jsdoc to collect @swagger annotations
  apis: ["./app.js", "./routes/*.js"],
}

export default swaggerJsdoc(options)
