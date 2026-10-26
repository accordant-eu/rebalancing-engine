const INSTRUMENT_METADATA: Record<string, { name: string; ticker: string }> = {
  'US0378331005:XNAS:USD': { name: 'Apple Inc.', ticker: 'AAPL' },
  'US5949181045:XNAS:USD': { name: 'Microsoft Corp.', ticker: 'MSFT' },
  'US38259P5089:XNAS:USD': { name: 'Alphabet Inc.', ticker: 'GOOG' },
};

export const formatInstrumentLabel = (id: string): string => {
  if (INSTRUMENT_METADATA[id]) {
    return `${INSTRUMENT_METADATA[id].name} (${INSTRUMENT_METADATA[id].ticker})`;
  }
  if (id.includes('US0378331005') || id.includes('AAPL')) return 'Apple Inc. (AAPL)';
  if (id.includes('US5949181045') || id.includes('MSFT')) return 'Microsoft Corp. (MSFT)';
  if (id.includes('US38259P5089') || id.includes('GOOG')) return 'Alphabet Inc. (GOOG)';
  return id;
};

export function formatCompactCurrency(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
