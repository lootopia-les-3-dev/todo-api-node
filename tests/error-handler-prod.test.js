// Tests for the global error handler in production mode
// Must be in a separate file so jest.mock hoisting doesn't affect other tests

process.env.NODE_ENV = "production"
process.env.DB_PATH = ":memory-test:"

jest.mock("../database/database", () => ({
  getDb: () => { throw new Error("secret db error") },
  saveDb: jest.fn(),
}))

const request = require("supertest")
const app = require("../app")

describe("Global error handler (production mode)", () => {
  it("returns 500 with generic message in production", async () => {
    const res = await request(app).get("/todos")
    expect(res.status).toBe(500)
    expect(res.body.detail).toBe("Internal server error")
  })
})
