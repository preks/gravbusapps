// Investment Group-Specific Components
// These components are only used by specific investment groups

// Overview Content Wrappers (used by recordGroupConfigurations.tsx)
export { EquityOverviewContent } from './EquityOverviewContent'
export { RealEstateOverviewContent } from './RealEstateOverviewContent'

// Equity Investment Group components
export { default as EquityInvestmentRounds } from './EquityInvestmentRounds'
export { default as EquityAnalyticsTab } from './EquityAnalyticsTab'
export { default as EquityPerformanceChart } from './EquityPerformanceChart'
export { default as ShareholderStructureChart } from './ShareholderStructureChart'
export { default as LiquidityPreferenceTable } from './LiquidityPreferenceTable'
export { default as RevenueForecastChart } from './RevenueForecastChart'
export { default as CombinedPpmChartsContainer } from './CombinedPpmChartsContainer'
export { default as KPIsAtEntryVsCurrentChart } from './KPIsAtEntryVsCurrentChart'

// Real Estate Investment Group components
export { default as RealEstateLiquidityForecast } from './RealEstateLiquidityForecast'

// Types
export type { OverviewContentProps } from './EquityOverviewContent'

// Note: These are not shared components as they contain business logic
// specific to certain investment groups and should only be used accordingly
