/** @type {import("swagger-ui-express").JsonObject} */
const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Todo API",
    version: "1.0.0",
    description: "A simple CRUD API for managing todos",
  },
  servers: [{ url: process.env.API_URL || "http://localhost:3000" }],
  components: {
    schemas: {
      Todo: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          title: { type: "string", example: "Buy milk" },
          description: { type: "string", nullable: true, example: "Oat milk" },
          status: {
            type: "string",
            enum: ["pending", "in-progress", "done"],
            example: "pending",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          detail: { type: "string", example: "Todo not found" },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        summary: "API root",
        responses: {
          200: {
            description: "Welcome message",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "Todo API" } },
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          200: {
            description: "App is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    uptime: { type: "number", example: 42.3 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/todos": {
      get: {
        summary: "List todos",
        parameters: [
          { in: "query", name: "skip", schema: { type: "integer", default: 0 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 10, maximum: 100 } },
        ],
        responses: {
          200: {
            description: "Array of todos",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Todo" } },
              },
            },
          },
          400: { description: "Invalid pagination params", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        summary: "Create a todo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", minLength: 1, maxLength: 200, example: "Buy milk" },
                  description: { type: "string", maxLength: 1000, nullable: true, example: "Oat milk" },
                  status: { type: "string", enum: ["pending", "in-progress", "done"], default: "pending" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created todo",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Todo" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/todos/search": {
      get: {
        summary: "Search todos by title",
        parameters: [
          { in: "query", name: "q", required: true, schema: { type: "string", minLength: 1, maxLength: 200 }, example: "milk" },
        ],
        responses: {
          200: {
            description: "Matching todos",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Todo" } } } },
          },
          400: { description: "Missing or invalid q param", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/todos/{id}": {
      get: {
        summary: "Get a todo by id",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "The todo", content: { "application/json": { schema: { $ref: "#/components/schemas/Todo" } } } },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        summary: "Update a todo",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", minLength: 1, maxLength: 200 },
                  description: { type: "string", maxLength: 1000, nullable: true },
                  status: { type: "string", enum: ["pending", "in-progress", "done"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated todo", content: { "application/json": { schema: { $ref: "#/components/schemas/Todo" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        summary: "Delete a todo",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: {
          200: {
            description: "Deleted",
            content: {
              "application/json": {
                schema: { type: "object", properties: { detail: { type: "string", example: "Todo deleted" } } },
              },
            },
          },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
}

module.exports = swaggerSpec
