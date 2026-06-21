---
type: Decision Record
title: Use Tenant API Keys for B2B Authentication
description: Introduce dedicated API keys for Tenants to programmatically access the engine instead of relying solely on user-level UI authentication.
tags: [architecture, security, tenants]
timestamp: 2026-06-18T17:00:00Z
status: Accepted
supersedes: 
---

# Use Tenant API Keys for B2B Authentication

## Context

The system has transitioned into a B2B SaaS architecture where Tenants (Advisory Firms / Brokers) provision portfolios. Currently, authentication relies on JWTs generated from UI-based user logins (`/api/admin/login`). However, Tenants require programmatic, system-to-system access to the API (e.g., to create portfolios or push cash flows) without requiring human interaction or temporary tokens.

## Options Considered

### Option 1: Require Tenants to use OAuth / OIDC client credentials
- **Benefits:** Industry standard for B2B.
- **Costs:** High implementation overhead. Requires spinning up an identity provider or integrating a complex third-party system.
- **Risks:** Over-engineering for the current phase.
- **Reversibility:** Low.

### Option 2: Issue long-lived JWTs to Tenants
- **Benefits:** Reuses existing JWT authentication middleware.
- **Costs:** Difficult to revoke securely without building a token denylist.
- **Risks:** High security risk if leaked.
- **Reversibility:** High.

### Option 3: Implement Tenant API Keys (Stored as hashed secrets)
- **Benefits:** Simple to implement, explicitly revokable, and follows standard API provider patterns (e.g., Stripe, Alpaca).
- **Costs:** Requires new database tables and dual-auth middleware logic.
- **Risks:** Minimal. Keys are hashed at rest, protecting against database compromises.
- **Reversibility:** High.

## Decision

We will implement Option 3: Tenant API Keys. We will create a `TenantApiKeys` table that stores a displayable prefix and a cryptographically hashed secret. The secret will only be shown to the user once upon generation. The API middleware will be updated to accept these keys via the `Authorization: Bearer <key>` header, falling back to the JWT logic if the format differs.

## Rationale

API keys provide the necessary ergonomics for B2B integrations while maintaining security through explicit revocation and hashing. This is deterministic, easily testable, and aligns with our principle of keeping the architecture explicit and manageable without heavy third-party dependencies during the MVP phase.

## Implementation Impact

- **Code:** Add `TenantApiKey` interface to `src/models/domain.ts`. Modify auth middleware in `src/api/server.ts`.
- **Database:** Create `TenantApiKeys` table in SQLite.
- **UI:** Add API Key generation and revocation to the `TenantManagementTab`.

## Follow-up

None.

&copy; 2026 Johan Hellman. All rights reserved.
