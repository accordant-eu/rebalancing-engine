---
type: Audit
title: Adversarial Weakness & Hardening Audit (Tranche 7)
description: A targeted security and reliability audit focusing on vulnerabilities in the live agent execution environment.
timestamp: 2026-06-14T20:00:00Z
---

# Adversarial Weakness & Hardening Audit

## Context
With the pivot from a pure offline calculation core to an active `agent.ts` running an embedded Express API, interacting with live broker credentials, and handling local data persistence, the attack surface of the repository has expanded. This audit assumes an adversarial posture to identify weaknesses that could lead to financial loss, data exfiltration, or denial-of-service.

## Findings Register

### 1. High: Transitive Dependency Vulnerabilities (CVE Accumulation)
**Vector:** Supply Chain / Prototype Pollution / SSRF
**Description:** The `@alpacahq/alpaca-trade-api` package depends on an outdated version of `axios` (<= 0.31.1) which contains multiple unpatched high-severity CVEs (e.g., SSRF bypasses, prototype pollution, header injection, and credential theft via `mergeConfig`).
**Impact:** Remote Code Execution (RCE), Denial of Service (DoS), or Credential Exfiltration if an attacker influences requests to the API.
**Remediation:** **[RISK ACCEPTED]** The dependency is officially maintained by Alpaca. Replacing the SDK with native `fetch` involves significant maintenance overhead for API typing. This risk is accepted for the MVP phase, but should be resolved in the future B2B SaaS phase.

### 2. High: API Synchronous Event-Loop Exhaustion (DoS)
**Vector:** Application DoS / Memory Exhaustion
**Description:** The `/api/logs` endpoint reads the `audit-trail.jsonl` using `fs.readFileSync` and `.split('\n')`. While log rotation limits this to 5MB, repeatedly polling this endpoint synchronously blocks the Node.js event loop. 
**Impact:** Because the Orchestrator loop runs in the same thread, an attacker (or even a fast-refreshing dashboard) polling the logs can stall the live trading engine, delaying critical rebalance executions or causing price staleness.
**Remediation:** Switch the log endpoint to stream the file using `fs.createReadStream` or use an asynchronous tail library to prevent blocking the event loop.

### 3. Medium: Open Network Binding & Lack of Authentication
**Vector:** Data Exposure
**Description:** The embedded Express server binds to `app.listen(4444)` without explicitly specifying a host, defaulting to `0.0.0.0` or `::`. It also configures `app.use(cors())` which permits cross-origin resource sharing from any domain.
**Impact:** Any device on the local network (or the public internet if port-forwarded) can read the financial state, portfolio contents, and full audit logs.
**Remediation:** Explicitly bind the server to the loopback interface (`127.0.0.1`). If external dashboard access is required, enforce an API key via middleware and restrict CORS origins.

### 4. Medium: Unvalidated Secrets Injection
**Vector:** Silent Degradation / Credential Leakage
**Description:** `process.env.APCA_API_KEY_ID` and `process.env.APCA_API_SECRET_KEY` are consumed directly. If undefined, they become the string `"undefined"` or simply `undefined` in the headers, which is sent to the broker.
**Impact:** Fails silently or leaks internal node state. Doesn't crash early.
**Remediation:** Introduce a strict startup configuration check that asserts required environment variables are present and throws a fatal error if they are missing before the orchestrator even starts.

### 5. Low: Unsanitized JSON Parsing (Prototype Pollution Risk)
**Vector:** Input Validation
**Description:** The CLI uses `JSON.parse(fs.readFileSync(...))` for schedule/scenario inputs without a schema validator. While JSON.parse itself does not pollute the prototype, if these parsed inputs are deeply merged downstream (e.g., during testing or orchestration), it introduces risk.
**Impact:** Since the engine is primarily offline/controlled by the user, the risk is low, but worth noting for the long-term B2B SaaS phase.
**Remediation:** Defer until Tranche 8/9 when SQLite is introduced, which will inherently enforce a schema structure.

## Next Steps
A mitigation plan focusing on the High and Medium severity items will be documented and executed.
