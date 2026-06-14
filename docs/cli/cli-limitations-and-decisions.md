---
type: Reference
title: Cli Limitations And Decisions
description: Documentation for cli limitations and decisions
tags: [cli]
timestamp: 2026-06-14T00:00:00Z
---

# CLI Limitations and Decisions

Date: 2026-05-02

## Scope

This document reassesses known CLI limitations against the current implementation. The CLI remains an offline, deterministic, explicit-input interface around the existing engine and scenario runner.

## Summary

| Limitation                             | Decision              | Current behavior                                                                                                                                                            |
| -------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No stdin support                       | Partially implemented | `run --scenario -` and `validate --scenario -` read one scenario object or scenario manifest from stdin. Explicit input files and `batch --scenarios -` remain unsupported. |
| No config file support                 | Deferred              | There is no `--config` flag. Inputs stay explicit in scenario/policy files.                                                                                                 |
| No per-scenario batch output directory | Implemented           | `batch --output-dir <dir>` writes one deterministic file per scenario. Existing files require `--force`.                                                                    |
| No CLI strategy override               | Deferred              | There is no `--strategy` flag. Strategy selection remains in scenario/policy input.                                                                                         |
| `validate` uses engine path            | Accepted behavior     | `validate` runs the deterministic engine path and renders validation status. It is not a schema-only validator.                                                             |

## Decision: Support stdin for scenario input only

Status: Accepted

Context:
Scenario mode already has a single JSON loading path for `run` and `validate`, making stdin support useful without changing engine semantics. Explicit file mode has four separate inputs, so allowing stdin there would create ambiguous ownership of fd 0.

Options considered:

1. Implement stdin for scenario input only.
   - Benefits: Enables shell pipelines, keeps input model simple, and reuses existing scenario JSON parsing.
   - Costs: Requires clear empty/malformed stdin errors and docs.
   - Risks: Users may expect stdin for explicit input files too.

2. Implement stdin for all explicit input files.
   - Benefits: Maximum flexibility.
   - Costs: Ambiguous when more than one input wants stdin; larger test and support surface.
   - Risks: Harder to keep audit-oriented input behavior clear.

3. Defer stdin support entirely.
   - Benefits: Simplest CLI.
   - Costs: Less useful for generated scenario pipelines.

Preferred option:
Option 1.

Rationale:
Scenario stdin is high-value and low-risk because it reads one complete audited scenario payload. Explicit-file stdin remains deferred to avoid multi-input ambiguity.

Implementation impact:
`--scenario -` is supported for `run` and `validate`. Empty stdin and malformed JSON are usage errors. `--portfolio -`, `--prices -`, `--target -`, `--policy -`, and `--scenarios -` are rejected.

Validation:
CLI tests cover valid stdin, malformed stdin, empty stdin, JSON output cleanliness, and explicit-file stdin rejection.

## Decision: Defer config file support

Status: Deferred

Context:
The CLI currently prefers explicit scenario, portfolio, price, target, and policy files. A config file could hold defaults such as output format, fixture paths, strict mode, or strategy, but that would add precedence rules and hidden state.

Options considered:

1. Add a CLI config file.
   - Benefits: Less repetitive commands for frequent users.
   - Costs: Requires precedence rules, discovery rules, documentation, and tests.
   - Risks: Hidden defaults can conflict with deterministic, auditable inputs.

2. Keep only explicit scenario/policy files.
   - Benefits: Simple, deterministic, and easy to review.
   - Costs: Commands can be more verbose.

Preferred option:
Option 2.

Rationale:
The current offline MVP benefits more from explicit inputs than from hidden defaults. Config support should wait until repeated workflows show a concrete need.

Implementation impact:
No `--config` flag is accepted. Documentation states config files are post-MVP.

Validation:
CLI tests confirm `--config` is rejected as an unknown option.

Revisit criteria:
Add a config-file PRD when users repeatedly need shared defaults across many commands and the project is ready to define precedence rules.

## Decision: Add per-scenario batch output directory

Status: Accepted

Context:
Batch mode already runs each scenario independently and can serialize deterministic CLI output. Writing one file per scenario improves review, regression analysis, and demos without changing engine behavior.

Options considered:

1. Implement `batch --output-dir <dir>`.
   - Benefits: High practical value for regression and review workflows.
   - Costs: Requires file naming and overwrite semantics.
   - Risks: Filesystem errors must fail clearly.

2. Keep aggregate batch output only.
   - Benefits: Simpler.
   - Costs: Reviewers must manually split large aggregate output.

3. Defer output directories.
   - Benefits: Avoids filesystem behavior.
   - Costs: Leaves a clear automation gap.

Preferred option:
Option 1.

Rationale:
The existing batch execution and renderer make this a small extension with clear value. Conservative overwrite behavior avoids accidental data loss.

Implementation impact:
`rebalance batch --output-dir <dir>` creates the directory and writes one file per scenario using sanitized scenario IDs. Per-scenario files default to JSON when `--format` is omitted; if `--format pretty` or `--format summary` is supplied, per-scenario files use that selected format and a `.txt` extension. Existing files cause a usage error unless `--force` is supplied. The normal batch output remains on stdout or `--output`.

Validation:
CLI tests cover success, existing-file refusal, `--force`, partial batch failure output, and exit codes.

## Decision: Defer CLI strategy override

Status: Deferred

Context:
The engine selects strategy from `policy.strategyType`, defaulting to `threshold` when omitted. A CLI override would be convenient for comparisons but would make the command line diverge from audited scenario/policy inputs.

Options considered:

1. Add broad `--strategy <strategy>` override.
   - Benefits: Convenient comparison and demos.
   - Costs: Precedence rules and audit metadata are required.
   - Risks: Scenario/policy files stop being the sole source of truth.

2. Keep strategy selection only through scenario/policy files.
   - Benefits: Reproducible and auditable.
   - Costs: Users edit policy files to compare strategies.

3. Add limited compatible overrides only.
   - Benefits: Balances convenience and safety.
   - Costs: Requires compatibility rules that are not yet needed.

Preferred option:
Option 2.

Rationale:
Auditability is more important than command-line convenience at this stage. `inspect strategies` already exposes supported strategy IDs.

Implementation impact:
No `--strategy` flag is accepted.

Validation:
CLI tests confirm `--strategy` is rejected as an unknown option.

Revisit criteria:
Reconsider a limited override only if comparative strategy runs become a documented workflow and override metadata can be captured in output/audit records.

## Decision: Keep `validate` on the deterministic engine path

Status: Accepted

Context:
The current `validate` command loads inputs and runs the same deterministic engine path as `run`, then renders validation status and warnings. There is no separate schema-only validator.

Options considered:

1. Keep engine-path validation and document it.
   - Benefits: Validation reflects executable behavior and cannot drift from recommendation logic.
   - Costs: Heavier than schema-only validation.
   - Risks: Some users may expect schema-only behavior.

2. Add a separate schema-only validator.
   - Benefits: Faster shape validation and narrower error scope.
   - Costs: Duplicate validation paths and schema versioning burden.
   - Risks: Validator and engine can disagree.

3. Add validation levels such as `--mode engine|schema`.
   - Benefits: Flexible.
   - Costs: More CLI and documentation complexity.

Preferred option:
Option 1.

Rationale:
The MVP has no independent schema contract yet. Engine-path validation is deterministic, useful, and lower maintenance.

Implementation impact:
Help text, README, and CLI docs describe `validate` as engine-path validation and avoid schema-only language.

Validation:
CLI tests cover validate help wording and existing valid/invalid engine-path behavior.


&copy; 2026 Johan Hellman. All rights reserved.
