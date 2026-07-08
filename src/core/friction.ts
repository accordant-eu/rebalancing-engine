export interface FrictionModel {
  estimateCost(tradeValue: number, instrumentId: string): number;
}

export class FixedFeeModel implements FrictionModel {
  private feePerTrade: number;

  constructor(feePerTrade: number = 1.00) {
    this.feePerTrade = feePerTrade;
  }

  public estimateCost(_tradeValue: number, _instrumentId: string): number {
    return this.feePerTrade;
  }
}

export class PercentageSlippageModel implements FrictionModel {
  private slippageBps: number;

  constructor(slippageBps: number = 5) {
    this.slippageBps = slippageBps;
  }

  public estimateCost(tradeValue: number, _instrumentId: string): number {
    return tradeValue * (this.slippageBps / 10000);
  }
}
