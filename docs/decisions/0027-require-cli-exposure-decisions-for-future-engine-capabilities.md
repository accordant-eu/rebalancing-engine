---
type: Decision Record
title: Require CLI exposure decisions for future engine capabilities
description: Decision to require cli exposure decisions for future engine capabilities
tags: [architecture, cli]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Require CLI exposure decisions for future engine capabilities

## Context

The CLI is now the first-class offline user interface. It supports validation, single-scenario runs, batch regression execution, inspection, deterministic JSON output, human summaries, output files, and strict warning semantics.

## Options Considered


1. Treat CLI as optional for future engine capabilities.
   - Benefits: Faster core implementation.
   - Costs: Creates capabilities that cannot be discovered, validated, or operated through the documented interface.
   - Risks: Docs, tests, and user workflows drift from engine behavior.

2. Require CLI support or explicit documented non-exposure for every future engine capability.
   - Benefits: Keeps engine, fixtures, docs, tests, and user workflows aligned.
   - Costs: Adds implementation and test work to each capability.
   - Risks: CLI surface can grow if not kept file-based and auditable.

## Decision

Option 2.

## Rationale

The project has no API, UI, or persistence layer. The CLI is therefore the operational boundary for local users, reviewers, and automation. Future capabilities should be visible in `validate`, `run`, `batch`, `inspect`, outputs, fixtures, tests, and documentation unless a PRD explicitly explains why not.

## Implementation Impact


- Scheduled/recurring cash-flow slices must include CLI acceptance criteria.
- Future optimizer, tax, production, and validation PRDs must specify CLI impact.
- CLI overrides that mutate audited financial inputs remain discouraged unless a concrete use case justifies them.

## Validation

CLI tests and documented command examples become required gates for engine behavior increments.


&copy; 2026 Johan Hellman. All rights reserved.
