---
type: Decision Record
title: Consolidate user/developer docs around observed behavior
description: Decision to consolidate user/developer docs around observed behavior
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Consolidate user/developer docs around observed behavior

## Context

The repository has accumulated implementation plans, audits, roadmap notes, fixture docs, CLI design notes, and README sections. New users and developers need a stable entry point that explains what the engine currently does, how to run it, how the CLI works, how concepts fit together, and how to extend strategies without reverse-engineering code or reading historical plans.

## Options Considered


1. Keep expanding README as the primary documentation surface.
   - Benefits: Single visible file for most users.
   - Costs: README becomes too long and mixes setup, reference, architecture, examples, and extension policy.
   - Risks: High chance of stale sections and poor discoverability.

2. Create dedicated guides and keep README concise.
   - Benefits: Clear separation between entry point, user guide, CLI reference, developer guide, strategy extension guide, architecture overview, and examples.
   - Costs: More files must be kept synchronized.
   - Risks: Cross-document drift if future changes skip documentation updates.

3. Add generated docs from TypeScript types.
   - Benefits: API type references could stay close to code.
   - Costs: Adds tooling and does not explain product workflows, CLI behavior, decisions, or extension discipline.
   - Risks: Premature documentation tooling for an early offline engine.

## Decision

Option 2.

## Rationale

Dedicated docs match how different readers use the project. README stays practical, while the user guide, CLI reference, examples, developer guide, architecture overview, and strategy extension guide can be comprehensive without overwhelming first contact. This also aligns with the standing decision discipline and CLI exposure rules.

## Implementation Impact


- README becomes a concise project entry point.
- `docs/guides/user-guide.md` owns user workflows and concepts.
- `docs/cli/cli-reference.md` owns command syntax, options, outputs, exit codes, and common errors.
- `docs/guides/developer-guide.md` owns repository structure, architecture workflow, fixtures, testing, and documentation expectations.
- `docs/guides/adding-rebalancing-strategies.md` owns strategy-extension discipline and anti-patterns.
- `docs/architecture/overview.md` owns high-level architecture and boundaries.
- `docs/examples.md` owns copy-pasteable examples.

## Validation

Run formatting/checks, full tests, TypeScript, lint, build, CLI help, documented CLI examples, scenario runner, and expected-status batch validation before commit.


&copy; 2026 Johan Hellman. All rights reserved.
