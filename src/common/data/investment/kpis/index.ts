/**
 * Investment KPI configuration and types
 *
 * - **Investment View** (`InvestmentView.tsx`) uses `INVESTMENT_VIEW_KPI_CONFIG` (count-only KPIs).
 * - **Analytics** (overview, equity, liquid fund, real estate) uses the tab-specific configs below
 *   (`OVERVIEW_KPI_CONFIG`, `EQUITY_KPI_CONFIG`, etc.) with their own data hooks.
 *
 * ```typescript
 * import { EQUITY_KPI_CONFIG } from '@/common/data/investment/kpis'
 *
 * <InvestmentKPICards config={EQUITY_KPI_CONFIG} data={current} previousData={previous} />
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
  InvestmentViewKPIData,
  KPIComparison,
  KPIValidationResult
} from './types'

// Export KPI configurations
export { OVERVIEW_KPI_CONFIG } from './overviewKpis'
export { EQUITY_KPI_CONFIG } from './equityKpis'
export { LIQUID_FUND_KPI_CONFIG } from './liquidFundKpis'
export { REAL_ESTATE_KPI_CONFIG } from './realEstateKpis'
export { INVESTMENT_VIEW_KPI_CONFIG } from './investmentViewKpis'

// Export utility functions
export { validateKPIData, formatDuration, formatKPIValue, calculateChange, validateKPIConfig } from './utils'
