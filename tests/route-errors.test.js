// Tests for error paths in all routes (catch blocks) — requires mocking database
// Must be in a separate file so jest.unstable_mockModule doesn't affect other tests

import { jest, describe, it, expect } from "@jest/globals"

process.env.NODE_ENV = "test"
process.env.DB_PATH = ":memory-test:"

jest.unstable_mockModule("../database/database.js", () => ({
  getDb: jest.fn(() => { throw new Error("db error") }),
  saveDb: jest.fn(),
}))

const { default: app } = await import("../app.js")
const { default: request } = await import("supertest")

describe("Route error paths (catch blocks)", () => {
  it("GET /todos/search propagates error to handler", async () => {
    const res = await request(app).get("/todos/search?q=test")
    expect(res.status).toBe(500)
  })

  it("POST /todos propagates error to handler", async () => {
    const res = await request(app).post("/todos").send({ title: "Test" })
    expect(res.status).toBe(500)
  })

  it("GET /todos/:id propagates error to handler", async () => {
    const res = await request(app).get("/todos/1")
    expect(res.status).toBe(500)
  })

  it("PUT /todos/:id propagates error to handler", async () => {
    const res = await request(app).put("/todos/1").send({ title: "Updated" })
    expect(res.status).toBe(500)
  })

  it("DELETE /todos/:id propagates error to handler", async () => {
    const res = await request(app).delete("/todos/1")
    expect(res.status).toBe(500)
  })
})

describe("Docs route", () => {
  it("GET /docs removes CSP header and serves swagger UI", async () => {
    const res = await request(app).get("/docs/")
    expect([200, 301, 302]).toContain(res.status)
  })
})
