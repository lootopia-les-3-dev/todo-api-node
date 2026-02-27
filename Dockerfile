FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@9 --prefer-offline 2>/dev/null || npm install -g pnpm@9
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --prefer-offline

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown appuser:appgroup /app
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup app.js swagger.js logger.js ./
COPY --chown=appuser:appgroup routes/ ./routes/
COPY --chown=appuser:appgroup database/ ./database/
USER appuser
EXPOSE 3000
CMD ["node", "app.js"]
