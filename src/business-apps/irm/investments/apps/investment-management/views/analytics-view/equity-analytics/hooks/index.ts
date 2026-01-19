export { useEquityChartData } from './useEquityChartData'
export { useEquityKPIIntegration } from './useEquityKPIIntegration'

// Combined hooks with GraphQL aliases - optimized to avoid N+1 queries
export { useEquityRoleDistributionCombined } from './useEquityRoleDistributionCombined'
export type { EquityRoleDistributionCombinedIntegration } from './useEquityRoleDistributionCombined'
export { useEquityStatusDistributionCombined } from './useEquityStatusDistributionCombined'
export type { EquityStatusDistributionCombinedIntegration } from './useEquityStatusDistributionCombined'
export { useEquityStakeTypeDistributionCombined } from './useEquityStakeTypeDistributionCombined'
export type { EquityStakeTypeDistributionCombinedIntegration } from './useEquityStakeTypeDistributionCombined'
export { useEquityInvestmentTypeDistributionCombined } from './useEquityInvestmentTypeDistributionCombined'
export type { EquityInvestmentTypeDistributionCombinedIntegration } from './useEquityInvestmentTypeDistributionCombined'

// Independent status distribution hooks - separate queries with smart caching
export { useEquityStatusCountDistribution } from './useEquityStatusCountDistribution'
export type { EquityStatusCountDistributionIntegration } from './useEquityStatusCountDistribution'
export { useEquityStatusAmountDistribution } from './useEquityStatusAmountDistribution'
export type { EquityStatusAmountDistributionIntegration } from './useEquityStatusAmountDistribution'

// Independent stake type distribution hooks - separate queries with smart caching
export { useEquityStakeTypeCountDistribution } from './useEquityStakeTypeCountDistribution'
export type { EquityStakeTypeCountDistributionIntegration } from './useEquityStakeTypeCountDistribution'
export { useEquityStakeTypeAmountDistribution } from './useEquityStakeTypeAmountDistribution'
export type { EquityStakeTypeAmountDistributionIntegration } from './useEquityStakeTypeAmountDistribution'

// Independent investment type distribution hooks - separate queries with smart caching
export { useEquityInvestmentTypeCountDistribution } from './useEquityInvestmentTypeCountDistribution'
export { useEquityInvestmentTypeAmountDistribution } from './useEquityInvestmentTypeAmountDistribution'

// Independent distribution hooks - separate queries for count and amount (DEPRECATED - use combined hook below)
export { useEquityRoleCountDistribution } from './useEquityRoleCountDistribution'
export type { EquityRoleCountDistributionIntegration } from './useEquityRoleCountDistribution'
export { useEquityRoleAmountDistribution } from './useEquityRoleAmountDistribution'
export type { EquityRoleAmountDistributionIntegration } from './useEquityRoleAmountDistribution'

// Combined role distribution hook - fetches roles once and both count/amount data
export { useEquityRoleDistribution } from './useEquityRoleDistribution'
export type { EquityRoleDistributionIntegration } from './useEquityRoleDistribution'

// Timeline aggregate hook - optimized server-side timeline data
export { useEquityTimelineAggregate } from './useEquityTimelineAggregate'
export type { EquityTimelineAggregateIntegration, TimelineChartData } from './useEquityTimelineAggregate'

// Top companies hook - optimized server-side top companies by valuation
export { useEquityTopCompanies } from './useEquityTopCompanies'
export type { EquityTopCompaniesIntegration } from './useEquityTopCompanies'

// Performance analysis hook - optimized server-side performance data (DEPRECATED - use individual hooks below)
export { useEquityPerformanceData } from './useEquityPerformanceData'
export type { EquityPerformanceDataIntegration } from './useEquityPerformanceData'

// Independent performance analysis hooks - separate queries for each chart
export { useEquityStakeVsAmount } from './useEquityStakeVsAmount'
export { useEquityRoleVsAmount } from './useEquityRoleVsAmount'
export { useEquityConcentrationByRole } from './useEquityConcentrationByRole'

// Portfolio matrix hook - optimized server-side portfolio matrix data
export { useEquityPortfolioMatrix } from './useEquityPortfolioMatrix'
export type { PortfolioMatrixChartData } from './useEquityPortfolioMatrix'

// Investment size distribution hook - optimized server-side with fixed ranges
export { useEquityInvestmentSize } from './useEquityInvestmentSize'

// Investment duration distribution hook - optimized server-side with fixed ranges
export { useEquityInvestmentDuration } from './useEquityInvestmentDuration'
