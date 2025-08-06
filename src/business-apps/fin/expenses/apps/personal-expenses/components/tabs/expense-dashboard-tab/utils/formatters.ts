import { formatNumberFunction } from '@/common/utils/windowUtils';

// Helper function to format numbers using the global lowcoder function
export const formatNumber = (value: number, format = '0,0.00[,]00'): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  // The global function expects a string, so we convert the number.
  return formatNumberFunction(String(value), format);
};

export const formatCurrency = (value: number): string => {
  const formattedValue = formatNumber(value);
  return `€${formattedValue} `;
};

// Helper function to calculate percentage change
export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};


