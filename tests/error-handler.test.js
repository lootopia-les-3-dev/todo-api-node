// Tests for the global error handler — requires mocking database
// Must be in a separate file so jest.mock hoisting doesn't affect other tests

import { jest, describe, it, expect } from "@jest/globals"

process.env.NODE_ENV = "test"
process.env.DB_PATH = ":memory-test:"

jest.unstable_mockModule("../database/database.js", () => ({
  getDb: () => { throw new Error("DB exploded") },
  saveDb: jest.fn(),
}))

const { default: app } = await import("../app.js")
const { default: request } = await import("supertest")

describe("Global error handler (dev mode)", () => {
  it("returns 500 with error message when a route throws", async () => {
    const res = await request(app).get("/todos")
    expect(res.status).toBe(500)
    expect(res.body.detail).toBe("DB exploded")
  })
})
