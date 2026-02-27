import pino from "pino"

const isDev = process.env.NODE_ENV === "development"

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(/* istanbul ignore next */ isDev && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
})

export default logger
