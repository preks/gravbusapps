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