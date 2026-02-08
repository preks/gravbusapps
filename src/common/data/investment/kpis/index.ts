/**
 * Investment KPI Configuration System
 *
 * This module provides centralized KPI definitions for all investment views.
 * It ensures that both the Investment View and Analytics View display the same
 * KPIs for each tab (Overview, Equity, Liquid Fund, Real Estate).
 *
 * Usage:
 * ```typescript
 * import { EQUITY_KPI_CONFIG, EquityKPIData } from '@/common/data/investment/kpis'
 *
 * // Use the config to render KPIs
 * <InvestmentKPICards
 *   config={EQUITY_KPI_CONFIG}
 *   data={currentData}
 *   previousData={previousData}
 * />
 * ```
 */

// Export types
export type {
  KPIFormat,
  KPIDefinition,
  KPIConfig,
  BaseKPIData,
  OverviewKPIData,
  EquityKPIData,
  LiquidFundKPIData,
  RealEstateKPIData,
  KPIComparison,
  KPIValidationResult
} from './types'

// Export KPI configurations
export { OVERVIEW_KPI_CONFIG } from './overviewKpis'
export { EQUITY_KPI_CONFIG } from './equityKpis'
export { LIQUID_FUND_KPI_CONFIG } from './liquidFundKpis'
export { REAL_ESTATE_KPI_CONFIG } from './realEstateKpis'
export { GENERIC_INVESTMENT_KPI_CONFIG } from './genericKpis'

// Export utility functions
export { validateKPIData, formatDuration, formatKPIValue, calculateChange, validateKPIConfig } from './utils'
