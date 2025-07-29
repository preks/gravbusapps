// Dashboard-specific hooks
// These hooks are specific to the investments dashboard

// To be implemented in Phase 2
// export { default as useInvestmentData } from './useInvestmentData';
// export { default as useInvestmentFilters } from './useInvestmentFilters';

export { useInvestmentDataIntegration } from './useInvestmentDataIntegration';
export type { 
  EnhancedInvestment, 
  InvestmentMetrics, 
  InvestmentTypeMetrics 
} from './useInvestmentDataIntegration';