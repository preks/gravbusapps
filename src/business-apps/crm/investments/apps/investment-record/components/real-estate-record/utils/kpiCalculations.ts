import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';

export interface CalculatedRealEstateKPIs {
  roi_percentage: number | null;
  multiple_of_invested_capital: number | null;
  annual_return_percentage: number | null;
  ownership_value: number | null;
  years_held: number | null;
  rental_yield: number | null;
  occupancy_rate: number | null;
  cap_rate: number | null;
}

/**
 * Calculate real estate KPIs on the fly from GraphQL investment data
 */
export const calculateRealEstateKPIs = (realEstateData: RealEstateInvestmentData): CalculatedRealEstateKPIs => {
  const investment = realEstateData.investment;
  
  // Calculate ROI: ((Market Value - Initial Investment) / Initial Investment) * 100
  const roi_percentage = 
    investment.investmentMarketValue && investment.initialInvestmentAmount && investment.initialInvestmentAmount > 0
      ? ((investment.investmentMarketValue - investment.initialInvestmentAmount) / investment.initialInvestmentAmount) * 100
      : null;

  // Calculate Multiple of Invested Capital: Market Value / Total Investment Amount
  const multiple_of_invested_capital = 
    investment.investmentMarketValue && investment.totalInvestmentAmount && investment.totalInvestmentAmount > 0
      ? investment.investmentMarketValue / investment.totalInvestmentAmount
      : null;

  // Calculate years held
  const years_held = investment.acquisitionDate 
    ? Math.max(0, (new Date().getTime() - new Date(investment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  // Calculate annual return: ((Market Value / Initial Investment)^(1/years)) - 1) * 100
  const annual_return_percentage = 
    investment.investmentMarketValue && 
    investment.initialInvestmentAmount && 
    investment.initialInvestmentAmount > 0 && 
    years_held && 
    years_held > 0
      ? (Math.pow(investment.investmentMarketValue / investment.initialInvestmentAmount, 1 / years_held) - 1) * 100
      : null;

  // Calculate ownership value: Market Value * Stake Percentage
  const ownership_value = 
    investment.investmentMarketValue && investment.stakePercentage
      ? investment.investmentMarketValue * (investment.stakePercentage / 100)
      : investment.investmentMarketValue; // Fallback to full market value if no stake percentage

  // Calculate rental yield: (Annual Rental Income / Property Value) * 100
  // Note: This would need annual rental income data, which isn't in current schema
  // For now, we'll calculate based on market value as placeholder
  const rental_yield = null; // TODO: Add when rental income data is available

  // Get occupancy rate from real estate specific data
  const occupancy_rate = realEstateData.realEstateInvestment?.occupancyPercent ?? null;

  // Calculate Cap Rate: (Net Operating Income / Property Value) * 100
  // Simplified: use actualAnnualExpenses (negative proxy for NOI)
  const annualExpenses = realEstateData.realEstateInvestment?.actualAnnualExpenses;
  const cap_rate = 
    annualExpenses !== undefined && annualExpenses !== null && investment.investmentMarketValue && investment.investmentMarketValue > 0
      ? ((annualExpenses * -1) / investment.investmentMarketValue) * 100
      : null;

  return {
    roi_percentage,
    multiple_of_invested_capital,
    annual_return_percentage,
    ownership_value: ownership_value ?? null,
    years_held,
    rental_yield,
    occupancy_rate,
    cap_rate
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

/**
 * Helper function to safely format currency values
 */
export const formatKPICurrency = (amount: number | null, currency?: { code: string } | null): string => {
  if (!amount && amount !== 0) return 'N/A';
  const currencyCode = currency?.code || 'EUR';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}; 