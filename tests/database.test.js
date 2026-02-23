// Tests for database.js persistence and error paths

const path = require("path");
const os = require("os");
const fs = require("fs");

describe("database module", () => {
  let tmpDb;

  afterEach(() => {
    jest.resetModules();
    if (tmpDb && fs.existsSync(tmpDb)) {
      fs.unlinkSync(tmpDb);
      tmpDb = null;
    }
    delete process.env.DB_PATH;
  });

  it("creates a new database when no file exists", async () => {
    process.env.DB_PATH = path.join(os.tmpdir(), `todo-new-${Date.now()}.db`);
    const { getDb } = require("../database/database");
    const db = await getDb();
    expect(db).toBeDefined();
    const rows = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='todos'");
    expect(rows[0].values[0][0]).toBe("todos");
  });

  it("loads database from an existing file on disk", async () => {
    tmpDb = path.join(os.tmpdir(), `todo-persist-${Date.now()}.db`);

    // Write a DB file
    process.env.DB_PATH = tmpDb;
    const { getDb: getDb1, saveDb: saveDb1 } = require("../database/database");
    const db1 = await getDb1();
    db1.run("INSERT INTO todos (title, description, status) VALUES (?, ?, ?)", [
      "persisted-todo", null, "pending",
    ]);
    await saveDb1();

    // Reload from disk in a fresh module
    jest.resetModules();
    process.env.DB_PATH = tmpDb;
    const { getDb: getDb2 } = require("../database/database");
    const db2 = await getDb2();
    const rows = db2.exec("SELECT * FROM todos WHERE title = 'persisted-todo'");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].values[0][1]).toBe("persisted-todo");
  });

  it("saveDb throws a descriptive error when write fails", async () => {
    process.env.DB_PATH = path.join(os.tmpdir(), `todo-err-${Date.now()}.db`);
    const fsp = require("fs/promises");
    jest.spyOn(fsp, "writeFile").mockRejectedValueOnce(new Error("disk full"));

    const { getDb, saveDb } = require("../database/database");
    await getDb();
    await expect(saveDb()).rejects.toThrow("Failed to save database: disk full");
  });
});
