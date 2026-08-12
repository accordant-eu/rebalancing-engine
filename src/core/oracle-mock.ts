import { OracleOptimizationPayload, OracleOptimizationResponse } from './oracle-adapter';

export class OracleMockServer {
  public static handleOptimizationRequest(payload: OracleOptimizationPayload): OracleOptimizationResponse {
    const trades: OracleOptimizationResponse['trades'] = [];
    let washSalesPrevented = 0;
    let estimatedRealizedLoss = 0;

    for (const target of payload.targets) {
      const priceObj = payload.prices.find((p) => p.identifier === target.asset_class);
      const price = priceObj ? priceObj.price : 100;

      // Find total holdings for this target asset
      const matchingLots = payload.tax_lots.filter((l) => l.identifier === target.asset_class);
      const totalQty = matchingLots.reduce((acc, l) => acc + l.quantity, 0);
      const totalValue = totalQty * price;

      // Check if any lot has an opportunity for TLH (unitCost > current price)
      for (const lot of matchingLots) {
        if (lot.cost_basis > price) {
          const lossPerShare = lot.cost_basis - price;
          const lossAmount = lossPerShare * lot.quantity;
          if (lossAmount >= (payload.settings?.minimum_trade_size ?? 10)) {
            estimatedRealizedLoss += lossAmount;
            trades.push({
              identifier: lot.identifier,
              direction: 'SELL',
              quantity: lot.quantity,
              estimated_price: price,
              lot_id: lot.tax_lot_id,
            });
            washSalesPrevented++;
          }
        }
      }
    }

    return {
      status: 'success',
      trades,
      metrics: {
        estimated_realized_loss: Number(estimatedRealizedLoss.toFixed(2)),
        wash_sales_prevented: washSalesPrevented,
        execution_time_ms: 12,
      },
    };
  }
}
