// Helper function to calculate trend
export const calculateTrend = (current: number, previous: number): { 
  value: string; 
  positive: boolean; 
  description: string 
} => {
  if (previous === 0) {
    return { 
      value: current > 0 ? "100%" : "0%", 
      positive: current >= 0, 
      description: `${current} this month vs ${previous} last month`
    };
  }
  const change = ((current - previous) / previous) * 100;
  return { 
    value: `${Math.abs(change).toFixed(1)}%`, 
    positive: change >= 0,
    description: `${current} this month vs ${previous} last month`
  };
};

// Helper function to format currency
export const formatCurrency = (amount: number, options?: {
  compact?: boolean;
  currency?: string;
}): string => {
  const { compact = false, currency = 'USD' } = options || {};
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
  }).format(amount);
};

// Helper function to format percentage
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Helper function to get trend color based on positive/negative
export const getTrendColor = (positive: boolean): string => {
  return positive ? '#10B981' : '#EF4444'; // Green for positive, red for negative
};

// Helper function to extract currency code from API format
export const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};