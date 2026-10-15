---
type: Iteration
title: Docker Node 24 Runtime Alignment & Native SQLite Validation (Iteration 107)
description: Upgraded Docker builder and production runtime images to Node 24, embedded build-time SQLite initialization verification, added Docker build validation to CI, merged Dependabot updates, and resolved Issue #124.
tags: [iteration, docker, runtime, sqlite, ci, dependencies]
timestamp: 2026-10-15T09:46:00Z
---

# Iteration 107: Docker Node 24 Runtime Alignment & Native SQLite Validation

## Objective
Remediate Issue #124 (`Production image SIGSEGV on better-sqlite3 Database() — silent Docker restart loop`) reported by operator Rufus under `deployment-feedback`, align container runtime with the engine's Node 24 specification, embed build-time native module verification, integrate Docker image building into CI, and merge pending Dependabot dependency updates.

## Summary of Completed Work

### 1. Root Cause Identification for Issue #124
- Following the upgrade to `better-sqlite3@13.0.3` (PR #99), production containers running Debian 12 with `node:20` experienced fatal `SIGSEGV` (exit code `139`) whenever `new Database(...)` was invoked inside `initDb()`.
- The root cause was an ABI mismatch: `better-sqlite3@13.0.3` declares `"engines": { "node": ">=22" }` and ships prebuilt native Node-API binaries compiled against newer ABI targets. Loading these binaries under Node 20 resulted in an uncatchable segmentation fault in native C++ registration before any stdout logs could flush.
- Docker's `restart: unless-stopped` in `docker-compose.yml` subsequently triggered an infinite restart storm with empty 0-byte logs.
- Discrepancy identified: `package.json` had already standardized on `"node": ">=24.0.0"` and CI ran on Node `24.x`, but `Dockerfile` remained pinned to `node:20`.

### 2. Dockerfile Base Image Upgrade & Build-Time Smoke Verification
- Upgraded [`Dockerfile`](../../Dockerfile):
  - Builder stage: `node:20` $\rightarrow$ `node:24-bookworm`.
  - Production runtime stage: `node:20-slim` $\rightarrow$ `node:24-bookworm-slim`.
- Added build-time verification step in the production stage:
  ```dockerfile
  RUN node -e 'const Database = require("better-sqlite3"); const db = new Database(":memory:"); db.close();'
  ```
  Guarantees that any native module incompatibility halts `docker build` immediately at build time rather than producing a broken image that crash-loops in production.

### 3. CI Pipeline Hardening
- Updated [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) to add:
  ```yaml
  - name: Build and verify Docker image
    run: docker build -t rebalancing-engine:ci-test .
  ```
  Ensures container builds and native addon verifications are continuously validated on every pull request and push to `main`.

### 4. Architectural Decision Record (ADR-0066)
- Recorded [ADR-0066: Align Docker Runtime with Node 24 Engine Specification](../../docs/decisions/0066-align-docker-runtime-with-node-24-engine-specification.md).
- Updated the ADR index in [`docs/decisions/index.md`](../decisions/index.md) and [`BUILD_JOURNEY.md`](../../BUILD_JOURNEY.md).

### 5. Dependabot PR Merges
- Audited and merged 5 open Dependabot dependency update PRs:
  - PR #119: `build(deps-dev): bump jest from 30.4.2 to 30.5.1`
  - PR #120: `build(deps-dev): bump typescript-eslint from 8.67.0 to 8.69.0`
  - PR #121: `build(deps-dev): bump vite from 8.2.0 to 8.2.2`
  - PR #122: `build(deps): bump lucide-react from 1.33.0 to 1.39.0`
  - PR #123: `build(deps): bump qs from 6.15.3 to 6.16.0`
- Re-synced and rebased local `main` with `origin/main` cleanly with 0 conflicts.
- Requested Dependabot recreation for PR #118 (`framer-motion`).

## Verification & Validation Results
- `npm test`: All 46 test suites and 342 tests pass cleanly.
- `npm run build`: 0 TypeScript errors.
- `npm run lint`: Clean exit, 0 errors.
- `npm run --prefix web build` & `npm run --prefix web test`: Both pass cleanly.
- `./scripts/validate-docs.sh`: OKF validation passed with 100% compliance.

&copy; 2026 Johan Hellman. All rights reserved.
