# rebalancing-engine

Generic deterministic portfolio rebalancing engine in TypeScript/Node.js. Originally built as an offline calculation core, it now features a fully autonomous multi-tenant SaaS platform and Live Agent capable of continuous drift monitoring, real-time paper trading via Alpaca, SQLite state persistence, batch evaluation queue workers, REST APIs with SSE telemetry, and a persona-based React dashboard.

## Current Status (v0.9.0 Multi-Tenant Platform)

The project consists of a deterministic calculation core wrapped inside an autonomous, stateful Orchestrator agent and multi-tenant REST API server.

**Core Capabilities (Deterministic Math & Overlays):**
- Portfolio valuation from holdings, cash, settled cash flows, and prices (`decimal.js`).
- Threshold, calendar due-date, manual forced-rebalance, and tax-aware trigger strategies.
- Full-reset, boundary-band, and deposit-allocation (`REBALANCING`, `CURRENT_WEIGHT`, `FIXED_TARGET`) trade proposals.
- Execution overlays: Tax-Loss Harvesting (TLH), UK Bed-and-Breakfasting (30-day rule), exclusions, and concentration caps.
- Corporate actions processing: forward/reverse stock splits, cash dividends, and mergers with tax-lot basis preservation.
- Dynamic Projected Gradient Descent risk optimizer for Minimum Variance and Efficient Frontier mandates.
- Immutable, deterministic JSON audit trails stored in SQLite.

**Platform & Live Agent Capabilities:**
- Embedded multi-tenant `better-sqlite3` storage for portfolios, models, assets, tenants, and audit logs.
- `MandateSchedulerService` for autonomous calendar mandate scanning and execution queue dispatch.
- `BatchEvaluationWorker` with throttled batch consumption and subscriber fan-out.
- `AlpacaBrokerAdapter` for fetching live portfolio state and submitting real trades (Paper Trading).
- `CircuitBreaker` safety middleware with strict gross notional and order count limits.
- Reconciliation Pause Strategy to safely halt evaluations while broker orders are pending.
- Express 5 REST API with signed JWT authentication, tenant API keys (`sk_live_*`), and SSE event streaming.
- React 19 / Tailwind v4 Command Center dashboard with persona layouts (Advisor, Compliance, Tenant Admin, Superadmin).

For production setup, see [DEPLOYMENT.md](DEPLOYMENT.md).

See the roadmap in [docs/roadmap/rebalancing-engine-roadmap.md](docs/roadmap/rebalancing-engine-roadmap.md).

## Quick Start

Prerequisites:

- Node.js >= 24.0.0
- npm >= 10

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
  api/          Express REST API, SSE streaming, authentication, routes, webhooks
  audit/        Audit record generation and SQLite/file persistence
  broker/       Alpaca broker adapters and order status reconciliation
  cli/          CLI commands, live agent runner, input loading, rendering
  core/         Valuation, drift, cash flows, trades, overlays, corporate actions, simulation
  db/           better-sqlite3 schema, migrations, and repository classes
  explanation/  Deterministic recommendation explanations
  models/       Domain interfaces and schemas
  notifications/Slack alerts and operational messaging
  optimizer/    Projected Gradient Descent dynamic risk optimizer solver
  orchestrator/ Continuous loop, mandate scheduler, batch evaluator, and circuit breakers
  runner/       Scenario runner and expectation validation
  services/     Telemetry metrics and background broker synchronization
  strategy/     Threshold, calendar, manual, and tax-aware trigger strategies
web/            React 19 / Tailwind v4 Command Center dashboard (npm workspace)
tests/          Jest backend unit/integration tests and scenario fixtures
docs/           Architecture, ADRs, PRDs, roadmaps, guides, audits, and daily iteration logs
```

## Development Discipline

Keep changes small and testable. For meaningful domain, architecture, API, CLI, fixture, audit, explanation, or documentation decisions, record an **Architecture Decision Record (ADR)** in `docs/decisions/` and link it from `BUILD_JOURNEY.md`. New engine behavior should be exposed through the CLI or explicitly documented as not exposed.


&copy; 2026 Johan Hellman. All rights reserved.
