import type { ComponentType } from 'react'

/**
 * Format type for KPI values
 */
export type KPIFormat = 'number' | 'currency' | 'percentage' | 'duration' | 'multiplier'

/**
 * Single KPI definition with display configuration
 */
export interface KPIDefinition {
  /** Unique key for this KPI */
  key: string
  /** Display title */
  title: string
  /** Field name in the data object */
  field: string
  /** Icon component to display */
  icon: ComponentType
  /** Color for the KPI card (hex or CSS variable) */
  color: string
  /** How to format the value */
  format: KPIFormat
  /** Description text below the value */
  description: string
  /** Display order (lower numbers first) */
  order: number
  /** Responsive span configuration for grid layout */
  span?: {
    xs?: number
    sm?: number
    lg?: number
  }
  /** Trend subtitle (e.g. vs last quarter). Defaults in InvestmentKPICards when omitted. */
  trendDescription?: string
}

/**
 * Complete KPI configuration for a tab/section
 */
export interface KPIConfig {
  /** List of KPI definitions */
  kpis: KPIDefinition[]
  /** Human-readable name for this configuration */
  name: string
  /** Description of what this KPI set represents */
  description: string
}

/**
 * Base interface for KPI data structures
 * All specific KPI data types should extend this
 */
export interface BaseKPIData {
  totalInvestments: number
}

/** Investment View tab KPI row (count-only; used in InvestmentView only). */
export interface InvestmentViewKPIData extends BaseKPIData {
  activeInvestments: number
  newThisQuarter: number
  newThisYear: number
}

/**
 * Equity tab KPI data structure
 */
export interface EquityKPIData extends BaseKPIData {
  totalInvestments: number
  totalAmountInvested: number
  portfolioMoic: number
  averageDuration: number
}

/**
 * Liquid Fund tab KPI data structure
 */
export interface LiquidFundKPIData extends BaseKPIData {
  totalInvestments: number
  averageInvestmentValue: number
  activeInvestments: number
  totalAmountInvested: number
}

/**
 * Real Estate tab KPI data structure
 */
export interface RealEstateKPIData extends BaseKPIData {
  totalInvestments: number
  totalAmountInvested: number
  totalMarketValue: number
  averageOccupancyRate: number
}

/**
 * Generic KPI comparison structure with current and previous period data
 */
export interface KPIComparison<T extends BaseKPIData> {
  current: T
  previous: T
}

/**
 * Validation result for KPI data
 */
export interface KPIValidationResult {
  isValid: boolean
  missingFields: string[]
  extraFields: string[]
}
