import { Router } from "express"
import { z } from "zod"
import { getDb, saveDb } from "../database/database.js"

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
 *
 *       **Exemples de recherche :**
 *       - `?q=buy` → trouve "Buy groceries", "Buy milk"
 *       - `?q=CALL` → trouve "Call the dentist" (insensible à la casse)
 *       - `?q=zzz` → `[]` si aucun match
 *     operationId: searchTodos
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Terme recherché dans les titres (1–200 caractères, insensible à la casse)
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
 *               plusieursResultats:
 *                 summary: Plusieurs résultats trouvés
 *                 value:
 *                   - id: 1
 *                     title: Buy groceries
 *                     description: "Oat milk, eggs"
 *                     status: pending
 *                   - id: 5
 *                     title: Buy milk
 *                     description: null
 *                     status: done
 *               unResultat:
 *                 summary: Un seul résultat
 *                 value:
 *                   - id: 3
 *                     title: Call the dentist
 *                     description: Tuesday at 10am
 *                     status: in-progress
 *               aucunResultat:
 *                 summary: Aucun résultat (terme introuvable)
 *                 value: []
 *       400:
 *         description: Paramètre `q` manquant ou trop court/long
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               manquant:
 *                 summary: Paramètre q absent
 *                 value:
 *                   detail:
 *                     - path: [q]
 *                       message: Required
 *               tropCourt:
 *                 summary: Paramètre q vide
 *                 value:
 *                   detail:
 *                     - path: [q]
 *                       message: String must contain at least 1 character(s)
 */
// Feature flag: FEATURE_TODO_SEARCH — enables the /todos/search endpoint.
// Set FEATURE_TODO_SEARCH=true to activate; any other value (or unset) disables it.
export const isSearchEnabled = () => process.env.FEATURE_TODO_SEARCH === "true"

// GET /todos/search — must be before /:id to avoid route collision
router.get("/search", async (req, res, next) => {
  if (!isSearchEnabled()) return res.status(404).json({ detail: "Not found" })
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
 *       Crée un nouveau todo et retourne l'objet persisté avec son `id` généré automatiquement.
 *
 *       - `title` est le seul champ **obligatoire** (1–200 caractères).
 *       - `description` vaut `null` par défaut (max 1000 caractères).
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
 *               summary: Titre uniquement (cas minimal)
 *               value:
 *                 title: Read a book
 *             avecDescription:
 *               summary: Titre + description
 *               value:
 *                 title: Prepare sprint review
 *                 description: Slides, demo environment, metrics from last sprint
 *             avecStatut:
 *               summary: Tâche déjà en cours
 *               value:
 *                 title: Refactor authentication module
 *                 description: Extract JWT logic into a dedicated service
 *                 status: in-progress
 *             dejaDone:
 *               summary: Tâche créée comme terminée
 *               value:
 *                 title: Write unit tests for database module
 *                 status: done
 *     responses:
 *       201:
 *         description: Todo créé avec succès — retourne l'objet complet avec son `id`
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
 *               avecDescription:
 *                 summary: Créé avec description
 *                 value:
 *                   id: 8
 *                   title: Prepare sprint review
 *                   description: Slides, demo environment, metrics from last sprint
 *                   status: pending
 *               enCours:
 *                 summary: Créé en statut in-progress
 *                 value:
 *                   id: 9
 *                   title: Refactor authentication module
 *                   description: Extract JWT logic into a dedicated service
 *                   status: in-progress
 *       400:
 *         description: Échec de validation — title manquant, trop long, ou status invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               titleManquant:
 *                 summary: title absent du body
 *                 value:
 *                   detail:
 *                     - path: [title]
 *                       message: title is required
 *               titleVide:
 *                 summary: title vide
 *                 value:
 *                   detail:
 *                     - path: [title]
 *                       message: String must contain at least 1 character(s)
 *               statutInvalide:
 *                 summary: status non reconnu
 *                 value:
 *                   detail:
 *                     - path: [status]
 *                       message: "Invalid enum value. Expected 'pending' | 'in-progress' | 'done', received 'todo'"
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
 *       **Pagination :**
 *       - `GET /todos` → page 1 (10 premiers)
 *       - `GET /todos?skip=0&limit=5` → 5 premiers
 *       - `GET /todos?skip=5&limit=5` → items 6 à 10
 *       - `GET /todos?skip=20&limit=100` → au plus 100 items à partir du 21ème
 *
 *       Retourne `[]` si la base est vide ou si `skip` dépasse le nombre total.
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
 *         description: Liste paginée des todos (tableau vide si aucun ou si offset dépasse le total)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *             examples:
 *               premierePage:
 *                 summary: Première page — todos variés
 *                 value:
 *                   - id: 1
 *                     title: Buy groceries
 *                     description: "Oat milk, eggs"
 *                     status: pending
 *                   - id: 2
 *                     title: Call the dentist
 *                     description: Tuesday at 10am
 *                     status: in-progress
 *                   - id: 3
 *                     title: Write unit tests
 *                     description: null
 *                     status: done
 *               pageVide:
 *                 summary: Offset dépasse le total — retourne []
 *                 value: []
 *               baseVide:
 *                 summary: Aucun todo en base
 *                 value: []
 *       400:
 *         description: Paramètres de pagination invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               limitTropEleve:
 *                 summary: limit supérieur à 100
 *                 value:
 *                   detail:
 *                     - path: [limit]
 *                       message: Number must be less than or equal to 100
 *               limitNegatif:
 *                 summary: limit inférieur à 1
 *                 value:
 *                   detail:
 *                     - path: [limit]
 *                       message: Number must be greater than or equal to 1
 *               skipNegatif:
 *                 summary: skip négatif
 *                 value:
 *                   detail:
 *                     - path: [skip]
 *                       message: Number must be greater than or equal to 0
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
 *     description: |
 *       Retourne un todo unique identifié par son `id` numérique.
 *
 *       Retourne **404** si aucun todo ne correspond à cet ID.
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
 *             examples:
 *               pending:
 *                 summary: Todo en attente avec description
 *                 value:
 *                   id: 1
 *                   title: Buy groceries
 *                   description: "Oat milk, eggs, sourdough"
 *                   status: pending
 *               inProgress:
 *                 summary: Todo en cours sans description
 *                 value:
 *                   id: 2
 *                   title: Call the dentist
 *                   description: null
 *                   status: in-progress
 *               done:
 *                 summary: Todo terminé
 *                 value:
 *                   id: 3
 *                   title: Write unit tests
 *                   description: Covers database and error handler modules
 *                   status: done
 *       404:
 *         description: Aucun todo trouvé avec cet ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               detail: Todo not found
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
 *       Mise à jour partielle d'un todo existant (**sémantique PATCH**).
 *
 *       - Les champs **omis** conservent leur valeur actuelle.
 *       - Passer `"description": null` pour **effacer** la description.
 *       - Retourne **404** si l'ID n'existe pas.
 *       - Retourne **400** si un champ fourni est invalide.
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
 *             mettreEnCours:
 *               summary: Démarrer une tâche
 *               value:
 *                 status: in-progress
 *             renommer:
 *               summary: Renommer le todo
 *               value:
 *                 title: Buy organic groceries
 *             effacerDescription:
 *               summary: Effacer la description (passer null)
 *               value:
 *                 description: null
 *             ajouterDescription:
 *               summary: Ajouter une description à un todo qui n'en avait pas
 *               value:
 *                 description: Pick up from the farmers market on Saturday
 *             miseAJourComplete:
 *               summary: Mettre à jour tous les champs en même temps
 *               value:
 *                 title: Buy organic groceries
 *                 description: From the farmers market only
 *                 status: in-progress
 *     responses:
 *       200:
 *         description: Le todo après mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *             examples:
 *               marqueCommeTermine:
 *                 summary: Todo passé à done
 *                 value:
 *                   id: 42
 *                   title: Buy groceries
 *                   description: "Oat milk, eggs"
 *                   status: done
 *               descriptionEffacee:
 *                 summary: Description effacée (null)
 *                 value:
 *                   id: 42
 *                   title: Buy groceries
 *                   description: null
 *                   status: pending
 *               miseAJourComplete:
 *                 summary: Tous les champs mis à jour
 *                 value:
 *                   id: 42
 *                   title: Buy organic groceries
 *                   description: From the farmers market only
 *                   status: in-progress
 *       400:
 *         description: Validation échouée sur un des champs fournis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               titreVide:
 *                 summary: title vide
 *                 value:
 *                   detail:
 *                     - path: [title]
 *                       message: String must contain at least 1 character(s)
 *               statutInvalide:
 *                 summary: Valeur de status inconnue
 *                 value:
 *                   detail:
 *                     - path: [status]
 *                       message: "Invalid enum value. Expected 'pending' | 'in-progress' | 'done', received 'completed'"
 *       404:
 *         description: Aucun todo trouvé avec cet ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               detail: Todo not found
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
 *       Supprime **définitivement** un todo par son ID.
 *
 *       ⚠️ **Cette action est irréversible** — il n'existe pas de corbeille.
 *
 *       Retourne **404** si l'ID n'existe pas (déjà supprimé ou jamais créé).
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
 *             examples:
 *               succes:
 *                 summary: Suppression réussie
 *                 value:
 *                   detail: Todo deleted
 *       404:
 *         description: Aucun todo trouvé avec cet ID (déjà supprimé ou inexistant)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               inexistant:
 *                 summary: ID jamais créé
 *                 value:
 *                   detail: Todo not found
 *               dejaSuppr:
 *                 summary: ID déjà supprimé
 *                 value:
 *                   detail: Todo not found
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

export default router
