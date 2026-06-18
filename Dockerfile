# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:20 AS builder

WORKDIR /app

# Install all deps (including dev) — needed to compile native modules + TS
COPY package*.json ./
RUN npm ci

# Compile TypeScript backend
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run build 2>/dev/null || npx tsc

# Build React frontend
COPY web/package*.json ./web/
RUN cd web && npm ci
COPY web ./web
RUN cd web && npm run build

# Prune dev dependencies *after* compilation so native binaries are kept
RUN npm prune --omit=dev

# ── Production ────────────────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Copy compiled artefacts and pruned deps from builder
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web/dist     ./web/dist
COPY --from=builder /app/package.json ./package.json

# Data dir for SQLite + audit JSONL
RUN mkdir -p /app/data

# Scenario fixtures (referenced at runtime)
COPY --from=builder /app/tests ./tests

ENV NODE_ENV=production

# Default: start Live Agent with on_target scenario.
# Override CMD in docker-compose.yml for different scenarios.
CMD ["node", "dist/cli/index.js", "agent", "start", "--scenarios", "tests/fixtures/scenarios.json", "--scenario-id", "on_target"]
