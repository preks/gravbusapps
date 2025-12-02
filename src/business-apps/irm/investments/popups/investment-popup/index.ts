// Main popup component
export { InvestmentPopup } from './InvestmentPopup'
export { InvestmentPopup as default } from './InvestmentPopup'

// Individual components (for direct usage if needed)
export { InvestmentTileComponent } from './components/InvestmentTileComponent'
export { InvestmentExitComponent } from './components/InvestmentExitComponent'
export { InvestmentStatusComponent } from './components/InvestmentStatusComponent'
export { InvestmentLiquidityComponent } from './components/InvestmentLiquidityComponent'
export { InvestmentPpmForecastComponent } from './components/InvestmentPpmForecastComponent'
export { RealEstateLiquidityForecastComponent } from './components/RealEstateLiquidityForecastComponent'
export { InvestmentKpiComponent } from './components/InvestmentKpiComponent'

// Types and constants
export {
  INVESTMENT_POPUP_SCOPES,
  type InvestmentPopupScope,
  type InvestmentPopupProps,
  type InvestmentTileComponentProps,
  type InvestmentExitComponentProps,
  type InvestmentStatusComponentProps,
  type InvestmentLiquidityComponentProps,
  type InvestmentPpmForecastComponentProps,
  type InvestmentLiquidityForecastComponentProps,
  type InvestmentKpiComponentProps,
  type TileFormData,
  type ExitFormData,
  type StatusFormData,
  type LiquidityFormData,
  type LiquidityPreferenceItem,
  type PpmForecastFormData,
  type PpmForecastItem,
  type KpiFormData,
  type YearAmountPair,
  type LiquidityForecastFormData,
  type LiquidityForecastData,
  type InvestmentTiles
} from './types'

// Hooks (for advanced usage)
export { useInvestmentPopupData } from './hooks/useInvestmentPopupData'
export { useInvestmentSubType } from './hooks/useInvestmentSubType'
