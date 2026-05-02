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
- `holding_outside_universe`: Portfolio holds TSLA while target allocation only includes AAPL. Expected result: TSLA is treated as target weight zero and proposed for sale in full-reset trade generation.
- `calendar_due`: Calendar strategy with an evaluation date on or after the next rebalance date. Expected result: calendar trigger, full-reset proposal, and calendar strategy metadata in audit output.
- `calendar_not_due`: Calendar strategy with an evaluation date before the next rebalance date. Expected result: no trigger, no trades, and calendar strategy metadata in audit output.
- `threshold_boundary_target`: Threshold strategy with `executionTargetMode: "boundary"`. Expected result: trade to the nearest absolute tolerance boundary instead of fully resetting to target.

## Fixture Assumptions

- Prices, holdings, account IDs, and target weights are synthetic.
- All assets are assumed to settle in one base currency.
- Fractional quantities are allowed in MVP proposal output.
- Cash is included in total portfolio value but is not represented as a target asset.
- Negative cash is not represented as a reusable fixture because Slice 6 treats it as invalid for trade proposal generation and tests it inline.
- `strategyType` defaults to `threshold` when omitted for backward compatibility.
- Calendar strategy uses caller-supplied date strings in policy configuration. It does not read system time and does not model holidays or business-day calendars.
- Boundary-target execution currently uses absolute tolerance bands only. Full transaction-cost-aware no-trade-region optimization remains out of scope.
- `scenario-expectations.json` is an expected-status manifest for runner regression checks. It records which scenarios should succeed or error and the expected error text for invalid scenarios.
