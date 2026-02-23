const initSqlJs = require("sql.js")
const fs = require("fs")
const fsp = require("fs/promises")
const path = require("path")

const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, "..", "todo.db"))

let db

const getDb = async function() {
  if (db) return db
  const SQL = await initSqlJs()
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = await fsp.readFile(DB_PATH)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }
  } catch (err) {
    throw new Error(`Failed to initialize database: ${err.message}`, { cause: err })
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending'
    )
  `)
  return db
}

const saveDb = async function() {
  if (!db) return
  try {
    const data = db.export()
    await fsp.writeFile(DB_PATH, Buffer.from(data))
  } catch (err) {
    throw new Error(`Failed to save database: ${err.message}`, { cause: err })
  }
}

module.exports = { getDb, saveDb }
