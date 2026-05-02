# Fixture Scenarios

All fixtures are synthetic and offline. They are designed to exercise deterministic MVP behavior without live market data, client data, or external integrations.

## Scenarios

- `on_target`: Portfolio is exactly on target. Expected result: zero drift, no trigger, no proposed trades.
- `one_asset_out_of_band`: Two-asset portfolio with AAPL overweight and MSFT underweight by 10 percentage points. Expected result: threshold trigger and offsetting sell/buy proposal.
- `multiple_assets_out_of_band`: Three-asset portfolio with AAPL overweight, MSFT underweight, and GOOG on target. Expected result: drift and proposal output remain deterministic across multiple assets.
- `positive_cash`: Portfolio has cash plus underweight invested assets. Expected result: cash is included in total portfolio value and buy proposals deploy the cash.
- `min_trade_size_issue`: Small portfolio with required trades of about 50 each and `minimumTradeSize` of 1000. Expected result from Slice 6 onward: trades are suppressed and warnings are emitted.
- `missing_price`: Portfolio contains an instrument without a price. Expected result: valuation aborts with an explicit missing-price error.
- `target_allocation_sum_error`: Target weights sum to 110%. Expected result: target validation aborts before drift or trade proposal generation.
- `invalid_strategy`: Policy contains an unsupported `strategyType`. Expected result: scenario runner reports a deterministic per-scenario strategy error.
- `invalid_cash_flow_amount`: Cash flow amount is zero. Expected result: valuation aborts with an explicit cash-flow amount error.
- `holding_outside_universe`: Portfolio holds TSLA while target allocation only includes AAPL. Expected result: TSLA is treated as target weight zero and proposed for sale in full-reset trade generation.
- `calendar_due`: Calendar strategy with an evaluation date on or after the next rebalance date. Expected result: calendar trigger, full-reset proposal, and calendar strategy metadata in audit output.
- `calendar_not_due`: Calendar strategy with an evaluation date before the next rebalance date. Expected result: no trigger, no trades, and calendar strategy metadata in audit output.
- `threshold_boundary_target`: Threshold strategy with `executionTargetMode: "boundary"`. Expected result: trade to the nearest absolute tolerance boundary instead of fully resetting to target.
- `threshold_relative_boundary_target`: Threshold strategy with `executionTargetMode: "boundary"` and `boundaryBandMode: "relative"`. Expected result: relative drift triggers a rebalance and the breached asset trades to the nearest relative tolerance boundary.
- `settled_deposit_cash_flow`: Settled deposit increases available cash before valuation. Expected result: buy proposals deploy the deposit.
- `settled_withdrawal_cash_flow`: Settled withdrawal reduces available cash before valuation. Expected result: sell proposals fund the withdrawal-created cash deficit.
- `pending_cash_flow`: Pending deposit is excluded from valuation and proposal sizing. Expected result: no cash deployment, with a structured warning and audit cash-flow summary.
- `tax_lot_fifo_sell`: A sell trade has optional tax lots on the sold holding. Expected result: aggregate sell sizing is unchanged and the sell trade includes deterministic FIFO lot allocation metadata.

## Fixture Assumptions

- Prices, holdings, account IDs, and target weights are synthetic.
- All assets are assumed to settle in one base currency.
- Fractional quantities are allowed in MVP proposal output.
- Cash is included in total portfolio value but is not represented as a target asset.
- `cashFlows` are optional. When provided, `cash` is treated as pre-flow cash; settled flows adjust available cash before valuation and pending flows are excluded from valuation and proposal sizing.
- Raw negative cash remains invalid for trade proposal generation. Negative available cash is allowed only when caused by an explicit settled withdrawal cash flow and is funded through sell proposals.
- `strategyType` defaults to `threshold` when omitted for backward compatibility.
- Calendar strategy uses caller-supplied date strings in policy configuration. It does not read system time and does not model holidays or business-day calendars.
- Boundary-target execution supports absolute bands by default and relative bands when `boundaryBandMode: "relative"` and `relativeDriftTolerance` are supplied. Relative-boundary mode rejects zero-target instruments that require a boundary trade.
- Tax-lot support is generic lot allocation metadata only. It is not tax advice, tax optimization, or jurisdiction-specific tax handling.
- Full transaction-cost-aware no-trade-region optimization remains out of scope.
- `scenario-expectations.json` is an expected-status manifest for runner regression checks. It records which scenarios should succeed or error and the expected error text for invalid scenarios.
- CLI scenario mode can read a complete scenario object or manifest from a file, or from stdin with `--scenario -` for `run` and `validate`.
- CLI batch mode reads scenario manifests from files or directories. It can write one deterministic per-scenario output file with `--output-dir`; batch stdin is not supported.
