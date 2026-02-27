# Guide de présentation — CI/CD Todo API

## Vue d'ensemble à pitcher en 30 secondes

> "On a une API REST Node.js avec une pipeline CI/CD complète sur GitHub Actions,
> déployée automatiquement en staging et production via Dokploy/Render,
> avec tests multi-version, observabilité Prometheus+Pino, sécurité Trivy,
> tests de charge k6, et rollback automatique."

---

## 1. Architecture globale

Schéma de la pipline:
```
push develop/main
       │
       ├── lint          (ESLint)
       ├── test ×3       (Node 18 / 20 / 22 + coverage 100%)
       ├── contract      (OpenAPI spec validation)
       ├── observability (Prometheus metrics + JSON logging)
       ├── security      (Trivy CRITICAL/HIGH)
       ├── perf          (k6 load test, continue-on-error)
       │
       └── docker-build → docker-push (GHCR)
                          │
                          ├── develop → deploy-staging  (canary)  → rollback-staging si échec
                          └── main    → deploy-prod     (blue-green) → rollback-prod si échec
```

**Points à souligner :**
- `fail-fast: false` sur la matrix de test → les 3 versions tournent même si une échoue
- `continue-on-error: true` sur perf → un test de charge qui rate ne bloque pas le déploiement
- `needs:` sur docker-push → tous les jobs critiques doivent passer avant de pusher

---

## 2. Tests — couverture 100%

**Montrer** : `package.json` → `coverageThreshold` et les fichiers de test

```json
"coverageThreshold": {
  "global": { "statements": 100, "branches": 100, "functions": 100, "lines": 100 }
}
```

**Fichiers de test :**
- `tests/todo.test.js` — CRUD complet
- `tests/logging.test.js` — pino-http + feature flag désactivé
- `tests/route-errors.test.js` — propagation d'erreurs
- `tests/error-handler.test.js` / `error-handler-prod.test.js` — handler dev vs prod


---

## 3. Feature flag — FEATURE_TODO_SEARCH

**Montrer** : `routes/todo.js:134` et `tests/logging.test.js`

```js
// routes/todo.js
export const isSearchEnabled = () => process.env.FEATURE_TODO_SEARCH === "true"

router.get("/search", async (req, res, next) => {
  if (!isSearchEnabled()) return res.status(404).json({ detail: "Not found" })
  // ...
})
```

**Le flag est réel** : pas un commentaire, pas du semblant.
- `FEATURE_TODO_SEARCH` non défini → 404 (testé dans `logging.test.js`)
- `FEATURE_TODO_SEARCH=true` → endpoint actif (testé dans `todo.test.js`)

---

## 4. Observabilité

### 4a. Métriques Prometheus

**Montrer** : `GET https://todo.lootopia.io/telemetry`

```bash
curl https://todo.lootopia.io/telemetry
```

Métriques exposées :
- `http_requests_total` — compteur par méthode/route/status
- `http_request_duration_seconds` — histogramme de latence
- `nodejs_*` / `process_cpu_seconds_total` — métriques système Node.js

**Dans la CI** : le job `observability` démarre le serveur et vérifie ces métriques avec grep.

### 4b. Logging structuré (pino)

**Montrer** : `logger.js` + `app.js:51`

Chaque requête HTTP génère une ligne JSON :
```json
{"level":30,"time":1234,"req":{"method":"GET","url":"/health"},"res":{"statusCode":200},"responseTime":2}
```

- `X-Request-ID` propagé dans chaque log pour la corrélation
- `/telemetry` exclu du logging (pas de bruit dans les scrapes Prometheus)

### 4c. Sentry

**Montrer** : `package.json` → `@sentry/node` + `app.js:17`

```js
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV })
}
```

Capture automatique des erreurs 5xx en production.

---

## 5. Sécurité

**Montrer** : job `security` dans `ci.yml`

- **Trivy** : scan du filesystem à chaque push, bloque sur CRITICAL/HIGH
- **Helmet** : headers HTTP de sécurité (CSP, HSTS, X-Frame-Options…)
- **Rate limiting** : 100 req/min par IP (configurable via env)
- **CORS** : origine configurable via `ALLOWED_ORIGIN`

---

## 6. Tests de charge (k6)

**Montrer** : job `perf` + `tests/load.js`

```bash
k6 run tests/load.js
```

- Tournent contre un serveur local démarré dans le job
- `continue-on-error: true` → informatif, pas bloquant
- Résultats visibles dans les logs GitHub Actions

---

## 7. Déploiement — reusable-deploy.yml

**Montrer** : `.github/workflows/reusable-deploy.yml`

**Stratégies :**
- `develop` → staging avec stratégie **canary**
- `main` → production avec stratégie **blue-green**

**Étapes du déploiement :**
1. Tag de l'image actuelle en `:previous` (point de rollback)
2. Trigger du deploy hook (Dokploy/Render)
3. Attente active : poll `/health` toutes les 5s pendant 1 minute max
4. Smoke test : vérification que `/` répond 200
5. Ping UptimeRobot heartbeat si succès

**Rollback automatique** si le déploiement échoue :
- Retag de `:previous` → `:latest` ou `:staging`
- Re-trigger du deploy hook
- Notification Discord

---

## 8. Notifications Discord

**Montrer** : job `notify` en bas du `ci.yml`

À chaque push sur `main`/`develop` : embed Discord avec :
- Résultat de chaque job (lint / test / security / contract / observability / push)
- Lien direct vers le run GitHub Actions
- Couleur verte (succès) ou rouge (échec)

---

## 9. Release automatique

**Montrer** : job `release-please`

Sur `main` : `release-please-action` génère automatiquement un PR de release avec :
- Bump de version dans `package.json`
- Mise à jour du `CHANGELOG.md`
- Tag git

---

## Questions probables et réponses

**"Pourquoi pnpm et pas npm ?"**
→ Store de packages partagé entre jobs via `/tmp/runner-cache/pnpm-store` — installs rapides même sans cache node_modules.

**"Pourquoi Node 18, 20 et 22 ?"**
→ 18 = LTS maintenance, 20 = LTS actif, 22 = current. On garantit la compatibilité sur les versions supportées.

**"Qu'est-ce qui se passe si un test rate en prod ?"**
→ `docker-push` ne tourne pas (`needs:`), donc aucun déploiement. Si le smoke test post-deploy échoue, le rollback-production se déclenche automatiquement.

**"Le coverage 100% c'est pas de la triche ?"**
→ Non. Les branches ignorées sont uniquement des branches de runtime impossible à tester (Sentry DSN en prod, pino-pretty en dev, server.listen). Tout le code métier est couvert.

**"C'est quoi le feature flag ?"**
→ `FEATURE_TODO_SEARCH` active/désactive l'endpoint `/todos/search`. Sans la variable, le endpoint retourne 404. C'est testé dans les deux états.

---

## URLs à avoir ouvertes

- **API prod** : `https://todo.lootopia.io/health`
- **Swagger** : `https://todo.lootopia.io/docs`
- **Métriques** : `https://todo.lootopia.io/telemetry`
- **GitHub Actions** : `https://github.com/lootopia-les-3-dev/todo-api-node/actions`
- **Codecov** : `https://codecov.io/gh/lootopia-les-3-dev/todo-api-node`
- **GHCR** : `https://github.com/lootopia-les-3-dev/todo-api-node/pkgs/container/todo-api-node`
