import { describe, it, expect } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

process.env.NODE_ENV = "test"
process.env.DB_PATH = ":memory-test:"

describe("Todo API", () => {
  describe("GET /health", () => {
    it("returns 200 with status ok", async () => {
      const res = await request(app).get("/health")
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("ok")
    })
  })

  describe("GET /", () => {
    it("returns welcome message", async () => {
      const res = await request(app).get("/")
      expect(res.status).toBe(200)
      expect(res.body.message).toBeDefined()
    })
  })

  describe("CORS", () => {
    it("handles OPTIONS preflight", async () => {
      const res = await request(app).options("/todos")
      expect(res.status).toBe(204)
    })

    it("sets CORS headers", async () => {
      const res = await request(app).get("/")
      expect(res.headers["access-control-allow-origin"]).toBeDefined()
    })
  })

  describe("X-Request-ID middleware", () => {
    it("generates a request ID when none provided", async () => {
      const res = await request(app).get("/")
      expect(res.headers["x-request-id"]).toBeDefined()
    })

    it("uses the provided X-Request-ID header", async () => {
      const res = await request(app).get("/").set("x-request-id", "my-custom-id")
      expect(res.headers["x-request-id"]).toBe("my-custom-id")
    })
  })

  describe("GET /docs", () => {
    it("serves swagger UI and removes CSP header", async () => {
      const res = await request(app).get("/docs/")
      expect([200, 301, 302]).toContain(res.status)
      expect(res.headers["content-security-policy"]).toBeUndefined()
    })
  })

  describe("POST /todos", () => {
    it("creates a todo with valid input", async () => {
      const res = await request(app)
        .post("/todos")
        .send({ title: "Buy groceries" })
      expect(res.status).toBe(201)
      expect(res.body.title).toBe("Buy groceries")
      expect(res.body.status).toBe("pending")
    })

    it("creates a todo with all fields", async () => {
      const res = await request(app)
        .post("/todos")
        .send({ title: "Task", description: "Details", status: "in-progress" })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe("in-progress")
      expect(res.body.description).toBe("Details")
    })

    it("returns 400 when title is missing", async () => {
      const res = await request(app).post("/todos").send({})
      expect(res.status).toBe(400)
    })

    it("returns 400 when title is empty string", async () => {
      const res = await request(app).post("/todos").send({ title: "" })
      expect(res.status).toBe(400)
    })

    it("returns 400 when status is invalid", async () => {
      const res = await request(app)
        .post("/todos")
        .send({ title: "Test", status: "invalid" })
      expect(res.status).toBe(400)
    })

    it("returns 400 when title exceeds 200 chars", async () => {
      const res = await request(app)
        .post("/todos")
        .send({ title: "x".repeat(201) })
      expect(res.status).toBe(400)
    })
  })

  describe("GET /todos", () => {
    it("returns an array", async () => {
      const res = await request(app).get("/todos")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it("returns 400 when limit exceeds 100", async () => {
      const res = await request(app).get("/todos?limit=101")
      expect(res.status).toBe(400)
    })

    it("respects skip and limit pagination", async () => {
      const res = await request(app).get("/todos?skip=0&limit=5")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe("GET /todos/search", () => {
    it("returns matching todos", async () => {
      await request(app).post("/todos").send({ title: "searchable item" })
      const res = await request(app).get("/todos/search?q=searchable")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it("returns empty array when no match", async () => {
      const res = await request(app).get("/todos/search?q=zzznomatch999")
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it("returns 400 when q is missing", async () => {
      const res = await request(app).get("/todos/search")
      expect(res.status).toBe(400)
    })
  })

  describe("GET /todos/:id", () => {
    it("returns a todo by id", async () => {
      const create = await request(app).post("/todos").send({ title: "Fetch me" })
      const { id } = create.body
      const res = await request(app).get(`/todos/${id}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(id)
      expect(res.body.title).toBe("Fetch me")
    })

    it("returns 404 for nonexistent id", async () => {
      const res = await request(app).get("/todos/999999")
      expect(res.status).toBe(404)
    })
  })

  describe("PUT /todos/:id", () => {
    it("updates a todo successfully", async () => {
      const create = await request(app).post("/todos").send({ title: "Original" })
      const { id } = create.body
      const res = await request(app)
        .put(`/todos/${id}`)
        .send({ title: "Updated", status: "done" })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe("Updated")
      expect(res.body.status).toBe("done")
    })

    it("keeps existing fields when doing partial update", async () => {
      const create = await request(app)
        .post("/todos")
        .send({ title: "Keep me", description: "my desc", status: "pending" })
      const { id } = create.body
      const res = await request(app).put(`/todos/${id}`).send({ status: "done" })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe("Keep me")
      expect(res.body.description).toBe("my desc")
      expect(res.body.status).toBe("done")
    })

    it("keeps existing status when only title is updated", async () => {
      const create = await request(app)
        .post("/todos")
        .send({ title: "Original", status: "in-progress" })
      const { id } = create.body
      const res = await request(app).put(`/todos/${id}`).send({ title: "New title" })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe("New title")
      expect(res.body.status).toBe("in-progress")
    })

    it("returns 404 for nonexistent id", async () => {
      const res = await request(app)
        .put("/todos/999999")
        .send({ title: "Updated" })
      expect(res.status).toBe(404)
    })

    it("returns 400 for invalid status", async () => {
      const create = await request(app).post("/todos").send({ title: "Original" })
      const { id } = create.body
      const res = await request(app)
        .put(`/todos/${id}`)
        .send({ status: "wrong" })
      expect(res.status).toBe(400)
    })
  })

  describe("DELETE /todos/:id", () => {
    it("deletes a todo successfully", async () => {
      const create = await request(app).post("/todos").send({ title: "Delete me" })
      const { id } = create.body
      const del = await request(app).delete(`/todos/${id}`)
      expect(del.status).toBe(200)
      expect(del.body.detail).toBe("Todo deleted")
      const get = await request(app).get(`/todos/${id}`)
      expect(get.status).toBe(404)
    })

    it("returns 404 for nonexistent id", async () => {
      const res = await request(app).delete("/todos/999999")
      expect(res.status).toBe(404)
    })
  })

  describe("Unknown routes", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(app).get("/unknown")
      expect(res.status).toBe(404)
    })
  })

})
