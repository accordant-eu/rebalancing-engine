# IT Security Review and Mitigation Plan

This document outlines the findings of a comprehensive IT Security review of the `rebalancing-engine` repository, focusing on the recently introduced Live Agent orchestrator, Express API, and execution components. 

Critically, this review assesses these gaps in the context of the **Live Agent MVP** approach. The current phase (Tranches 5-10) utilizes mocks (like the `MockOptimizer` and embedded Express server) to prove architectural scale and multi-tenant capabilities locally. 

## 1. Security Weaknesses and Gaps Identified

### Finding 1: Mock Authentication
- **Gap**: `src/api/server.ts` implements a mock JWT middleware where `req.headers.authorization` is blindly split and used as the `tenantId`. A malicious user can pass `Bearer superadmin` to gain full access to all models and portfolios.
- **MVP Context**: This is a deliberate mock to prove the multi-tenant pub/sub architecture works in a local UI without the heavy friction of setting up an external IDP (Auth0, Cognito) during the MVP.
- **Recommendation**: **Defer**. Do not replace the mock authentication until the system is migrating from a local execution engine to a public-facing B2B SaaS deployment. Document the gap and keep the MVP fast.

### Finding 2: Missing Input Validation
- **Gap**: The Express endpoints (`/api/models`, `/api/portfolios/:id/subscription`) consume `req.body` blindly without verifying the shape of the data. 
- **MVP Context**: While NoSQL injection or prototype pollution is a risk, the current database is a local `better-sqlite3` instance used for isolated simulation and testing. 
- **Recommendation**: **Defer**. Schema validation (e.g., via `zod`) is essential for a production API, but adding it now adds friction to the rapidly evolving domain models. We should implement it when the API surface stabilizes.

### Finding 3: Missing Security Headers & Rate Limiting
- **Gap**: The Express application does not use `helmet` for HTTP security headers and lacks rate-limiting (`express-rate-limit`).
- **MVP Context**: The API is only consumed by the local `localhost:5173` dashboard for observability and testing. DoS protections are irrelevant in this closed environment.
- **Recommendation**: **Defer**. These are deployment-topology concerns that should be handled by a reverse proxy or API Gateway when deployed.

### Finding 4: Dependency Vulnerabilities
- **Gap**: `npm audit` reveals moderate vulnerabilities in `js-yaml` and `@babel/core` dependencies via `jest` transformers.
- **MVP Context**: These are development/testing dependencies that do not execute in the runtime engine path. However, maintaining a clean audit is good hygiene.
- **Recommendation**: **Fix Now**. Use `npm audit fix` to resolve these vulnerabilities, as it takes seconds and reduces audit noise.

### Finding 5: Secrets & Sensitive Data Logging
- **Gap**: Webhooks and unhandled exceptions are logged raw via `console.log` and `console.error`. `FileAuditStorage` writes full simulation payloads. There is a risk of inadvertently logging PII, bearer tokens, or broker secrets (like `APCA_API_SECRET_KEY`).
- **MVP Context**: As we approach Tranche 11 (B2B Broker Routing), real API keys will be used in the engine. Leaking these in local logs or console output is a legitimate risk, even in an MVP.
- **Recommendation**: **Fix Now**. Introduce a structured logger (`pino`) to actively redact sensitive keys. This is a foundational practice that should be built into the core agent before it connects to external systems.

---

## 2. Mitigation Implementation Sequence

Based on the MVP context, we will heavily filter the immediate mitigations to only those that protect the local agent and reduce technical debt, explicitly deferring SaaS-level protections.

### Immediate Action (MVP Hardening)
1. **Dependency Hygiene**: Run `npm audit fix` to clear moderate vulnerabilities in `jest` tooling.
2. **Secure Logging**: Install `pino` and `pino-pretty`. Replace `console.log`/`console.error` with a configured Pino logger that actively redacts fields like `authorization`, `token`, `password`, and `APCA_API_SECRET_KEY`. This ensures that as we build real broker integrations, secrets are never dumped to stdout.

### Deferred Action (Production SaaS Hardening Phase)
The following will be logged in `docs/roadmap/rebalancing-engine-roadmap.md` under a future "API Production Hardening" tranche:
- Implement symmetric/JWKS JWT validation.
- Implement strict `zod` schema validation on all API endpoints.
- Enforce Rate Limiting and Security Headers.
