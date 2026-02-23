require("dotenv").config()

const express = require("express")
const helmet = require("helmet")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
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

app.get("/", (_req, res) => {
  res.json({ message: "Todo API" })
})

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

app.use("/todos", todoRouter)

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
