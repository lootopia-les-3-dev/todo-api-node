// Tests for database.js persistence and error paths

import { describe, it, expect, afterEach } from "@jest/globals"
import path from "path"
import os from "os"
import fs from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe("database module", () => {
  let tmpDb

  afterEach(() => {
    if (tmpDb && fs.existsSync(tmpDb)) {
      fs.unlinkSync(tmpDb)
      tmpDb = null
    }
    delete process.env.DB_PATH
  })

  it("creates a new database when no file exists", async () => {
    process.env.DB_PATH = path.join(os.tmpdir(), `todo-new-${Date.now()}.db`)
    const { getDb } = await import(`../database/database.js?t=${Date.now()}`)
    const db = await getDb()
    expect(db).toBeDefined()
    const rows = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='todos'")
    expect(rows[0].values[0][0]).toBe("todos")
  })

  it("loads database from an existing file on disk", async () => {
    tmpDb = path.join(os.tmpdir(), `todo-persist-${Date.now()}.db`)

    // Write a DB file
    process.env.DB_PATH = tmpDb
    const t1 = Date.now()
    const { getDb: getDb1, saveDb: saveDb1 } = await import(`../database/database.js?t=${t1}`)
    const db1 = await getDb1()
    db1.run("INSERT INTO todos (title, description, status) VALUES (?, ?, ?)", [
      "persisted-todo", null, "pending",
    ])
    await saveDb1()

    // Reload from disk in a fresh module (different cache-busting query string)
    process.env.DB_PATH = tmpDb
    const { getDb: getDb2 } = await import(`../database/database.js?t=${t1 + 1}`)
    const db2 = await getDb2()
    const rows = db2.exec("SELECT * FROM todos WHERE title = 'persisted-todo'")
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].values[0][1]).toBe("persisted-todo")
  })

  it("saveDb throws a descriptive error when write fails", async () => {
    // Use a path inside a non-existent directory to force a write error
    process.env.DB_PATH = path.join(os.tmpdir(), `nonexistent-${Date.now()}`, "todo.db")
    const { getDb, saveDb } = await import(`../database/database.js?t=${Date.now()}`)
    await getDb()
    await expect(saveDb()).rejects.toThrow("Failed to save database:")
  })

})
