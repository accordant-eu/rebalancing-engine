---
type: Decision Record
title: Add thin offline CLI around existing engine and fixture runner
description: Decision to add thin offline cli around existing engine and fixture runner
tags: [architecture, cli]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Add thin offline CLI around existing engine and fixture runner

## Context

The engine is usable through TypeScript modules and an existing fixture runner, but users need a documented command-line interface for local development, demos, regression checks, and future automation. The CLI must not reimplement financial logic or introduce live integrations.

## Options Considered


1. Extend only the existing `scenario-runner` script.
   - Benefits: Minimal new code and preserves the current batch workflow.
   - Costs: Keeps single-scenario execution, validation, help text, explicit input files, and output formats awkward.
   - Risks: Users continue depending on source-level knowledge and raw argument order.
   - Reversibility: High.

2. Add a thin `rebalance` CLI with verb subcommands and local parsing.
   - Benefits: Clear user surface for `validate`, `run`, `batch`, and `inspect`; no new runtime dependency; preserves existing engine and runner behavior.
   - Costs: Adds parser, renderer, and CLI tests that must be maintained.
   - Risks: Parser scope may outgrow the lightweight implementation if future needs become complex.
   - Reversibility: High; a CLI framework can replace the parser later without changing engine logic.

3. Add a production API or broader integration wrapper.
   - Benefits: Moves closer to future integration use.
   - Costs: Violates the current production-boundary deferral and introduces security, persistence, and operations decisions too early.
   - Risks: Premature architecture and expanded maintenance surface.
   - Reversibility: Medium.

## Decision

Option 2: Add a thin offline `rebalance` CLI with verb subcommands and local parsing.

## Rationale

This is the best MVP-compatible trade-off. It improves discoverability and automation while keeping all financial behavior in the existing engine modules. It avoids a new dependency and remains compatible with existing fixture manifests and expected-status regression checks.

## Implementation Impact


- Code: Added `src/cli` modules for parsing, input loading, command execution, deterministic JSON rendering, human summaries, and the executable entry point.
- Tests: Added CLI behavior coverage for help, usage errors, validation, run output, batch expectations, inspection, strict warning behavior, output-to-file behavior, and explicit input mode.
- Fixtures: Existing synthetic fixtures remain unchanged and are used by the CLI tests.
- Documentation: Added `docs/cli/cli-design.md` and a README CLI section covering setup, commands, input modes, output formats, exit codes, warnings, limitations, and tests.
- Follow-up: Config files and CLI strategy overrides remain deferred until a concrete need exists. Scenario stdin and per-scenario batch output directories are handled by the later CLI limitation review.

## Validation

Run CLI tests, the full Jest suite, TypeScript checks, linting, formatting, and build before committing.


&copy; 2026 Johan Hellman. All rights reserved.
