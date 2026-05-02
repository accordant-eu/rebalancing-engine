import Decimal from 'decimal.js';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40,
});

export interface NumericRoundingPolicy {
  priceDecimalPlaces: number;
  quantityDecimalPlaces: number;
  moneyDecimalPlaces: number;
  weightDecimalPlaces: number;
  driftDecimalPlaces: number;
  turnoverDecimalPlaces: number;
}

export const INTERNAL_DECIMAL_PRECISION = 28;

export const OUTPUT_ROUNDING_POLICY: NumericRoundingPolicy = {
  priceDecimalPlaces: 6,
  quantityDecimalPlaces: 8,
  moneyDecimalPlaces: 6,
  weightDecimalPlaces: 10,
  driftDecimalPlaces: 10,
  turnoverDecimalPlaces: 10,
};

export const CALCULATION_EPSILON = 1e-10;

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function decimalAbs(value: number): number {
  return toDecimal(value).abs().toNumber();
}

export function decimalDifference(left: number, right: number): number {
  return toDecimal(left).minus(right).toNumber();
}

export function isWithinEpsilon(value: number, epsilon = CALCULATION_EPSILON): boolean {
  return toDecimal(value).abs().lte(epsilon);
}

export function roundNumber(value: number, decimalPlaces: number): number {
  return toDecimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}

export function formatFixed(value: number, decimalPlaces: number): string {
  return toDecimal(value).toDecimalPlaces(decimalPlaces).toFixed(decimalPlaces);
}

export function roundMoney(value: number): number {
  return roundNumber(value, OUTPUT_ROUNDING_POLICY.moneyDecimalPlaces);
}

export function roundPrice(value: number): number {
  return roundNumber(value, OUTPUT_ROUNDING_POLICY.priceDecimalPlaces);
}

export function roundQuantity(value: number): number {
  return roundNumber(value, OUTPUT_ROUNDING_POLICY.quantityDecimalPlaces);
}

export function roundWeight(value: number): number {
  return roundNumber(value, OUTPUT_ROUNDING_POLICY.weightDecimalPlaces);
}

export function roundDrift(value: number): number {
  return roundNumber(value, OUTPUT_ROUNDING_POLICY.driftDecimalPlaces);
}

export function roundTurnover(value: number): number {
  return roundNumber(value, OUTPUT_ROUNDING_POLICY.turnoverDecimalPlaces);
}
