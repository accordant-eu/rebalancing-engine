import { TaxLot, ProposedLotAllocation } from '../models/domain';
import { toDecimal } from './numeric';

export interface Section104Pool {
  totalQuantity: number;
  totalCost: number;
  averageUnitCost: number;
}

/**
 * Calculates the Section 104 Holding Pool for an asset under UK HMRC Capital Gains rules.
 * All historical shares are aggregated into a single pooled average cost basis.
 */
export function calculateSection104Pool(taxLots: TaxLot[]): Section104Pool {
  let totalQuantity = toDecimal(0);
  let totalCost = toDecimal(0);

  for (const lot of taxLots) {
    if (lot.quantity <= 0 || !Number.isFinite(lot.quantity)) continue;
    const qty = toDecimal(lot.quantity);
    const unitCost = toDecimal(lot.unitCost ?? 0);
    totalQuantity = totalQuantity.plus(qty);
    totalCost = totalCost.plus(qty.mul(unitCost));
  }

  const averageUnitCost = totalQuantity.gt(0)
    ? totalCost.div(totalQuantity).toNumber()
    : 0;

  return {
    totalQuantity: totalQuantity.toNumber(),
    totalCost: totalCost.toNumber(),
    averageUnitCost,
  };
}

/**
 * Allocates tax lots under UK Section 104 rules, using the pooled average unit cost.
 */
export function allocateSection104SellLots(
  lots: TaxLot[],
  sellQuantity: number,
  estimatedPrice: number,
): ProposedLotAllocation[] {
  const pool = calculateSection104Pool(lots);
  let remainingQuantity = toDecimal(sellQuantity);
  const allocations: ProposedLotAllocation[] = [];

  // Draw down sequentially from existing lots while applying the pooled average unit cost
  for (const lot of lots) {
    if (remainingQuantity.lte(1e-7)) break;

    const lotQty = toDecimal(lot.quantity);
    const allocatedQty = remainingQuantity.lte(lotQty) ? remainingQuantity : lotQty;

    allocations.push({
      lotId: lot.lotId,
      quantity: allocatedQty.toNumber(),
      estimatedValue: allocatedQty.mul(estimatedPrice).toNumber(),
      unitCost: pool.averageUnitCost,
      acquisitionDate: lot.acquisitionDate,
    });

    remainingQuantity = remainingQuantity.minus(allocatedQty);
  }

  if (remainingQuantity.gt(1e-7)) {
    throw new Error('Tax lot quantities are insufficient for Section 104 sell allocation');
  }

  return allocations;
}

/**
 * Computes calendar day difference between two ISO date/timestamp strings (date2 - date1 in days).
 */
export function getCalendarDayDiff(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1.slice(0, 10) + 'T00:00:00Z').getTime();
  const d2 = new Date(dateStr2.slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Checks if an acquisition date falls within the statutory 30-day UK Bed-and-Breakfast window
 * relative to a disposal date (same day or up to 30 days after disposal).
 */
export function isUkBedAndBreakfastWindow(disposalDate: string, acquisitionDate: string): boolean {
  const dayDiff = getCalendarDayDiff(disposalDate, acquisitionDate);
  return dayDiff >= 0 && dayDiff <= 30;
}
