---
type: Decision
title: Adopt UX-First Thin Slice MVP Methodology for v3
description: Methodological decision to prioritize API and UI observability over backend database scaling in the early tranches.
tags: [methodology, mvp, ui]
timestamp: 2026-06-14T14:55:00Z
---

# 0043: Adopt UX-First Thin Slice MVP Methodology for v3

Date: 2026-06-14

## Context

When structuring the implementation plan for the Live Agent v3.0, the initial instinct was to build the foundational data architecture (SQLite multi-portfolio support) before building any user-facing features (Command Center Dashboard). This "bottom-up" approach guarantees data integrity but delays validation of the user experience and API boundaries.

## Options Considered

1. **Option 1: Database-First Waterfall.** Build SQLite schema -> Build Orchestrator multi-portfolio loop -> Build API -> Build UI Dashboard.
2. **Option 2: UX-First Thin Slice MVP.** Build API and UI Dashboard using mocked/existing in-memory state -> Build Friction Optimization visible in UI -> Scale multi-portfolio logic in memory -> Swap memory for SQLite database.

## Decision

We chose **Option 2**. We will strictly adhere to MVP principles by building thin vertical slices that surface value and validate assumptions as early as possible.

## Rationale

A true MVP proves the riskiest assumption or delivers the most visible value first. In our case, the core mathematical engine is already proven. Building a backend database before anyone can see it is an anti-pattern. By building the Command Center Dashboard first (fed by in-memory state), we force ourselves to establish the API-First contract immediately, and we gain immediate visual feedback when we subsequently introduce complex logic like Friction Penalties.

## Implementation Impact

- Tranche 5 will focus purely on embedding a lightweight HTTP server and building a React/Vite dashboard, delaying the `better-sqlite3` dependency until Tranche 8.
- The Orchestrator will be temporarily refactored to manage multiple portfolios via an in-memory array to prove the UI aggregation logic before committing to a database schema.

## Validation

Validation will occur during Tranche 5 when a user can navigate to the local dashboard and observe real-time drift metrics without any database backend deployed.

&copy; 2026 Johan Hellman. All rights reserved.
