# Iteration Log: 2026-08-13 (Security & Architecture Hardening - Issues #105 & #106)

## Theme: Security & Architecture Mitigation – Stream Ticket Auth & Oracle Adapter Hardening

### Overview
This iteration addressed deployment feedback items **Issue #105** (JWT query token security leakage) and **Issue #106** (Oracle HTTP adapter sanitization, replay nonces, and adapter-level circuit breaking).

### Key Accomplishments
1. **Single-Use Stream Ticket Authentication (Issue #105)**:
   - Added `POST /api/auth/stream-ticket` endpoint (authenticated via standard `Authorization: Bearer <jwt>` header). Returns a 30-second single-use ticket (`st_<uuid>`).
   - Updated `GET /api/events/stream?ticket=st_...` to validate and immediately consume the single-use ticket.
   - Removed raw JWT token query parameter parsing (`?token=<jwt>`) to eliminate token leakage vectors in server and reverse proxy logs.
   - Updated React frontend (`web/src/App.tsx`) to request stream tickets before establishing `EventSource` connections.
   - Added unit tests in `tests/api.test.ts`.

2. **Oracle Adapter Hardening (Issue #106)**:
   - Added `sanitizeAndValidateResponse` in `src/core/oracle-adapter.ts` to filter out invalid trades (`NaN`, `Infinity`, negative quantity/price, missing `lot_id`/`identifier`, invalid directions).
   - Added `request_id` nonces to optimization request payloads to detect and reject replay attacks.
   - Implemented an adapter-level **Circuit Breaker** (`failureThreshold: 3`, `resetTimeoutMs: 30000`) that short-circuits directly to the fallback standard engine without sending HTTP requests when `OPEN`.
   - Added unit tests in `tests/core/trade-optimizer.test.ts`.

3. **Quality Assurance & Verification**:
   - `npx tsc --noEmit`: 0 errors.
   - `npm run lint`: 0 errors.
   - `npm run build`: Success.
   - `npm test`: 40 test suites, 278 tests passing cleanly.

### Files Touched
- `src/api/server.ts`
- `src/core/oracle-adapter.ts`
- `web/src/App.tsx`
- `tests/api.test.ts`
- `tests/core/trade-optimizer.test.ts`
- `docs/iterations/2026-08-13-security-hardening.md`
- `docs/log.md`
- `BUILD_JOURNEY.md`
