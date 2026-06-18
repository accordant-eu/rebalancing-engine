# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci

# Build TypeScript backend
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run build

# Build React frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Stage 2: production image ────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled backend
COPY --from=builder /app/dist ./dist

# Built frontend (nginx serves this; bind-mounted path in compose)
COPY --from=builder /app/web/dist ./web/dist

# Runtime data directory
RUN mkdir -p data

# Scenario fixtures used to initialise the agent
COPY tests/fixtures ./tests/fixtures

ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["agent", "start", \
     "--scenarios", "tests/fixtures/scenarios.json", \
     "--scenario-id", "on_target"]
