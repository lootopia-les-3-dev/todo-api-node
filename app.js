import "dotenv/config"

import * as Sentry from "@sentry/node"
import { randomUUID } from "crypto"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import rateLimit from "express-rate-limit"
import swaggerUi from "swagger-ui-express"
import swaggerSpec from "./swagger.js"
import todoRouter from "./routes/todo.js"
import { register, httpRequestCounter, httpRequestDuration } from "./routes/telemetry.js"
import * as Sentry from "@sentry/node"

Sentry.init({ dsn: process.env.SENTRY_DSN })

const app = express()

app.use(helmet())

// Attach a unique request ID to every request for log correlation
app.use((req, res, next) => {
  const id = req.headers["x-request-id"] || randomUUID()
  req.id = id
  res.setHeader("X-Request-ID", id)
  next()
})

app.use((req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN || /* istanbul ignore next */ "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || /* istanbul ignore next */ 60_000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || /* istanbul ignore next */ 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use(pinoHttp({
  logger,
  // Attach request ID from the middleware above
  genReqId: /* istanbul ignore next */ (req) => req.id,
  // Skip /telemetry scrapes to avoid log noise
  autoLogging: { ignore: (req) => req.url === "/telemetry" },
}))
app.use(express.json())

// Metrics middleware — /telemetry excluded to avoid counting Prometheus scrapes
app.use((req, res, next) => {
  if (req.path === "/telemetry") return next()
  const end = httpRequestDuration.startTimer()
  res.on("finish", () => {
    const route = req.route?.path ?? req.path
    const labels = { method: req.method, route, status: res.statusCode }
    httpRequestCounter.inc(labels)
    end(labels)
  })
  next()
})

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

/**
 * @swagger
 * /telemetry:
 *   get:
 *     tags:
 *       - System
 *     summary: Métriques Prometheus
 *     description: |
 *       Expose les métriques applicatives au format Prometheus (text/plain).
 *       Scrappé par Prometheus et visualisé dans Grafana.
 *       Inclut les métriques système (CPU, mémoire, event loop) et les compteurs HTTP.
 *     operationId: getTelemetry
 *     responses:
 *       200:
 *         description: Métriques au format Prometheus
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 # HELP http_requests_total Total number of HTTP requests
 *                 # TYPE http_requests_total counter
 *                 http_requests_total{method="GET",route="/health",status="200"} 42
 */
app.get("/telemetry", async (_req, res) => {
  res.set("Content-Type", register.contentType)
  res.send(await register.metrics())
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

Sentry.setupExpressErrorHandler(app)

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err)
  const status = err.status || err.statusCode || 500
  const log = req.log ?? /* istanbul ignore next */ logger
  log.error({ err, status }, "Unhandled error")
  /* istanbul ignore next */
  if (status >= 500 && process.env.SENTRY_DSN) Sentry.captureException(err)
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  res.status(status).json({ detail: message })
})

const PORT = parseInt(process.env.PORT) || /* istanbul ignore next */ 3000

// Start the server only when this file is the entry point (not during tests)
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
/* istanbul ignore next */
if (isMain) {
  app.listen(PORT, () => logger.info({ port: PORT }, "Server running"))
}

export default app
