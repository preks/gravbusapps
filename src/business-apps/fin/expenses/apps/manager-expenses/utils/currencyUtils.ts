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

/**
 * Interface for currency count data
 */
export interface CurrencyCount {
  code: string;
  count: number;
  totalAmount: number;
}

/**
 * Determines the most used currency from a list of financial transactions
 * 
 * @param transactions - Array of objects containing currency information
 * @param currencyKey - The key in each transaction object that contains the currency code
 * @param amountKey - Optional key for the amount in each transaction
 * @param defaultCurrency - Default currency to return if no transactions exist
 * @returns The most used currency code
 */
export const getMostUsedCurrency = <T extends Record<string, any>>(
  transactions: T[],
  currencyKey: keyof T,
  amountKey?: keyof T,
  defaultCurrency: string = 'EUR'
): string => {
  if (!transactions || transactions.length === 0) {
    return defaultCurrency;
  }

  // Count occurrences of each currency
  const currencyCounts: Record<string, CurrencyCount> = {};
  
  transactions.forEach(transaction => {
    const currencyCode = String(transaction[currencyKey] || defaultCurrency);
    const amount = amountKey && typeof transaction[amountKey] === 'number' 
      ? transaction[amountKey] as number 
      : 1;
    
    if (!currencyCounts[currencyCode]) {
      currencyCounts[currencyCode] = { 
        code: currencyCode, 
        count: 0,
        totalAmount: 0 
      };
    }
    
    currencyCounts[currencyCode].count += 1;
    currencyCounts[currencyCode].totalAmount += amount;
  });
  
  // Convert to array for sorting
  const currencyCountArray = Object.values(currencyCounts);
  
  // First try to find the currency with the most transactions
  if (currencyCountArray.length > 0) {
    // Sort by count (descending), then by total amount (descending)
    currencyCountArray.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.totalAmount - a.totalAmount;
    });
    
    return currencyCountArray[0].code;
  }
  
  return defaultCurrency;
};

/**
 * Format amount with currency code
 * @param amount - The amount to format
 * @param currencyCode - The currency code
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted amount with currency code
 */
export const formatCurrency = (amount: number | null | undefined, currencyCode: string = 'EUR', decimalPlaces = 2): string => {
  if (amount === null || amount === undefined) {
    return `${currencyCode} 0,00`;
  }
  
  const formattedAmount = formatAmount(amount, decimalPlaces);
  
  // Always use currency code (ISO 4217) instead of symbol
  return `${currencyCode} ${formattedAmount}`;
};
