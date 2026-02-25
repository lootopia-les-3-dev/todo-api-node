// Tests for the global error handler in production mode
// Must be in a separate file so jest.mock hoisting doesn't affect other tests

import { jest, describe, it, expect } from "@jest/globals"

process.env.NODE_ENV = "production"
process.env.DB_PATH = ":memory-test:"

jest.unstable_mockModule("../database/database.js", () => ({
  getDb: () => { throw new Error("secret db error") },
  saveDb: jest.fn(),
}))

const { default: app } = await import("../app.js")
const { default: request } = await import("supertest")

describe("Global error handler (production mode)", () => {
  it("returns 500 with generic message in production", async () => {
    const res = await request(app).get("/todos")
    expect(res.status).toBe(500)
    expect(res.body.detail).toBe("Internal server error")
  })
})
