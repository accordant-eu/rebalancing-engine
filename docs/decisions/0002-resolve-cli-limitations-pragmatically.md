---
type: Decision Record
title: Resolve CLI limitations pragmatically
description: Decision to resolve cli limitations pragmatically
tags: [architecture, cli]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Resolve CLI limitations pragmatically

## Context

The CLI had five known limitations: no stdin support, no config file support, no per-scenario batch output directory, no CLI strategy override, and `validate` using the deterministic engine path instead of a separate schema-only validator. The project needs the CLI to be useful without adding hidden state or duplicating financial logic.

## Options Considered


1. Implement every limitation immediately.
   - Benefits: Maximum CLI feature coverage.
   - Costs: Adds config precedence, broad override semantics, and validation-mode complexity before concrete workflows require them.
   - Risks: Hidden inputs and duplicated validators could weaken auditability.

2. Implement only high-value, low-risk CLI improvements and document intentional deferrals.
   - Benefits: Improves pipeline and regression workflows while preserving explicit scenario/policy inputs.
   - Costs: Config files and strategy comparison remain less convenient.
   - Risks: Future users may still request broader overrides.

3. Leave all limitations deferred.
   - Benefits: Smallest change.
   - Costs: Keeps obvious usability gaps in stdin and batch artifact workflows.

## Decision

Option 2.

## Rationale

`run --scenario -`, `validate --scenario -`, and `batch --output-dir <dir>` fit the current code shape and do not change engine semantics. Config files and strategy overrides would introduce hidden state or audited-input ambiguity. Keeping `validate` on the engine path avoids divergence until schema-only validation has a concrete need.

## Implementation Impact


- Code: Added scenario stdin for `run` and `validate`; added `batch --output-dir <dir>` and `--force`; rejected explicit-file stdin and batch stdin.
- CLI behavior: Per-scenario batch files use sanitized IDs, avoid overwrites by default, and default to JSON when no per-command format is specified.
- Tests: Added CLI coverage for stdin success/failure, validate help semantics, batch output directory success/overwrite/partial-failure behavior, and unsupported `--config`/`--strategy` flags.
- Documentation: Added `docs/cli/cli-limitations-and-decisions.md`; updated README, CLI design/audit docs, roadmap, fixture docs, and this build journey.

## Validation

Run CLI tests, full Jest suite, TypeScript checks, linting, formatting, build, scenario runner, and representative CLI smoke commands before committing.
