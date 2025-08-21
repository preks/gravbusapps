/**
 * Number and currency formatting helpers used across apps
 * - Compact formatting: 1,200 -> 1.2K, 5,000,000 -> 5M, etc.
 * - Currency compact formatting with provided currency code
 *
 * Convention: K (thousand), M (million), B (billion), T (trillion)
 * Based on common product analytics conventions (e.g., YouTube, financial dashboards).
 */

export const formatCompactNumber = (value: number | null | undefined, maximumFractionDigits: number = 1): string => {
  if (value === null || value === undefined || !isFinite(value as number)) return '0';

  const abs = Math.abs(value as number);
  const sign = (value as number) < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(maximumFractionDigits)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(maximumFractionDigits)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(maximumFractionDigits)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(maximumFractionDigits)}K`;
  }

  // For small numbers, show without abbreviation
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value as number);
};

export const formatCompactCurrency = (
  amount: number | null | undefined,
  currencyCode: string = 'USD',
  maximumFractionDigits: number = 1
): string => {
  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(0);
  }

  const abs = Math.abs(amount as number);
  const sign = (amount as number) < 0 ? '-' : '';

  const format = (num: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits, minimumFractionDigits: 0 }).format(num);

  if (abs >= 1_000_000_000_000) return `${sign}${format(abs / 1_000_000_000_000)}T`;
  if (abs >= 1_000_000_000) return `${sign}${format(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${format(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${format(abs / 1_000)}K`;

  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(amount as number);
};


