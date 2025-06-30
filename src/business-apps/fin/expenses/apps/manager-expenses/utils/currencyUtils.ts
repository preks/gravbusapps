/**
 * Utility functions for currency formatting
 */

/**
 * Format a number with thousand separators and fixed decimal places
 * Uses German locale formatting (dots for thousands, commas for decimals)
 * @param amount - The amount to format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted amount string
 */
export const formatAmount = (amount: number | null | undefined, decimalPlaces = 2): string => {
  if (amount === null || amount === undefined) {
    return '0,00';
  }
  
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);
};
