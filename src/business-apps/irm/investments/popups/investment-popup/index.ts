// Main popup component
export { InvestmentPopup } from './InvestmentPopup'
export { InvestmentPopup as default } from './InvestmentPopup'

// Individual components (for direct usage if needed)
export { InvestmentTileComponent } from './components/InvestmentTileComponent'
export { InvestmentExitComponent } from './components/InvestmentExitComponent'
export { InvestmentStatusComponent } from './components/InvestmentStatusComponent'

// Types and constants
export {
  INVESTMENT_POPUP_SCOPES,
  type InvestmentPopupScope,
  type InvestmentPopupProps,
  type InvestmentTileComponentProps,
  type InvestmentExitComponentProps,
  type InvestmentStatusComponentProps,
  type TileFormData,
  type ExitFormData,
  type StatusFormData,
  type InvestmentTiles
} from './types'

// Hooks (for advanced usage)
export { useInvestmentPopupData } from './hooks/useInvestmentPopupData'
export { useInvestmentSubType } from './hooks/useInvestmentSubType'
