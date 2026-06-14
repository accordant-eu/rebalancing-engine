---
type: Decision Record
title: Add optional `asOf` timestamp on prices for audit traceability
description: Decision to add optional `asof` timestamp on prices for audit traceability
tags: [architecture]
timestamp: 2026-06-14T00:00:00Z
status: Accepted for next increment
---

# Add optional `asOf` timestamp on prices for audit traceability

## Context

Prices currently have no timestamp metadata. The owner asked about price freshness, valid-until semantics, and valuation vs execution price distinction.

## Options Considered


1. Add `asOf` timestamp for audit traceability only.
   - Benefits: Audit trail records when prices were observed; minimal implementation change.
   - Costs: Optional field adds schema surface.
   - Risks: Consumers may expect staleness enforcement.
   - Reversibility: High.

2. Add `asOf` plus staleness enforcement in the engine.
   - Benefits: Engine rejects stale prices.
   - Costs: Staleness policy is an orchestrator concern in the live-agent model.
   - Risks: Conflates engine and orchestrator responsibilities.

3. Add separate valuation and execution prices.
   - Benefits: More realistic trade cost estimation.
   - Costs: Premature for low-latency instant execution model where prices are effectively identical.
   - Risks: Over-engineering for retail-scale liquid-asset trading.

## Decision
 Option 1.

## Rationale

In the live-agent model with instant execution, valuation price ≈ execution price. Staleness is an orchestrator concern (detecting dead feeds). The engine should record `asOf` in audit output but not enforce freshness rules.

## Implementation Impact

- Code: Add optional `asOf` field to `PriceSnapshot` entries; pass through to audit records.
- Tests: Add audit tests verifying `asOf` is recorded when present.
- CLI: Include `asOf` in JSON output when present.


&copy; 2026 Johan Hellman. All rights reserved.
