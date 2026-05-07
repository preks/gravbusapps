/**
 * Investment KPI configuration and types
 *
 * - **Investment View** (`InvestmentView.tsx`) uses `INVESTMENT_VIEW_KPI_CONFIG` (count-only KPIs).
 * - **Analytics group tabs** and dashboard summary cards use `INVESTMENT_VIEW_KPI_CONFIG`.
 *   Specialized views may still use the group-specific configs below.
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
  EquityKPIData,
  LiquidFundKPIData,
  RealEstateKPIData,
  InvestmentViewKPIData,
  KPIComparison,
  KPIValidationResult
} from './types'

// Export KPI configurations
export { EQUITY_KPI_CONFIG } from './equityKpis'
export { LIQUID_FUND_KPI_CONFIG } from './liquidFundKpis'
export { REAL_ESTATE_KPI_CONFIG } from './realEstateKpis'
export { INVESTMENT_VIEW_KPI_CONFIG } from './investmentViewKpis'

// Export utility functions
export { validateKPIData, formatDuration, formatKPIValue, calculateChange, validateKPIConfig } from './utils'
