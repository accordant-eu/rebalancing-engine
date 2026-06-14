---
type: Decision
title: Use npm workspaces for monorepo structure
description: Structural decision to house the core engine and web frontend in the same repository.
tags: [architecture, monorepo, tooling]
timestamp: 2026-06-14T15:20:00Z
---

# 0044: Use npm workspaces for monorepo structure

Date: 2026-06-14

## Context

For Tranche 5 of the v3 MVP plan, we need to build a React/Vite web application to serve as the Command Center Dashboard. The core engine is currently a standard Node.js package residing at the root of the repository. We needed to decide whether to place the new web application in a completely separate repository, nest it informally within the current repository, or formally adopt a monorepo structure.

## Options Considered

1. **Option 1: Separate Repositories.** Keep `rebalancing-engine` strictly for backend code and create `rebalancing-engine-web` for the UI.
2. **Option 2: Monolithic Directory.** Just put a `/web` folder in the root without any package management linking.
3. **Option 3: npm Workspaces.** Update the root `package.json` to define `"workspaces": ["web"]`, formalizing the repository as a monorepo while keeping the core engine package untouched.

## Decision

We chose **Option 3**. We will adopt npm workspaces to structure the project as a monorepo.

## Rationale

A single repository containing both the agent and the Command Center ensures that API changes in the backend can be immediately tested and deployed alongside the frontend code that consumes them. Using standard npm workspaces ensures dependencies are hoisted and managed cleanly without breaking the existing CLI and test scripts that run from the root. 

## Implementation Impact

- Root `package.json` will be updated to include `"workspaces": ["web"]`.
- The new React/Vite application will be initialized inside the `/web` directory with its own `package.json`.
- Developers must run `npm install` from the root to link dependencies.

## Validation

Validation will occur when both the core backend tests (`npm run test`) and the frontend build (`npm run build --workspace=web`) succeed cleanly in the same CI pipeline.

&copy; 2026 Johan Hellman. All rights reserved.
