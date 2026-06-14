---
type: Decision Record
title: Defer schema-only validation mode
description: Decision to defer schema-only validation mode
tags: [architecture]
timestamp: 2026-06-14T00:00:00Z
status: Deferred
---

# Defer schema-only validation mode

## Context

The CLI `validate` command runs the full engine path. A schema-only mode would check input structure without running financial calculations.

## Options Considered


1. Add `--schema-only` flag.
   - Benefits: Clearer structural vs financial error separation; enables external tooling.
   - Costs: Schema maintenance, risk of schema/engine drift.
   - Risks: Premature if no external tool integration exists.

2. Keep engine-path validation only.
   - Benefits: One validation path, no drift risk; structural errors already terminate early.
   - Costs: Cannot distinguish structural from financial errors in output.

## Decision
 Option 2.

## Rationale

The owner observed that engine-path validation already terminates early on structural errors, so the performance and behavior profile is effectively identical. Schema-only mode adds maintenance burden without a concrete consumer.


&copy; 2026 Johan Hellman. All rights reserved.
