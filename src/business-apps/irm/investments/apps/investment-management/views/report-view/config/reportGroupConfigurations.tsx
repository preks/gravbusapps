import type { InvestmentReportTableConfig } from '../components/shared/types'
import {
  EQUITY_TABLE_CONFIG,
  LIQUID_FUND_TABLE_CONFIG,
  REAL_ESTATE_TABLE_CONFIG
} from '../components/shared/tableConfigs'
import { transformReportsToAnalyticsData } from '../utils/liquidFundDataTransformer'
import type { SubSection } from '../utils/subSectionHelpers'

/**
 * Configuration for an investment group's report tab.
 *
 * Static, per-group values only. Dynamic derivations (columns, sortable
 * columns, filter config) are produced at render time by
 * `buildReportConfiguration` in `reportListColumnTransformer.ts` — the single
 * cascade function that mirrors `investmentListColumnTransformer.tsx`.
 */
export interface ReportGroupConfiguration {
  // Sub-section strategy
  subSectionStrategy: 'investmentTypes' | 'liquidFundTypes' | 'none'

  /**
   * Short prefix used as the filter-configuration `id` root
   * (e.g. `'equity'` → `'equity-report-filters'`).
   */
  entityPrefix: 'equity' | 'realEstate' | 'liquidFund' | 'generic'

  // Optional data transformation (Liquid Fund analytics pivot)
  dataTransformer?: (reports: any[]) => any[]

  // Table column / cell configuration
  tableConfig: InvestmentReportTableConfig

  /**
   * Resolve the locked sub-section when the panel is rendered inside an
   * investment record's Reports tab.
   *
   * Receives the full investment record and any group-specific data and
   * returns the section the panel should lock to. Returning `undefined` falls
   * back to a synthetic "overview" section using the group code.
   */
  getRecordSection?: (investment: any, typeSpecificData?: any) => SubSection | undefined
}

/**
 * Build a SubSection from a catalog-entry-style `{ code, value }` object.
 * Used by both the default resolver and the Liquid Fund override.
 */
const buildSectionFromInvestmentType = (
  investmentType: { code?: string; value?: string } | null | undefined
): SubSection | undefined => {
  const code = investmentType?.code
  if (!code) return undefined
  const value = investmentType?.value || code
  return {
    id: code.toLowerCase().replace(/_/g, '-'),
    code,
    value,
    label: value
  }
}

/**
 * Default record-section resolver: most groups place the locked section on
 * `investment.investmentType`.
 */
const defaultGetRecordSection = (investment: any): SubSection | undefined =>
  buildSectionFromInvestmentType(investment?.investmentType)

/**
 * Group-specific configurations.
 *
 * Entries declare only the static, per-group behaviour. Dynamic derivations
 * (columns, sortable columns, filter config) come from the transformer.
 */
export const REPORT_GROUP_CONFIGURATIONS: Record<string, ReportGroupConfiguration> = {
  /**
   * Equity Investment Reports
   * Sub-sections: catalog investment types (Venture Capital, Growth Equity, …)
   */
  EQUITY: {
    subSectionStrategy: 'investmentTypes',
    entityPrefix: 'equity',
    tableConfig: EQUITY_TABLE_CONFIG
  },

  /**
   * Real Estate Investment Reports
   * Sub-sections: catalog investment types (Property, Development, Loans, …)
   */
  REAL_ESTATE: {
    subSectionStrategy: 'investmentTypes',
    entityPrefix: 'realEstate',
    tableConfig: REAL_ESTATE_TABLE_CONFIG
  },

  /**
   * Liquid Fund Investment Reports
   * Sub-sections: InvestmentLiquidFundType catalog entries
   * Data transformation: pivot to analytics format
   */
  LIQUID_FUND: {
    subSectionStrategy: 'liquidFundTypes',
    entityPrefix: 'liquidFund',
    dataTransformer: transformReportsToAnalyticsData,
    tableConfig: LIQUID_FUND_TABLE_CONFIG,
    getRecordSection: (_investment: any, typeSpecificData?: any): SubSection | undefined =>
      buildSectionFromInvestmentType(typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType)
  }

  // Future groups work automatically via DEFAULT_REPORT_GROUP_CONFIGURATION
}

/**
 * Default configuration for unknown / future investment groups.
 */
export const DEFAULT_REPORT_GROUP_CONFIGURATION: ReportGroupConfiguration = {
  subSectionStrategy: 'investmentTypes',
  entityPrefix: 'generic',
  tableConfig: EQUITY_TABLE_CONFIG
}

// Pre-normalized configurations — stable object references per group code,
// safe for use in React hook dependency arrays.
const NORMALIZED_REPORT_GROUP_CONFIGURATIONS: Record<string, ReportGroupConfiguration> = Object.fromEntries(
  Object.entries(REPORT_GROUP_CONFIGURATIONS).map(([key, config]) => [
    key,
    { ...config, getRecordSection: config.getRecordSection ?? defaultGetRecordSection }
  ])
)

const NORMALIZED_DEFAULT_REPORT_GROUP_CONFIGURATION: ReportGroupConfiguration = {
  ...DEFAULT_REPORT_GROUP_CONFIGURATION,
  getRecordSection: DEFAULT_REPORT_GROUP_CONFIGURATION.getRecordSection ?? defaultGetRecordSection
}

/**
 * Get configuration for a specific investment group.
 *
 * Returns the specialized config when defined, otherwise the default. The
 * returned reference is stable per `groupCode` (normalized once at module
 * load), so it is safe to include in React hook dependency arrays.
 */
export const getReportGroupConfiguration = (groupCode: string): ReportGroupConfiguration => {
  return NORMALIZED_REPORT_GROUP_CONFIGURATIONS[groupCode] || NORMALIZED_DEFAULT_REPORT_GROUP_CONFIGURATION
}
