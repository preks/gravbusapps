/**
 * Extract currency code from API format (Currency:v1:EUR -> EUR)
 */
export const extractCurrencyCode = (currencyId: string): string => {
  if (!currencyId) return 'EUR';
  const parts = currencyId.split(':');
  return parts[parts.length - 1] || 'EUR';
};

/**
 * Format currency value for display
 */
export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
