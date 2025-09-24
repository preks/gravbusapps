import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

/**
 * Extracts currency code from API format (e.g., "Currency:v1:EUR" -> "EUR")
 */
export const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

/**
 * Formats currency value with three-character currency code after the amount
 * Uses user's locale for number formatting
 * @param amount - The amount to format
 * @param currencyId - Currency ID in API format or currency code
 * @returns Formatted string like "1,234.56 EUR"
 */
export const formatCurrency = (amount: number | undefined | null, currencyId: string = 'EUR'): string => {
  const locale = getCurrentActiveUserLocale();
  
  if (amount === undefined || amount === null || isNaN(amount)) {
    const currencyCode = extractCurrencyCode(currencyId);
    return `0 ${currencyCode}`;
  }
  
  const currencyCode = extractCurrencyCode(currencyId);
  
  // Format the number with locale-specific number formatting
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  
  return `${formattedNumber} ${currencyCode}`;
};

/**
 * Formats currency value with specific decimal places
 * @param amount - The amount to format
 * @param currencyId - Currency ID in API format or currency code
 * @param decimalPlaces - Number of decimal places to show
 * @returns Formatted string like "1,234.56 EUR"
 */
export const formatCurrencyWithDecimals = (
  amount: number | undefined | null, 
  currencyId: string = 'EUR', 
  decimalPlaces: number = 2
): string => {
  const locale = getCurrentActiveUserLocale();
  
  if (amount === undefined || amount === null || isNaN(amount)) {
    const currencyCode = extractCurrencyCode(currencyId);
    return `0 ${currencyCode}`;
  }
  
  const currencyCode = extractCurrencyCode(currencyId);
  
  // Format the number with specific decimal places
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount);
  
  return `${formattedNumber} ${currencyCode}`;
};

/**
 * Custom formatter that only abbreviates millions and billions, not thousands
 * Used for large amounts where M/B suffixes are helpful
 * @param amount - The amount to format
 * @param currencyCode - Currency code (e.g., "EUR", "USD")
 * @returns Formatted string like "€1.2M" or "€5.3B"
 */
export const formatCurrencyLarge = (amount: number | undefined, currencyCode: string = "EUR"): string => {
  if (amount === undefined || amount === null || !isFinite(amount)) return "-";
  
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (abs >= 1_000_000_000) {
    // Billions
    const formatted = new Intl.NumberFormat(getCurrentActiveUserLocale() || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(abs / 1_000_000_000);
    return `${sign}${formatted}B`;
  }
  
  if (abs >= 1_000_000) {
    // Millions
    const formatted = new Intl.NumberFormat(getCurrentActiveUserLocale() || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(abs / 1_000_000);
    return `${sign}${formatted}M`;
  }
  
  // Thousands and below - show as normal currency
  return new Intl.NumberFormat(getCurrentActiveUserLocale() || 'en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount);
}; 