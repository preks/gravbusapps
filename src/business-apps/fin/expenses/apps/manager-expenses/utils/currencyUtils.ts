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
 * Get currency symbol based on currency code
 * @param currencyCode - The currency code (e.g., 'EUR', 'USD', 'GBP')
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const currencyMap: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'CHF': 'CHF',
    'RON': 'RON',
    'HUF': 'Ft',
    'CZK': 'Kč',
    'PLN': 'zł',
    'BGN': 'лв',
    'HRK': 'kn',
    'DKK': 'kr',
    'SEK': 'kr',
    'NOK': 'kr',
    'ISK': 'kr',
    'RSD': 'дин',
    'ALL': 'L',
    'MKD': 'ден',
    'MDL': 'L',
    'UAH': '₴',
    'GEL': '₾',
    'AMD': '֏',
    'AZN': '₼',
    'BYN': 'Br',
    'KZT': '₸',
    'KGS': 'с',
    'TJS': 'ЅМ',
    'TMT': 'T',
    'UZS': 'so\'m',
    'MNT': '₮',
    'CNY': '¥',
    'JPY': '¥',
    'KRW': '₩',
    'INR': '₹',
    'THB': '฿',
    'VND': '₫',
    'IDR': 'Rp',
    'MYR': 'RM',
    'SGD': 'S$',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'PHP': '₱',
    'BRL': 'R$',
    'ARS': '$',
    'CLP': '$',
    'COP': '$',
    'MXN': '$',
    'PEN': 'S/',
    'UYU': '$',
    'VEF': 'Bs',
    'ZAR': 'R',
    'NGN': '₦',
    'EGP': 'E£',
    'MAD': 'MAD',
    'TND': 'TND',
    'TRY': '₺',
    'ILS': '₪',
    'QAR': 'QR',
    'SAR': 'ر.س',
    'AED': 'د.إ',
    'KWD': 'د.ك',
    'BHD': '.د.ب',
    'OMR': 'ر.ع.',
    'JOD': 'د.ا',
    'LBP': 'ل.ل',
    'SYP': 'ل.س',
    'IRR': '﷼',
    'AFN': '؋',
    'PKR': '₨',
    'BDT': '৳',
    'LKR': 'Rs',
    'NPR': '₨',
    'MMK': 'K',
    'LAK': '₭',
    'KHR': '៛',
    'MOP': 'MOP$',
    'BND': 'B$',
    'XOF': 'CFA',
    'XAF': 'FCFA',
    'XPF': 'CFP',
    'AUD': 'A$',
    'NZD': 'NZ$',
    'CAD': 'C$',
    'RUB': '₽'
  };
  
  return currencyMap[currencyCode.toUpperCase()] || currencyCode;
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
  
  return `${currencyCode} ${formattedAmount}`;
};
