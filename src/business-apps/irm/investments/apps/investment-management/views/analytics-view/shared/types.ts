/**
 * Shared Analytics Types
 * Common interfaces used across all analytics components
 */

import type {
  Investment,
  EquityInvestment,
  LiquidFundInvestment,
  RealEstateInvestment
} from '@/common/data/investment/types/investmentTypes'

/**
 * Base interface for all investment summaries
 */
export interface BaseInvestmentSummary {
  id: string
  investment: Investment
  displayName: string
  currencyCode: string | null
  statusColor: string
  isActive: boolean
}

/**
 * Equity Investment Summary
 */
export interface EquityInvestmentSummary extends BaseInvestmentSummary {
  equityInvestment?:
    | EquityInvestment
    | { id: string; ebitdaAmount: number; marketValue: number; turnoverAmount: number }
  stakeTypeColor: string
  riskLevelColor: string
  roi: number
  ebitdaMargin: number
  roleColor: string
}

/**
 * Liquid Fund Investment Summary
 */
export interface LiquidFundInvestmentSummary extends BaseInvestmentSummary {
  liquidFundInvestment?: LiquidFundInvestment
  phaseColor: string
  riskColor: string
  fundTypeName: string
  fundTypeColor: string
  daysToMaturity: number
  isNearMaturity: boolean
}

/**
 * Real Estate Investment Summary
 */
export interface RealEstateInvestmentSummary extends BaseInvestmentSummary {
  realEstateInvestment?: RealEstateInvestment
  riskLevelColor: string
  occupancyRate: number
  propertyType: string
  location: string
}

/**
 * Base KPI Structure for all investment types
 */
export interface BaseInvestmentKPIs {
  totalInvestments: number
  totalAmountInvested: number
  totalMarketValue: number
}

/**
 * KPI structure with previous period comparison
 */
export interface InvestmentKPIsWithComparison {
  current: BaseInvestmentKPIs
  previous: BaseInvestmentKPIs
}

/**
 * Equity Investment specific KPIs
 */
export interface EquityInvestmentKPIs extends BaseInvestmentKPIs {
  averageCompanyValuation: number
}

/**
 * Liquid Fund Investment specific KPIs
 */
export interface LiquidFundInvestmentKPIs extends BaseInvestmentKPIs {
  averageInvestmentValue: number
  averageMarketValue: number
  totalFundValue: number
}

/**
 * Real Estate Investment specific KPIs
 */
export interface RealEstateInvestmentKPIs extends BaseInvestmentKPIs {
  averageOccupancyRate: number
  totalUnits: number
  totalAnnualExpenses: number
}

/**
 * Portfolio Overview KPIs
 */
export interface PortfolioOverviewKPIs extends BaseInvestmentKPIs {
  totalPortfolioValue: number
  activeInvestments: number
}
