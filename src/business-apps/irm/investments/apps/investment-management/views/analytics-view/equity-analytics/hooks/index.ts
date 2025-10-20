export { useEquityChartData } from './useEquityChartData'
export { useEquityKPIIntegration } from './useEquityKPIIntegration'
export { useEquityAvailableCurrencies } from './useEquityAvailableCurrencies'
export type { CurrencyOption } from './useEquityAvailableCurrencies'

// Combined hooks with GraphQL aliases - optimized to avoid N+1 queries
export { useEquityRoleDistributionCombined } from './useEquityRoleDistributionCombined'
export type { EquityRoleDistributionCombinedIntegration } from './useEquityRoleDistributionCombined'
export { useEquityStatusDistributionCombined } from './useEquityStatusDistributionCombined'
export type { EquityStatusDistributionCombinedIntegration } from './useEquityStatusDistributionCombined'
export { useEquityStakeTypeDistributionCombined } from './useEquityStakeTypeDistributionCombined'
export type { EquityStakeTypeDistributionCombinedIntegration } from './useEquityStakeTypeDistributionCombined'
export { useEquityInvestmentTypeDistributionCombined } from './useEquityInvestmentTypeDistributionCombined'
export type { EquityInvestmentTypeDistributionCombinedIntegration } from './useEquityInvestmentTypeDistributionCombined'

// Timeline aggregate hook - optimized server-side timeline data
export { useEquityTimelineAggregate } from './useEquityTimelineAggregate'
export type { EquityTimelineAggregateIntegration, TimelineChartData } from './useEquityTimelineAggregate'

// Top companies hook - optimized server-side top companies by valuation
export { useEquityTopCompanies } from './useEquityTopCompanies'
export type { EquityTopCompaniesIntegration } from './useEquityTopCompanies'

// Performance analysis hook - optimized server-side performance data
export { useEquityPerformanceData } from './useEquityPerformanceData'
export type { EquityPerformanceDataIntegration } from './useEquityPerformanceData'
