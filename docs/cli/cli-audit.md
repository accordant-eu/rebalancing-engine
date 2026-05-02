# CLI Audit

Date: 2026-05-02

## Scope

Audited the implemented offline CLI wrapper for validation, single-scenario execution, batch regression execution, and inspection. The audit covers CLI behavior only; it does not re-audit underlying financial calculations.

## Checklist

- Command hierarchy is explicit: `validate`, `run`, `batch`, `inspect`.
- Root and command help include purpose, key inputs, examples, output behavior, and exit-code implications.
- Scenario manifest mode works with existing fixture files.
- Explicit input-file mode supports portfolio, prices, target, and policy files.
- Scenario mode and explicit file mode are mutually exclusive.
- Strategy selection stays in policy/scenario input files; no hidden CLI override is present.
- Output formats are implemented as `summary`, `pretty`, and `json`.
- JSON output is deterministic and not mixed with logs.
- `--output` writes command output to a file and leaves stdout empty.
- Warnings are visible in human output and included in JSON output.
- `--strict` converts successful commands with warnings into exit code `1`.
- Exit codes follow the documented contract: `0`, `1`, `2`, and `3`.
- Batch mode supports expected-status manifest validation for regression workflows.
- Inspect mode exposes scenarios, strategies, and policy fields.
- Tests cover success paths, failure paths, strict mode, output files, JSON parsing, and explicit input mode.

## Findings

- No CLI-specific defects are known after the current validation pass.
- Validation currently exercises the same deterministic engine path as recommendation generation and renders only validation status and warnings. This keeps validation aligned with actual engine behavior, but a future standalone schema/domain validator could separate validation from calculation more strictly.
- Stdin support is intentionally deferred. The current file-only contract is simpler and sufficient for the existing fixture and regression workflows.
- Per-scenario batch output directories are deferred. The current `--output` writes the aggregate batch result.
- CLI strategy overrides are deferred to preserve auditability of policy/scenario files.

## Validation Commands

Run before finalizing:

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run build
```
