---
type: Decision
title: Pivot Live Agent to a B2B SaaS Multi-Tenant Architecture
description: Strategic decision to target enterprise wealth management over individual retail agents.
tags: [architecture, saas, b2b, api]
timestamp: 2026-06-14T14:55:00Z
---

# 0041: Pivot Live Agent to a B2B SaaS Multi-Tenant Architecture

Date: 2026-06-14

## Context

The rebalancing engine v2.0 successfully demonstrated a live autonomous agent capable of polling a broker, evaluating drift, and executing paper trades for a single portfolio. As we designed the v3 roadmap for scaling to thousands of portfolios, a strategic question emerged regarding the target audience. Should the system scale as a powerful local desktop tool for individual retail traders/family offices, or should it scale as a Turnkey Asset Management Platform (TAMP) for enterprise wealth management firms?

## Options Considered

1. **Option 1: Retail/Local Agent.** Keep the system single-tenant. Focus on deep customization for one user (e.g., local config files, simple local UI, single API key).
2. **Option 2: B2B SaaS Platform.** Pivot the architecture to support Multi-Tenancy, Maker-Checker authorization workflows, Model Portfolios (fan-out propagation), and Machine-to-Machine (M2M) Partner APIs.

## Decision

We chose **Option 2**. We will architect the v3 Live Agent as a B2B SaaS platform.

## Rationale

A highly deterministic, friction-optimized mathematical engine provides the most value when applied at scale. Managing 10,000 portfolios manually is impossible for a wealth advisory firm; automating it via a programmatic mandate is highly valuable. Furthermore, adopting an API-first M2M design ensures that wealth management partners can integrate the engine directly into their existing CRMs without being forced into a monolithic UI.

## Implementation Impact

- **Database:** Requires transitioning from single-portfolio memory states to a multi-tenant persistent database (e.g., SQLite/PostgreSQL) with strict row-level tenant isolation.
- **API First:** The UI must be decoupled from the engine, consuming the exact same API endpoints that a B2B partner would use.
- **Authentication:** Requires implementing Role-Based Access Control (RBAC) and scoped API keys (e.g., `read:drift` vs `write:mandates`).

## Validation

Validation will occur during Tranche 9 of the v3 MVP plan, specifically when the API successfully rejects unauthorized B2B partner mutation attempts and proves tenant data isolation.

&copy; 2026 Johan Hellman. All rights reserved.
