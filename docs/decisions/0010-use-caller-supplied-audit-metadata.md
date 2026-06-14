---
type: Decision Record
title: Use caller-supplied audit metadata
description: Decision to use caller-supplied audit metadata
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use caller-supplied audit metadata

## Context

Slice 9 requires audit records with event identity and timestamp behavior suitable for deterministic tests and replay. The project needs to decide whether the audit module should generate IDs/timestamps internally or receive them from orchestration.

## Options Considered


1. Generate event IDs and timestamps inside `generateAuditRecord`.
   - Benefits: Convenient for callers.
   - Costs: Adds non-determinism to a pure audit helper.
   - Risks: Tests and replay require injection or mocking later.
   - Reversibility: Medium; API would need to change to regain determinism.

2. Require callers to supply `eventId` and `createdAt`.
   - Benefits: Deterministic, testable, and keeps orchestration concerns outside pure domain logic.
   - Costs: Callers must provide metadata.
   - Risks: Callers can supply duplicate IDs unless a higher-level runner enforces uniqueness.
   - Reversibility: High; convenience wrappers can be added later.

3. Generate deterministic hashes from inputs.
   - Benefits: Stable IDs without caller input.
   - Costs: Requires canonical hashing and a new dependency or custom serializer.
   - Risks: Premature complexity and possible hash semantics changes.
   - Reversibility: Medium.

## Decision

Option 2: Require callers to supply `eventId` and `createdAt`.

## Rationale

This preserves deterministic pure logic and leaves uniqueness/time policy to a future runner or integration layer.

## Implementation Impact


- Code: Added `generateAuditRecord` and `serializeAuditRecord` under `src/audit`; removed the stale domain-level `AuditRecord` type.
- Tests: Added audit capture, deterministic serialization, and replay checks.
- Fixtures: Existing scenarios are sufficient.
- Documentation: README and build journey now describe audit support.
- Follow-up: Slice 10 runner should supply stable audit metadata for fixture execution.

## Validation

Run tests, type-check, lint, build, and format after implementation.
