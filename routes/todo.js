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

/**
 * @swagger
 * /todos/search:
 *   get:
 *     tags:
 *       - Todos
 *     summary: Rechercher des todos par titre
 *     description: |
 *       Effectue une recherche **insensible à la casse** sur le champ `title` avec une correspondance partielle (LIKE `%q%`).
 *
 *       Retourne un tableau vide si aucun résultat — jamais un 404.
 *     operationId: searchTodos
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Terme recherché dans les titres (1–200 caractères)
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           example: grocery
 *     responses:
 *       200:
 *         description: Liste des todos dont le titre contient le terme recherché
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *             examples:
 *               found:
 *                 summary: Résultats trouvés
 *                 value:
 *                   - id: 1
 *                     title: Buy groceries
 *                     description: "Oat milk, eggs"
 *                     status: pending
 *               empty:
 *                 summary: Aucun résultat
 *                 value: []
 *       400:
 *         description: Paramètre `q` manquant ou invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               detail:
 *                 - path: [q]
 *                   message: Required
 */
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

/**
 * @swagger
 * /todos:
 *   post:
 *     tags:
 *       - Todos
 *     summary: Créer un todo
 *     description: |
 *       Crée un nouveau todo et retourne l'objet persisté avec son `id` généré.
 *
 *       - `title` est le seul champ obligatoire.
 *       - `description` vaut `null` par défaut.
 *       - `status` vaut `pending` par défaut.
 *     operationId: createTodo
 *     requestBody:
 *       required: true
 *       description: Données du todo. Seul `title` est obligatoire.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTodoBody'
 *           examples:
 *             minimal:
 *               summary: Titre uniquement
 *               value:
 *                 title: Read a book
 *             complet:
 *               summary: Tous les champs
 *               value:
 *                 title: Refactor authentication module
 *                 description: Extract JWT logic into a dedicated service
 *                 status: in-progress
 *     responses:
 *       201:
 *         description: Todo créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *             examples:
 *               minimal:
 *                 summary: Créé depuis un payload minimal
 *                 value:
 *                   id: 7
 *                   title: Read a book
 *                   description: null
 *                   status: pending
 *               complet:
 *                 summary: Créé depuis un payload complet
 *                 value:
 *                   id: 8
 *                   title: Refactor authentication module
 *                   description: Extract JWT logic into a dedicated service
 *                   status: in-progress
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /todos:
 *   get:
 *     tags:
 *       - Todos
 *     summary: Lister les todos
 *     description: |
 *       Retourne un tableau paginé de tous les todos, triés par ordre d'insertion.
 *
 *       Utilisez `skip` et `limit` pour naviguer dans les données :
 *       - `skip=0&limit=10` → première page
 *       - `skip=10&limit=10` → deuxième page
 *       - Maximum **100** éléments par requête.
 *     operationId: listTodos
 *     parameters:
 *       - in: query
 *         name: skip
 *         description: Nombre d'éléments à ignorer (offset). Défaut 0.
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *       - in: query
 *         name: limit
 *         description: Nombre maximum d'éléments à retourner (1–100). Défaut 10.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           example: 10
 *     responses:
 *       200:
 *         description: Liste paginée des todos (tableau vide si aucun)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *             examples:
 *               avecItems:
 *                 summary: Liste avec deux todos
 *                 value:
 *                   - id: 1
 *                     title: Buy groceries
 *                     description: "Oat milk, eggs"
 *                     status: pending
 *                   - id: 2
 *                     title: Call the dentist
 *                     description: null
 *                     status: done
 *               vide:
 *                 summary: Liste vide
 *                 value: []
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     tags:
 *       - Todos
 *     summary: Récupérer un todo par ID
 *     description: Retourne un todo unique par son ID numérique. Retourne 404 si l'ID n'existe pas.
 *     operationId: getTodoById
 *     parameters:
 *       - $ref: '#/components/parameters/TodoId'
 *     responses:
 *       200:
 *         description: Le todo demandé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *             example:
 *               id: 42
 *               title: Buy groceries
 *               description: "Oat milk, eggs"
 *               status: pending
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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

/**
 * @swagger
 * /todos/{id}:
 *   put:
 *     tags:
 *       - Todos
 *     summary: Mettre à jour un todo
 *     description: |
 *       Mise à jour partielle d'un todo existant. Seuls les champs fournis sont modifiés.
 *
 *       - Les champs omis conservent leur valeur actuelle (sémantique PATCH).
 *       - Passer `"description": null` pour effacer la description.
 *       - Retourne 404 si l'ID n'existe pas.
 *     operationId: updateTodo
 *     parameters:
 *       - $ref: '#/components/parameters/TodoId'
 *     requestBody:
 *       required: true
 *       description: Champs à mettre à jour. Au moins un champ doit être fourni.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTodoBody'
 *           examples:
 *             marquerFait:
 *               summary: Marquer comme terminé
 *               value:
 *                 status: done
 *             renommer:
 *               summary: Renommer le todo
 *               value:
 *                 title: Buy organic groceries
 *             effacerDescription:
 *               summary: Effacer la description
 *               value:
 *                 description: null
 *             miseAJourComplete:
 *               summary: Mettre à jour tous les champs
 *               value:
 *                 title: Buy organic groceries
 *                 description: From the farmers market only
 *                 status: in-progress
 *     responses:
 *       200:
 *         description: Le todo mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *             example:
 *               id: 42
 *               title: Buy organic groceries
 *               description: From the farmers market only
 *               status: in-progress
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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

/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     tags:
 *       - Todos
 *     summary: Supprimer un todo
 *     description: |
 *       Supprime définitivement un todo par son ID.
 *
 *       **Cette action est irréversible.**
 *
 *       Retourne 404 si l'ID n'existe pas.
 *     operationId: deleteTodo
 *     parameters:
 *       - $ref: '#/components/parameters/TodoId'
 *     responses:
 *       200:
 *         description: Todo supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 detail:
 *                   type: string
 *                   description: Message de confirmation
 *                   example: Todo deleted
 *             example:
 *               detail: Todo deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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
