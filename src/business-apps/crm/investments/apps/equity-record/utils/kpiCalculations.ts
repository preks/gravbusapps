import { EquityInvestmentData } from '../hooks/useEquityRecordData';

export interface CalculatedKPIs {
  roi_percentage: number | null;
  multiple_of_invested_capital: number | null;
  annual_return_percentage: number | null;
  ownership_value: number | null;
  years_held: number | null;
}

/**
 * Calculate KPIs on the fly from GraphQL investment data
 */
export const calculateEquityKPIs = (equityData: EquityInvestmentData): CalculatedKPIs => {
  const investment = equityData.investment;
  
  // Calculate ROI: ((Market Value - Initial Investment) / Initial Investment) * 100
  const roi_percentage = 
    investment.marketValue && investment.initialInvestmentAmount && investment.initialInvestmentAmount > 0
      ? ((investment.marketValue - investment.initialInvestmentAmount) / investment.initialInvestmentAmount) * 100
      : null;

  // Calculate Multiple of Invested Capital: Market Value / Total Investment Amount
  const multiple_of_invested_capital = 
    investment.marketValue && investment.totalInvestmentAmount && investment.totalInvestmentAmount > 0
      ? investment.marketValue / investment.totalInvestmentAmount
      : null;

  // Calculate years held
  const years_held = investment.acquisitionDate 
    ? Math.max(0, (new Date().getTime() - new Date(investment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  // Calculate annual return: ((Market Value / Initial Investment)^(1/years)) - 1) * 100
  const annual_return_percentage = 
    investment.marketValue && 
    investment.initialInvestmentAmount && 
    investment.initialInvestmentAmount > 0 && 
    years_held && 
    years_held > 0
      ? (Math.pow(investment.marketValue / investment.initialInvestmentAmount, 1 / years_held) - 1) * 100
      : null;

  // Calculate ownership value: Market Value * Stake Percentage
  const ownership_value = 
    investment.marketValue && investment.stakePercent
      ? investment.marketValue * (investment.stakePercent / 100)
      : investment.marketValue; // Fallback to full market value if no stake percentage

  return {
    roi_percentage,
    multiple_of_invested_capital,
    annual_return_percentage,
    ownership_value,
    years_held
  };
};

/**
 * Helper function to safely format percentage values
 */
export const formatKPIPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)}%`;
};

/**
 * Helper function to safely format multiplier values
 */
export const formatKPIMultiplier = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(2)}x`;
};

/**
 * Helper function to safely format years
 */
export const formatKPIYears = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)} years`;
}; 