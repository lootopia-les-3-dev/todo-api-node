import { describe, it, expect } from "@jest/globals"
import request from "supertest"
import app from "../app.js"

process.env.NODE_ENV = "test"
process.env.DB_PATH = ":memory-test:"

describe("GET /telemetry", () => {
  it("returns 200 with prometheus metrics", async () => {
    const res = await request(app).get("/telemetry")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text\/plain/)
    expect(res.text).toContain("http_requests_total")
    expect(res.text).toContain("http_request_duration_seconds")
  })
})

describe("Metrics middleware", () => {
  it("counts requests to known routes (req.route?.path branch)", async () => {
    await request(app).get("/health")
    const res = await request(app).get("/telemetry")
    expect(res.text).toContain('route="/health"')
  })

  it("uses req.path as fallback for unknown routes (?? branch)", async () => {
    await request(app).get("/unknown-route-xyz")
    const res = await request(app).get("/telemetry")
    expect(res.text).toContain('route="/unknown-route-xyz"')
  })

  it("skips /telemetry from metrics collection (early return branch)", async () => {
    await request(app).get("/telemetry")
    const res = await request(app).get("/telemetry")
    expect(res.text).not.toContain('route="/telemetry"')
  })
})
