# rebalancing-engine

Generic deterministic portfolio rebalancing engine in TypeScript/Node.js. Originally built as an offline calculation core, it now features a fully autonomous Live Agent capable of streaming evaluation, real-time paper trading via Alpaca, circuit breaker limits, and persistent JSONL audit trails.

## Current Status (Live Agent v2.0 MVP)

The project consists of an offline pure calculation core wrapped inside an autonomous, stateful Orchestrator agent.

**Core Capabilities (Offline & Live):**
- Portfolio valuation from holdings, cash, settled cash flows, and prices.
- Threshold, calendar due-date, and manual forced-rebalance trigger strategies.
- Full-reset and boundary-band trade proposal modes.
- Decimal-backed internal calculation helpers and centralized output rounding.
- Immutable, deterministic JSON audit trails.

**Live Agent Capabilities:**
- `LiveStateManager` for continuous, safe evaluation of streaming drift.
- Cooldown and debounce timers to prevent micro-churning around thresholds.
- `AlpacaAdapter` for fetching live portfolio state and submitting real trades (Paper Trading).
- `CircuitBreaker` safety limits to hard-stop execution on maximum trades or gross notional value.
- Reconciliation Pause Strategy to safely halt evaluations while broker orders are pending.
- Persistent JSONL audit logging (`data/audit-trail.jsonl`) and stdout notifications.

Explicitly out of scope today:
- Full transaction-cost optimizer (rule-based boundary targeting is sufficient for now).
- Jurisdiction-specific tax advice or tax-loss harvesting optimization.
- Production deployment infrastructure (e.g., Kubernetes/Docker setup).

See the roadmap in [docs/roadmap/rebalancing-engine-roadmap.md](docs/roadmap/rebalancing-engine-roadmap.md).

## Quick Start

Prerequisites:

- Node.js >= 18
- npm >= 9

Install dependencies:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

Build:

```bash
npm run build
```

Inspect strategies:

```bash
npm run cli -- inspect strategies
```

Validate fixtures:

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json
```

Run one scenario:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format pretty
```

Start the Live Agent (Paper Trading with Alpaca):

```bash
npm run cli -- agent start --scenarios tests/fixtures/scenarios.json --scenario-id on_target --live alpaca
```

Run batch scenarios against expected statuses:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

## Common Commands

```bash
npm test
npm test -- --runInBand tests/cli.test.ts
npx tsc --noEmit
npm run lint
npm run build
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
```

`npm run cli -- ...` builds first and then runs `dist/cli/index.js`.

## CLI

The package binary is named `rebalance` after `npm run build`.

Commands:

- `rebalance validate`: validate scenario or explicit input files through the engine path.
- `rebalance run`: run one scenario.
- `rebalance batch`: run many scenarios from a manifest file or directory.
- `rebalance inspect`: inspect scenarios, strategies, or policy fields.

Examples:

```bash
npm run cli -- --help
npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json
npm run cli -- inspect policies
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution --format json
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir tmp/batch-results --force
```

Input modes:

- Scenario mode: `--scenario <path>` reads one scenario or a `{ "scenarios": [...] }` manifest.
- Stdin scenario mode: `--scenario -` is supported for `validate` and `run`.
- Explicit file mode: `--portfolio`, `--prices`, `--target`, and `--policy` assemble one scenario.

Strategy selection is in `policy.strategyType`; omitted strategy defaults to `threshold`. There is no CLI `--strategy` override so audited input files remain the source of truth.

Output formats:

- `summary`: concise human output, default.
- `pretty`: detailed human output for single runs.
- `json`: deterministic machine-readable output.

Exit codes:

- `0`: success.
- `1`: validation failure, scenario error, batch expectation mismatch, or strict warning failure.
- `2`: usage error.
- `3`: unexpected runtime/internal error.

Full reference: [docs/cli/cli-reference.md](docs/cli/cli-reference.md).

## Knowledge Base (Documentation)

The `docs/` directory contains the project knowledge base in [OKF (Open Knowledge Format)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). 

Start at **[docs/index.md](docs/index.md)** for an overview of all available documentation.

Key entry points:
- [Product Vision](docs/product-vision.md): high-level product vision for the live agent portfolio rebalancing engine.
- [Engine Architecture](docs/architecture/engine-architecture.md): engine component architecture and domain models.
- [Live Agent Vision](docs/architecture/live-agent-vision.md): live agent orchestrator and state management.
- [Architecture Overview](docs/architecture/overview.md): high-level system boundaries and flow.
- [User Guide](docs/guides/user-guide.md): how to use the engine and CLI.
- [CLI Reference](docs/cli/cli-reference.md): command syntax, options, output, and errors.
- [Decision Records (ADRs)](docs/decisions/index.md): chronological log of architecture and design decisions.
- [Developer Guide](docs/guides/developer-guide.md): repository structure, architecture, tests, and workflows.
- [Strategy Extension Guide](docs/guides/adding-rebalancing-strategies.md): how to add or extend strategies safely.

Root files:
- [Build journey](BUILD_JOURNEY.md): iteration history.
- [AGENTS.md](AGENTS.md): repository rules for AI-assisted development.

## Project Structure

```text
src/
  audit/        Audit record generation and output rounding
  cli/          Offline CLI parser, commands, input loading, rendering, help
  core/         Valuation, drift, cash flows, trades, simulation, orchestration
  explanation/  Deterministic recommendation explanations
  models/       Domain interfaces
  runner/       Scenario runner and expectation validation
  strategy/     Threshold, calendar, and manual trigger strategies
tests/
  fixtures/     Synthetic scenario and expectation manifests
docs/
  audits/       Audit reports
  cli/          CLI design and reference
  guides/       User and developer guides
  plans/        Implementation plans
  prd/          Product requirement docs
  roadmap/      Roadmap
```

## Development Discipline

Keep changes small and testable. For meaningful domain, architecture, API, CLI, fixture, audit, explanation, or documentation decisions, record an **Architecture Decision Record (ADR)** in `docs/decisions/` and link it from `BUILD_JOURNEY.md`. New engine behavior should be exposed through the CLI or explicitly documented as not exposed.


&copy; 2026 Johan Hellman. All rights reserved.
