---
type: Decision Record
title: Use separate expected-status runner manifest
description: Decision to use separate expected-status runner manifest
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use separate expected-status runner manifest

## Context

The next-iteration MVP plan called for mixed-strategy scenario runner support and left expected-status handling as an optional runner hardening item. The runner already reports per-scenario errors, but fixture regression checks need to distinguish expected invalid scenarios from unexpected failures without making the scenario input data harder to scan.

## Options Considered


1. Embed expected statuses directly in `tests/fixtures/scenarios.json`.
   - Benefits: Expectations sit next to scenario inputs.
   - Costs: Mixes test-runner assertions with domain scenario data.
   - Risks: Fixture file becomes harder to reuse as plain input data.
   - Reversibility: High.

2. Use a separate expected-status manifest.
   - Benefits: Keeps scenario inputs clean, lets runner validation remain optional, and gives invalid scenarios explicit expected error text.
   - Costs: Manifest must stay aligned when fixtures change.
   - Risks: Stale manifest entries can create false failures or miss new scenarios unless tests check both directions.
   - Reversibility: High.

3. Keep expected statuses only in Jest assertions.
   - Benefits: No additional fixture file.
   - Costs: CLI users cannot validate batch output against expected results.
   - Risks: Scenario runner can drift from documented expected behavior outside tests.
   - Reversibility: High.

## Decision

Option 2: Use a separate expected-status manifest.

## Rationale

This preserves reusable scenario input data while giving the CLI and tests a deterministic way to validate success/error expectations. The manifest is easy to remove or replace if a richer fixture schema is needed later.

## Implementation Impact


- Code: `scenario-runner` accepts an optional expectations path, validates status and expected error text, and exits non-zero on mismatches.
- Tests: Added manifest success and mismatch coverage plus invalid strategy fixture coverage.
- Fixtures: Added `tests/fixtures/scenario-expectations.json`.
- Documentation: README and fixture README describe manifest validation.
- Follow-up: Keep manifest entries aligned with fixture additions and removals.

## Validation

Jest runner tests pass, the scenario runner validates 12 manifest entries with zero mismatches, and invalid strategy scenarios remain isolated per scenario.


&copy; 2026 Johan Hellman. All rights reserved.
