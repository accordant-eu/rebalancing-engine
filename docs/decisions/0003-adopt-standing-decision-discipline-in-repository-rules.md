---
type: Decision Record
title: Adopt standing decision discipline in repository rules
description: Decision to adopt standing decision discipline in repository rules
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Adopt standing decision discipline in repository rules

## Context

The project is entering financial-domain implementation slices where small choices about precision, cash, validation, trade semantics, warnings/errors, fixtures, and documentation can create long-lived inconsistencies. The user made decision discipline a standing instruction for current and future work, so the repository rules need to persist that behavior for future agents.

## Options Considered


1. Add the full standing rule to `AGENTS.md` and record the decision in `BUILD_JOURNEY.md`.
   - Benefits: Puts the rule where agents already look first; keeps the decision log current; no new process or directory.
   - Costs: `AGENTS.md` becomes more prescriptive.
   - Risks: Future decisions may still be under-documented if agents ignore the rule.
   - Reversibility: High; the rule can be refined without changing source behavior.

2. Create a new `docs/decisions/` ADR system immediately.
   - Benefits: Richer decision history and cleaner long-form decision records.
   - Costs: Adds process overhead before the project has many decisions.
   - Risks: Premature documentation structure could slow small MVP slices.
   - Reversibility: Medium; easy to add later, but unnecessary files would need cleanup.

3. Rely only on the chat instruction without changing repository files.
   - Benefits: No repository change.
   - Costs: Not durable for future sessions or agents.
   - Risks: High chance of regressions to implicit or undocumented decisions.
   - Reversibility: High, but weak as a project control.

## Decision

Option 1: Add the standing decision rule to `AGENTS.md` and record this decision in `BUILD_JOURNEY.md`.

## Rationale

This is the best MVP-compatible trade-off. It keeps the rule close to agent operating instructions, avoids a premature ADR system, and creates a durable decision record without changing runtime behavior.

## Implementation Impact


- Code: No source behavior changes.
- Tests: No test changes required because this is process/documentation-only.
- Fixtures: No fixture changes.
- Documentation: `AGENTS.md` now requires explicit decision identification, alternatives, trade-off assessment, documentation, consistency, and validation for meaningful decisions.
- Follow-up: If decision volume grows, consider introducing `docs/decisions/` ADRs.

## Validation

Documentation formatting and repository checks should pass after the update.


&copy; 2026 Johan Hellman. All rights reserved.
