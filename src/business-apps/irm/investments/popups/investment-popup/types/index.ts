import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Scope constants
export const INVESTMENT_POPUP_SCOPES = {
  TILE: 'tile', // Legacy - kept for backward compatibility
  TEXT: 'text', // NEW - text tiles for investmentKpiTilesUpdate
  KPI: 'kpi', // NEW - KPI tiles for investmentKpiTilesUpdate
  TABLE: 'table', // Future - table tiles
  CHART: 'chart', // Future - chart tiles
  EXIT: 'exit',
  STATUS: 'status',
  LIQUIDITY: 'liquidity',
  PPMFORECAST: 'ppmforecast',
  KPI_FORECAST: 'kpiforecast' // KPI forecasts (MOIC/IRR) for investmentKpiForecastUpdate - renamed to avoid conflict
} as const

export type InvestmentPopupScope = (typeof INVESTMENT_POPUP_SCOPES)[keyof typeof INVESTMENT_POPUP_SCOPES]

// Main popup props interface
export interface InvestmentPopupProps extends BusinessAppContextProps {
  /** Function to call when popup should be closed */
  onClose: () => void
  /** Function to call when data is saved successfully */
  onSave?: (scope: InvestmentPopupScope, data: any) => void
}

// Tile component specific props
export interface InvestmentTileComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (tileKey: string, tileValue: string) => void
  tileKey: string
}

// Exit component specific props
export interface InvestmentExitComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (plannedExit: boolean, plannedExitDate: string | null) => void
}

// Status component specific props
export interface InvestmentStatusComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (statusRef: string) => void
}

// Liquidity component specific props
export interface InvestmentLiquidityComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (liquidityPreferences: LiquidityPreferenceItem[]) => void
}

// PPM Forecast component specific props
export interface InvestmentPpmForecastComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (forecasts: PpmForecastItem[]) => void
}

// KPI component specific props
export interface InvestmentKpiComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (kpiKey: string, kpiValue: string) => void
  kpiKey: string
}

// Form data interfaces
export interface TileFormData {
  tileValue: string
}

export interface ExitFormData {
  plannedExit: boolean
  plannedExitDate: string | null
}

export interface StatusFormData {
  statusRef: string
}

export interface LiquidityPreferenceItem {
  id?: string // For internal tracking (not stored in DB)
  preference: string
  interestMultiple: string
  amount: string
}

export interface LiquidityFormData {
  liquidityPreferences: LiquidityPreferenceItem[]
}

export interface PpmForecastItem {
  id?: string // For internal tracking (not stored in DB)
  year: string
  turnover?: string // Optional - can be empty
  ebitda?: string // Optional - can be empty
}

export interface PpmForecastFormData {
  forecasts: PpmForecastItem[]
}

export interface KpiFormData {
  kpiValue: string
}

// Investment tiles interface
export interface InvestmentTiles {
  [key: string]: string
}
