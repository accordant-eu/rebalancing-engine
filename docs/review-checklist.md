# Rebalancing Engine — Quality Review Checklist

**Purpose**: Ensure every production release (especially direct-to-main deploys) receives a minimum quality gate covering security, correctness, architecture, and maintainability.

**When to run**: 
- Before every production deploy that touches `src/orchestrator/`, `src/api/`, or `src/services/`
- As part of the weekly Sunday GitHub sweep
- On request from Rufus or Johan

**Reviewer**: Vidar (primary) or Rufus (manual fallback)

---

## 1. Security (Must pass)
- [ ] No hardcoded secrets or weak defaults (JWT_SECRET, API keys, DB credentials)
- [ ] Webhook endpoints verify signatures and implement replay protection
- [ ] Rate limiting and auth middleware are active on all non-public routes
- [ ] Dependencies scanned (Dependabot + `npm audit` / `pnpm audit`)
- [ ] No obvious injection vectors in SQL, shell, or template usage
- [ ] Container runs as non-root (if applicable)

## 2. Correctness & Logic
- [ ] Recent changes (`src/orchestrator/`, `src/services/market-calendar.ts`, reconciliation logic) have clear error handling and edge-case coverage
- [ ] State machine transitions in `sqlite-state.ts` and `loop.ts` are idempotent where required
- [ ] No obvious race conditions or missing transaction boundaries
- [ ] Timezone / market-hours logic uses reliable sources (not naive `new Date()` assumptions)

## 3. Architecture & Maintainability
- [ ] No circular dependencies (`madge --circular src/`)
- [ ] Large files (`server.ts` > 800 LOC) have clear module boundaries or TODOs for extraction
- [ ] Logging and metrics are present for key execution paths (rebalance decisions, order submission, reconciliation)
- [ ] Public API surface (`openapi.ts`) matches implementation

## 4. Testing & Observability
- [ ] New/changed orchestrator or API logic has unit or integration test coverage
- [ ] Critical paths have structured logging with correlation IDs where possible
- [ ] Health/metrics endpoints expose useful signals for Týr / monitoring

## 5. Release Hygiene
- [ ] CI is green on the exact commit being deployed
- [ ] Changes since last release tag are summarized (even if no PR)
- [ ] Any medium/high findings from this checklist are either fixed or explicitly accepted with justification

---

**Output format** (Vidar or manual reviewer must produce this):

```markdown
## Rebalancing Engine Review — <commit-sha> (<date>)

**Risk Assessment**: Critical / High / Medium / Low / Acceptable

**Findings**
- Critical: ...
- High: ...
- Medium: ...
- Low: ...

**Recommendations**
- ...

**Decision**: Proceed / Block / Proceed with conditions
```

**Owner**: Rufus (infrastructure) + Vidar (application review)  
**Last updated**: 2026-07-31
