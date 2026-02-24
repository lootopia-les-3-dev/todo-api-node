/** @type {import("swagger-ui-express").JsonObject} */
const swaggerSpec = {
  openapi: "3.0.0",

  // ---------------------------------------------------------------------------
  // API metadata
  // ---------------------------------------------------------------------------
  info: {
    title: "Todo API",
    version: "1.0.0",
    description: [
      "A production-ready REST API for managing todos.",
      "",
      "## Features",
      "- Full CRUD on todos",
      "- Pagination (`skip` / `limit`) on list",
      "- Full-text search on title",
      "- Input validation via Zod (returns structured error arrays)",
      "- SQLite persistence (sql.js)",
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
    license: {
      name: "MIT",
    },
  },

  // ---------------------------------------------------------------------------
  // Servers — uses API_URL env var in production, localhost in dev
  // ---------------------------------------------------------------------------
  servers: [
    {
      url: process.env.API_URL || "http://localhost:3000",
      description: process.env.API_URL ? "Production server" : "Local development server",
    },
  ],

  // ---------------------------------------------------------------------------
  // Reusable components
  // ---------------------------------------------------------------------------
  components: {
    schemas: {
      // The main Todo object returned by the API
      Todo: {
        type: "object",
        description: "A todo item stored in the database",
        required: ["id", "title", "status"],
        properties: {
          id: {
            type: "integer",
            description: "Auto-incremented unique identifier",
            example: 42,
            readOnly: true,
          },
          title: {
            type: "string",
            description: "Short title of the task (1–200 characters)",
            minLength: 1,
            maxLength: 200,
            example: "Buy groceries",
          },
          description: {
            type: "string",
            description: "Optional longer description of the task (max 1000 characters). Can be null.",
            maxLength: 1000,
            nullable: true,
            example: "Oat milk, sourdough bread, eggs",
          },
          status: {
            type: "string",
            description: "Current lifecycle status of the todo",
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

      // Payload to create a new todo
      CreateTodoBody: {
        type: "object",
        description: "Payload to create a new todo. Only `title` is required.",
        required: ["title"],
        properties: {
          title: {
            type: "string",
            description: "Title of the task (1–200 characters)",
            minLength: 1,
            maxLength: 200,
            example: "Finish the project report",
          },
          description: {
            type: "string",
            description: "Optional details about the task (max 1000 characters)",
            maxLength: 1000,
            nullable: true,
            example: "Include Q3 metrics and executive summary",
          },
          status: {
            type: "string",
            description: "Initial status — defaults to `pending` if omitted",
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

      // Payload to partially update an existing todo (all fields optional)
      UpdateTodoBody: {
        type: "object",
        description: "Partial update payload. Only provided fields are updated; omitted fields keep their current value.",
        minProperties: 1,
        properties: {
          title: {
            type: "string",
            description: "New title (1–200 characters)",
            minLength: 1,
            maxLength: 200,
            example: "Finish the project report — REVISED",
          },
          description: {
            type: "string",
            description: "New description (max 1000 characters). Pass `null` to clear it.",
            maxLength: 1000,
            nullable: true,
            example: "Add competitor analysis section",
          },
          status: {
            type: "string",
            description: "New status value",
            enum: ["pending", "in-progress", "done"],
            example: "done",
          },
        },
        example: {
          status: "done",
        },
      },

      // Standard validation error returned by Zod
      ValidationError: {
        type: "object",
        description: "Returned when request body or query params fail Zod validation. `detail` is an array of Zod issue objects.",
        properties: {
          detail: {
            description: "Array of Zod validation issues — each issue has a `path` and a `message`",
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

      // Simple 404 / generic error
      Error: {
        type: "object",
        description: "Generic error response",
        properties: {
          detail: {
            type: "string",
            description: "Human-readable error message",
            example: "Todo not found",
          },
        },
        example: {
          detail: "Todo not found",
        },
      },
    },

    // Reusable path parameter: numeric todo ID
    parameters: {
      TodoId: {
        in: "path",
        name: "id",
        required: true,
        description: "Numeric ID of the todo",
        schema: { type: "integer", minimum: 1, example: 42 },
      },
    },

    // Reusable response: 404 Not Found
    responses: {
      NotFound: {
        description: "Todo not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { detail: "Todo not found" },
          },
        },
      },
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Tags — used to group routes in Swagger UI
  // ---------------------------------------------------------------------------
  tags: [
    { name: "System", description: "Health check and API info" },
    { name: "Todos", description: "CRUD operations on todos" },
  ],

  // ---------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------
  paths: {

    // ── GET / ─────────────────────────────────────────────────────────────────
    "/": {
      get: {
        tags: ["System"],
        summary: "API root",
        description: "Returns a simple welcome message. Useful to verify the server is running.",
        operationId: "getRoot",
        responses: {
          200: {
            description: "Server is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description: "Static welcome string",
                      example: "Todo API",
                    },
                  },
                },
                example: { message: "Todo API" },
              },
            },
          },
        },
      },
    },

    // ── GET /health ───────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Returns the current health status and process uptime in seconds. Used by load balancers and monitoring tools.",
        operationId: "getHealth",
        responses: {
          200: {
            description: "Application is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      description: "Always `ok` when the server is running",
                      example: "ok",
                    },
                    uptime: {
                      type: "number",
                      description: "Process uptime in seconds since last restart",
                      example: 3723.8,
                    },
                  },
                },
                example: { status: "ok", uptime: 3723.8 },
              },
            },
          },
        },
      },
    },

    // ── GET /todos ────────────────────────────────────────────────────────────
    "/todos": {
      get: {
        tags: ["Todos"],
        summary: "List todos",
        description: [
          "Returns a paginated array of all todos ordered by insertion order.",
          "",
          "Use `skip` and `limit` to navigate through large datasets.",
          "- `skip=0&limit=10` → first page",
          "- `skip=10&limit=10` → second page",
          "- Maximum 100 items per request.",
        ].join("\n"),
        operationId: "listTodos",
        parameters: [
          {
            in: "query",
            name: "skip",
            description: "Number of records to skip (offset). Defaults to 0.",
            schema: { type: "integer", minimum: 0, default: 0, example: 0 },
          },
          {
            in: "query",
            name: "limit",
            description: "Maximum number of records to return. Min 1, max 100. Defaults to 10.",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10, example: 10 },
          },
        ],
        responses: {
          200: {
            description: "Paginated list of todos (empty array if none exist)",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Todo" },
                },
                examples: {
                  withItems: {
                    summary: "List with two todos",
                    value: [
                      { id: 1, title: "Buy groceries", description: "Oat milk, eggs", status: "pending" },
                      { id: 2, title: "Call the dentist", description: null, status: "done" },
                    ],
                  },
                  empty: {
                    summary: "Empty list",
                    value: [],
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },

      // ── POST /todos ──────────────────────────────────────────────────────────
      post: {
        tags: ["Todos"],
        summary: "Create a todo",
        description: [
          "Creates a new todo and returns the persisted object with its generated `id`.",
          "",
          "- `title` is the only required field.",
          "- `description` defaults to `null`.",
          "- `status` defaults to `pending`.",
        ].join("\n"),
        operationId: "createTodo",
        requestBody: {
          required: true,
          description: "Todo data. Only `title` is required.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTodoBody" },
              examples: {
                minimal: {
                  summary: "Title only (minimal)",
                  value: { title: "Read a book" },
                },
                full: {
                  summary: "All fields provided",
                  value: {
                    title: "Refactor authentication module",
                    description: "Extract JWT logic into a dedicated service",
                    status: "in-progress",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Todo successfully created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Todo" },
                examples: {
                  minimal: {
                    summary: "Created from minimal payload",
                    value: { id: 7, title: "Read a book", description: null, status: "pending" },
                  },
                  full: {
                    summary: "Created from full payload",
                    value: {
                      id: 8,
                      title: "Refactor authentication module",
                      description: "Extract JWT logic into a dedicated service",
                      status: "in-progress",
                    },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },

    // ── GET /todos/search ─────────────────────────────────────────────────────
    "/todos/search": {
      get: {
        tags: ["Todos"],
        summary: "Search todos by title",
        description: [
          "Performs a case-insensitive **LIKE** search on the `title` column.",
          "",
          "The query `q` is wrapped in `%` wildcards, so partial matches are returned.",
          "Example: `?q=gro` matches `Buy groceries`.",
          "",
          "Returns an empty array if no todos match — never a 404.",
        ].join("\n"),
        operationId: "searchTodos",
        parameters: [
          {
            in: "query",
            name: "q",
            required: true,
            description: "Search term matched against todo titles (1–200 characters, case-insensitive partial match)",
            schema: { type: "string", minLength: 1, maxLength: 200 },
            example: "grocery",
          },
        ],
        responses: {
          200: {
            description: "Todos whose title contains the search term (empty array if no match)",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Todo" },
                },
                examples: {
                  found: {
                    summary: "Matches found",
                    value: [
                      { id: 1, title: "Buy groceries", description: "Oat milk, eggs", status: "pending" },
                    ],
                  },
                  notFound: {
                    summary: "No matches",
                    value: [],
                  },
                },
              },
            },
          },
          400: {
            description: "Missing or invalid `q` parameter",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
                example: { detail: [{ path: ["q"], message: "Required" }] },
              },
            },
          },
        },
      },
    },

    // ── /todos/{id} ───────────────────────────────────────────────────────────
    "/todos/{id}": {
      // ── GET /todos/:id ───────────────────────────────────────────────────────
      get: {
        tags: ["Todos"],
        summary: "Get a todo by ID",
        description: "Returns a single todo by its numeric ID. Returns 404 if the ID does not exist.",
        operationId: "getTodoById",
        parameters: [{ $ref: "#/components/parameters/TodoId" }],
        responses: {
          200: {
            description: "The requested todo",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Todo" },
                example: { id: 42, title: "Buy groceries", description: "Oat milk, eggs", status: "pending" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },

      // ── PUT /todos/:id ───────────────────────────────────────────────────────
      put: {
        tags: ["Todos"],
        summary: "Update a todo",
        description: [
          "Partially updates an existing todo. Only provided fields are changed.",
          "",
          "- Omitted fields keep their current value (patch semantics).",
          "- Pass `\"description\": null` to explicitly clear the description.",
          "- Returns 404 if the ID does not exist.",
          "- Returns 400 if the payload is present but fails validation.",
        ].join("\n"),
        operationId: "updateTodo",
        parameters: [{ $ref: "#/components/parameters/TodoId" }],
        requestBody: {
          required: true,
          description: "Fields to update. At least one field should be provided.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTodoBody" },
              examples: {
                markDone: {
                  summary: "Mark as done",
                  value: { status: "done" },
                },
                changeTitle: {
                  summary: "Rename the todo",
                  value: { title: "Buy organic groceries" },
                },
                clearDescription: {
                  summary: "Clear the description",
                  value: { description: null },
                },
                fullUpdate: {
                  summary: "Update all fields",
                  value: {
                    title: "Buy organic groceries",
                    description: "From the farmers market only",
                    status: "in-progress",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "The updated todo",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Todo" },
                example: { id: 42, title: "Buy organic groceries", description: "From the farmers market only", status: "in-progress" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },

      // ── DELETE /todos/:id ────────────────────────────────────────────────────
      delete: {
        tags: ["Todos"],
        summary: "Delete a todo",
        description: "Permanently removes a todo by its ID. Returns 404 if the ID does not exist. This action is irreversible.",
        operationId: "deleteTodo",
        parameters: [{ $ref: "#/components/parameters/TodoId" }],
        responses: {
          200: {
            description: "Todo successfully deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    detail: {
                      type: "string",
                      description: "Confirmation message",
                      example: "Todo deleted",
                    },
                  },
                },
                example: { detail: "Todo deleted" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
}

module.exports = swaggerSpec
