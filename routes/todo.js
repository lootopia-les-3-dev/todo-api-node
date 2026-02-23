const { Router } = require("express")
const { z } = require("zod")
const { getDb, saveDb } = require("../database/database")

const router = Router()

// --- Validation schemas ---

const VALID_STATUSES = ["pending", "in-progress", "done"]

const createSchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  description: z.string().max(1000).nullable().optional().default(null),
  status: z.enum(VALID_STATUSES).optional().default("pending"),
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(VALID_STATUSES).optional(),
})

const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
})

const searchSchema = z.object({
  q: z.string().min(1).max(200),
})

// --- Helpers ---

const toObj = function(rows) {
  const cols = rows[0].columns
  const vals = rows[0].values[0]
  const obj = {}
  cols.forEach((c, i) => (obj[c] = vals[i]))
  return obj
}

const toArray = function(rows) {
  if (!rows.length) return []
  const cols = rows[0].columns
  return rows[0].values.map((vals) => {
    const obj = {}
    cols.forEach((c, i) => (obj[c] = vals[i]))
    return obj
  })
}

// --- Routes ---

// GET /todos/search — must be before /:id to avoid route collision
router.get("/search", async (req, res, next) => {
  try {
    const parsed = searchSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ detail: parsed.error.issues })
    }
    const { q } = parsed.data
    const db = await getDb()
    const results = db.exec("SELECT * FROM todos WHERE title LIKE ?", [`%${q}%`])
    res.json(toArray(results))
  } catch (err) {
    next(err)
  }
})

// POST /todos
router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ detail: parsed.error.issues })
    }
    const { title, description, status } = parsed.data
    const db = await getDb()
    db.run("INSERT INTO todos (title, description, status) VALUES (?, ?, ?)", [title, description, status])
    const idRows = db.exec("SELECT last_insert_rowid() as id")
    const id = idRows[0].values[0][0]
    const rows = db.exec("SELECT * FROM todos WHERE id = ?", [id])
    await saveDb()
    res.status(201).json(toObj(rows))
  } catch (err) {
    next(err)
  }
})

// GET /todos
router.get("/", async (req, res, next) => {
  try {
    const parsed = paginationSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ detail: parsed.error.issues })
    }
    const { skip, limit } = parsed.data
    const db = await getDb()
    const rows = db.exec("SELECT * FROM todos LIMIT ? OFFSET ?", [limit, skip])
    res.json(toArray(rows))
  } catch (err) {
    next(err)
  }
})

// GET /todos/:id
router.get("/:id", async (req, res, next) => {
  try {
    const db = await getDb()
    const rows = db.exec("SELECT * FROM todos WHERE id = ?", [req.params.id])
    if (!rows.length || !rows[0].values.length) {
      return res.status(404).json({ detail: "Todo not found" })
    }
    res.json(toObj(rows))
  } catch (err) {
    next(err)
  }
})

// PUT /todos/:id
router.put("/:id", async (req, res, next) => {
  try {
    const db = await getDb()
    const existing = db.exec("SELECT * FROM todos WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ detail: "Todo not found" })
    }
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ detail: parsed.error.issues })
    }
    const old = toObj(existing)
    const title = parsed.data.title ?? old.title
    const description = parsed.data.description ?? old.description
    const status = parsed.data.status ?? old.status
    db.run("UPDATE todos SET title = ?, description = ?, status = ? WHERE id = ?", [title, description, status, req.params.id])
    const rows = db.exec("SELECT * FROM todos WHERE id = ?", [req.params.id])
    await saveDb()
    res.json(toObj(rows))
  } catch (err) {
    next(err)
  }
})

// DELETE /todos/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const db = await getDb()
    const existing = db.exec("SELECT * FROM todos WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ detail: "Todo not found" })
    }
    db.run("DELETE FROM todos WHERE id = ?", [req.params.id])
    await saveDb()
    res.json({ detail: "Todo deleted" })
  } catch (err) {
    next(err)
  }
})

module.exports = router
