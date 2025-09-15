// Liquidity Forecast Types for Real Estate Investments

export interface LiquidityForecastData {
  years: number[];
  balancedCashflowDate: string;
  amounts: (number | string)[];
  balancedAmount: number | string;
}

export interface LiquidityForecastEntry {
  year: number;
  amount: number | string;
}

// Helper function to parse liquidity forecast from JSON data
export const parseLiquidityForecast = (liquidityForecast: any): LiquidityForecastData | null => {
  if (!liquidityForecast) {
    return null;
  }

  try {
    // Handle case where data is already parsed
    const data = typeof liquidityForecast === 'string' 
      ? JSON.parse(liquidityForecast) 
      : liquidityForecast;

    // Extract years and amounts from the data structure
    // This structure should match what's stored in the database
    if (data && typeof data === 'object') {
      const {
        years,
        balancedCashflowDate,
        amounts,
        balancedAmount
      } = data;

      // Only return data if we have valid years and amounts
      if (Array.isArray(years) && years.length > 0 && 
          Array.isArray(amounts) && amounts.length > 0 &&
          balancedCashflowDate && balancedAmount) {
        return {
          years,
          balancedCashflowDate,
          amounts,
          balancedAmount
        };
      }
    }

    return null;
  } catch (error) {
    // Error parsing liquidity forecast data
    return null;
  }
};

// Helper function to format currency amounts
export const formatLiquidityAmount = (amount: number | string, currency = 'EUR'): string => {
  if (typeof amount === 'string') {
    return amount;
  }

  if (typeof amount === 'number' && amount > 0) {
    // Format as millions
    const millions = amount / 1000000;
    return `${millions.toFixed(1)} Mio. ${currency}`;
  }

  return 'xxx Mio.';
};
