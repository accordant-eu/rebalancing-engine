---
type: Decision Record
title: Align Docker Runtime with Node 24 Engine Specification
description: Upgrade Docker builder and runtime base images to Node 24 (Bookworm) and add build-time native module verification to resolve better-sqlite3 native SIGSEGV crash-loops.
tags: [operations, docker, runtime, sqlite, dependencies]
timestamp: 2026-10-15T09:45:00Z
status: Accepted
supersedes: null
---

# ADR-0066: Align Docker Runtime with Node 24 Engine Specification

## Context

Following the upgrade of `better-sqlite3` to version `13.0.3` (PR #99), production container deployments running `rebalancing-engine-rebalancing-engine:latest` on server infrastructure (`srv1055555`) encountered immediate segmentation faults (`exit 139 / SIGSEGV`) upon executing `initDb()` (`new Database(...)`), resulting in empty 0-byte log files and an infinite Docker restart loop under `restart: unless-stopped` (reported in Issue #124).

Investigation revealed an architectural discrepancy:
1. The repository's root `package.json` had standardized on Node.js `>=24.0.0` (`"engines": { "node": ">=24.0.0" }`), and CI workflows executed under Node `24.x`.
2. `better-sqlite3@13.0.3` declares `"engines": { "node": ">=22" }` and ships prebuilt native Node-API binaries compiled against newer ABI targets.
3. However, `Dockerfile` remained pinned to `node:20` and `node:20-slim`.
4. When `better-sqlite3` loaded `prebuilds/linux-x64.node` under Node 20 runtime, the ABI incompatibility caused a silent fatal SIGSEGV inside native registration.
5. Furthermore, CI lacked a container build step, allowing Dockerfile runtime regressions to pass undetected.

## Options Considered

### Option 1: Downgrade `better-sqlite3` to 12.x to Support Node 20
- **Benefits:** Retains Node 20 base image in Dockerfile.
- **Costs:** Reverts upstream bug fixes and security improvements in `better-sqlite3`; directly contradicts root `package.json`'s declared requirement of `"node": ">=24.0.0"`.
- **Risks:** Perpetual drift between developer environments (Node 26+), CI (Node 24), and production containers (Node 20).
- **Reversibility:** Medium.

### Option 2: Rebuild `better-sqlite3` from Source inside Node 20 Container
- **Benefits:** Continues using Node 20.
- **Costs:** Requires installing Python, `make`, and `g++` in the builder; fails to address the root problem that the engine's contract requires Node `>=24.0.0`.
- **Risks:** Increased image build times, heavier image attack surface, and continued violation of engine specifications.
- **Reversibility:** Low.

### Option 3: Align Dockerfile with Node 24 Specification and Add CI Build-Time Verification (Selected)
- **Benefits:**
  - Full alignment across `package.json` (`>=24.0.0`), CI (`24.x`), local environments, and production images (`node:24-bookworm` / `node:24-bookworm-slim`).
  - Native prebuilt binary for `better-sqlite3@13.0.3` loads and runs seamlessly without segmentation faults.
  - Adds build-time smoke verification step in `Dockerfile` (`RUN node -e 'const Database = require("better-sqlite3"); const db = new Database(":memory:"); db.close();'`) guaranteeing broken native bindings fail during `docker build`.
  - Integrates `docker build` into CI workflow (`.github/workflows/ci.yml`) to catch any container packaging issues prior to merging or deployment.
- **Costs:** Requires updating `Dockerfile` and `.github/workflows/ci.yml`.
- **Risks:** Minimal; verified against Debian Bookworm LTS glibc 2.36+.
- **Reversibility:** High.

## Decision

Adopt **Option 3**:
1. Update `Dockerfile` to use `node:24-bookworm` for the builder stage and `node:24-bookworm-slim` for the production runtime stage.
2. Embed an explicit native module verification step in the Dockerfile production stage to test `better-sqlite3` instantiation at image build time.
3. Add a `docker build` step to `.github/workflows/ci.yml` so all PRs and pushes to `main` validate Docker packaging and native module integrity.

## Implementation Impact

- **Code / Container Configuration:**
  - `Dockerfile`: Updated builder to `node:24-bookworm` and production to `node:24-bookworm-slim`. Added build-time smoke verification for `better-sqlite3`.
  - `.github/workflows/ci.yml`: Added `Build and verify Docker image` step to CI pipeline.
- **Tests & Validation:**
  - Full test suite passing (46 test suites, 342 tests).
  - TypeScript build, ESLint, web workspace build and tests validated.
  - Issue #124 resolution documented and ready for operator handoff.
- **Documentation:**
  - Registered ADR-0066 in `docs/decisions/index.md` and `BUILD_JOURNEY.md`.
  - Recorded detailed iteration log in `docs/iterations/2026-10-15.md`.
  - Updated `docs/log.md`.

## Follow-up

- Signal release readiness to operator Rufus via GitHub Issue labelled `release-ready` and comment on Issue #124 detailing root cause and fix.

&copy; 2026 Johan Hellman. All rights reserved.
