require("dotenv").config()

const express = require("express")
const helmet = require("helmet")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./swagger")
const todoRouter = require("./routes/todo")

const app = express()

app.use(helmet())

app.use((req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use(morgan("combined"))
app.use(express.json())

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - System
 *     summary: Racine de l'API
 *     description: Retourne un message de bienvenue. Permet de vérifier rapidement que le serveur répond.
 *     operationId: getRoot
 *     responses:
 *       200:
 *         description: Serveur opérationnel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message de bienvenue statique
 *                   example: Todo API
 *             example:
 *               message: Todo API
 */
app.get("/", (_req, res) => {
  res.json({ message: "Todo API" })
})

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check
 *     description: |
 *       Retourne le statut de santé de l'application et l'uptime du processus en secondes.
 *       Utilisé par les load balancers et les outils de monitoring.
 *     operationId: getHealth
 *     responses:
 *       200:
 *         description: Application en bonne santé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Toujours `ok` quand le serveur tourne
 *                   example: ok
 *                 uptime:
 *                   type: number
 *                   description: Uptime du processus en secondes depuis le dernier redémarrage
 *                   example: 3723.8
 *             example:
 *               status: ok
 *               uptime: 3723.8
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

app.use("/todos", todoRouter)

// Swagger UI — disable helmet's CSP on this route only so the UI loads
app.use(
  "/docs",
  (_req, res, next) => {
    res.removeHeader("Content-Security-Policy")
    next()
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
)

app.use((_req, res) => {
  res.status(404).json({ detail: "Not found" })
})

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err)
  const status = err.status || err.statusCode || 500
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  res.status(status).json({ detail: message })
})

const PORT = parseInt(process.env.PORT) || 3000

if (require.main === module) {
  // eslint-disable-next-line no-console
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

module.exports = app
