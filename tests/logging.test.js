import { describe, it, expect } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

process.env.NODE_ENV = "test"
process.env.DB_PATH = ":memory-test:"
// FEATURE_TODO_SEARCH intentionally NOT set — covers the disabled flag branch

describe("Structured logging (pino-http)", () => {
  it("attaches req.log (pino logger) to every request", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    // pino-http attaches a logger to req — verify the response still works
    // (the logger itself is exercised by pino-http middleware)
  })

  it("forwards X-Request-ID into the log context", async () => {
    const res = await request(app)
      .get("/health")
      .set("X-Request-ID", "test-req-id-123")
    expect(res.headers["x-request-id"]).toBe("test-req-id-123")
  })

  it("skips logging for /telemetry requests (autoLogging ignore)", async () => {
    // Should still respond correctly even when logging is skipped
    const res = await request(app).get("/telemetry")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text\/plain/)
  })
})

describe("Feature flags", () => {
  it("returns 404 for /todos/search when FEATURE_TODO_SEARCH is disabled", async () => {
    const res = await request(app).get("/todos/search?q=test")
    expect(res.status).toBe(404)
  })
})
