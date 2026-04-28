import type { InvestmentReportTableConfig } from '../components/shared/types'
import type { ColumnConfig } from '../hooks/useReportFilters'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  generateBaseReportColumns,
  generateEquityReportColumns,
  generateRealEstateReportColumns,
  generateLiquidFundReportColumns
} from '../utils/columnGenerators'
import {
  generateEquityReportFilters,
  generateRealEstateReportFilters,
  generateLiquidFundReportFilters,
  generateDefaultReportFilters
} from '../utils/filterGenerators'
import { getSortableColumnsForGroup } from '../utils/sortableColumnsHelpers'
import {
  EQUITY_TABLE_CONFIG,
  LIQUID_FUND_TABLE_CONFIG,
  REAL_ESTATE_TABLE_CONFIG
} from '../components/shared/tableConfigs'
import { transformReportsToAnalyticsData } from '../utils/liquidFundDataTransformer'
import type { SubSection } from '../utils/subSectionHelpers'

/**
 * Configuration for an investment group's report tab
 * Defines how a report tab behaves for a specific investment group
 */
export interface ReportGroupConfiguration {
  // Sub-section strategy
  subSectionStrategy: 'investmentTypes' | 'liquidFundTypes' | 'none'

  // Catalog configuration
  catalogSource: 'GROUP' | 'TYPE' | 'LIQUID_FUND_TYPES'
  catalogKey: 'investmentGroups' | 'investmentTypes' | 'investmentLiquidFundTypes'
  entityPrefix: 'equity' | 'realEstate' | 'liquidFund' | 'generic'

  // Column generation
  columnGenerator?: (catalogData: any, currentSection?: string) => ColumnConfig[]
  fallbackColumns?: ColumnConfig[]

  // Filter generation. Presence of `filterGenerator` is the implicit gate: a
  // group without one renders no filter sheet.
  filterGenerator?: (catalogData: any, currentSection: string, filterGroups: any) => FilterConfiguration

  // Data transformation
  dataTransformer?: (reports: any[]) => any[]

  // Table configuration
  tableConfig: InvestmentReportTableConfig

  // Sortable columns
  sortableColumns: Array<{ id: string; label: string }>

  /**
   * Resolve the locked sub-section to use when the report panel is rendered for
   * a single investment record (e.g. inside the investment record's Reports tab).
   *
   * Receives the full investment record and any group-specific data
   * (e.g. `typeSpecificData` from the record), and returns the section the
   * panel should lock to. Returning `undefined` falls back to a synthetic
   * "overview" section using the group code (matches the `'none'` strategy).
   *
   * Keeping this on the configuration means the record-level wrapper stays
   * fully group-agnostic: every group declares "what's my section on a record"
   * in one place, alongside its other behavior.
   */
  getRecordSection?: (investment: any, typeSpecificData?: any) => SubSection | undefined
}

/**
 * Build a SubSection for a record from a catalog-entry-style object
 * ({ code, value }). Returns undefined when no usable code is present.
 *
 * Works equally well for `investment.investmentType` (used by the default
 * resolver) and `typeSpecificData.liquidFundInvestment.investmentLiquidFundType`
 * (used by Liquid Fund records), since both share the same shape and our
 * sub-section model treats `code` as the catalog code.
 */
const buildSectionFromInvestmentType = (
  investmentType: { code?: string; value?: string } | null | undefined
): SubSection | undefined => {
  const code = investmentType?.code
  if (!code) return undefined
  const value = investmentType?.value || code
  return {
    id: code.toLowerCase().replaceAll('_', '-'),
    code,
    value,
    label: value
  }
}

/**
 * Default record-section resolver: most groups place the locked section on
 * `investment.investmentType` (the same field the portfolio view uses for
 * sub-sections under the `'investmentTypes'` strategy).
 */
const defaultGetRecordSection = (investment: any): SubSection | undefined =>
  buildSectionFromInvestmentType(investment?.investmentType)

/**
 * Group-specific configurations for investment report groups
 *
 * Groups with configuration get specialized behavior.
 * Groups without configuration use DEFAULT_REPORT_GROUP_CONFIGURATION.
 *
 * This allows new groups added to catalog to work automatically with sensible defaults.
 */
export const REPORT_GROUP_CONFIGURATIONS: Record<string, ReportGroupConfiguration> = {
  /**
   * Equity Investment Reports
   * - Sub-sections: Dynamic from catalog investment types (e.g., Venture Capital, Growth Equity, Buyout)
   * - Columns: Dynamic from EQUITY investment group catalog (GROUP-level)
   * - Filters: Dynamic from EQUITY investment group catalog (GROUP-level)
   */
  EQUITY: {
    subSectionStrategy: 'investmentTypes',
    catalogSource: 'GROUP',
    catalogKey: 'investmentGroups',
    entityPrefix: 'equity',
    columnGenerator: (catalogData: any) => generateEquityReportColumns(catalogData),
    filterGenerator: (catalogData: any, _currentSection: string, filterGroups: any) =>
      generateEquityReportFilters(catalogData, filterGroups),
    tableConfig: EQUITY_TABLE_CONFIG,
    sortableColumns: getSortableColumnsForGroup('EQUITY')
  },

  /**
   * Real Estate Investment Reports
   * - Sub-sections: Dynamic from catalog investment types (e.g., Property, Development, Loans)
   * - Columns: Dynamic from each investment type's catalog (TYPE-level)
   * - Filters: Dynamic from each investment type's catalog (TYPE-level)
   */
  REAL_ESTATE: {
    subSectionStrategy: 'investmentTypes',
    catalogSource: 'TYPE',
    catalogKey: 'investmentTypes',
    entityPrefix: 'realEstate',
    columnGenerator: (catalogData: any, currentSection?: string) =>
      generateRealEstateReportColumns(catalogData, currentSection || ''),
    filterGenerator: (catalogData: any, currentSection: string, filterGroups: any) =>
      generateRealEstateReportFilters(catalogData, currentSection, filterGroups),
    tableConfig: REAL_ESTATE_TABLE_CONFIG,
    sortableColumns: getSortableColumnsForGroup('REAL_ESTATE')
  },

  /**
   * Liquid Fund Investment Reports
   * - Sub-sections: Catalog-driven from InvestmentLiquidFundType (Bank Deposits,
   *   Fixed-Term Deposits, Pension Funds, Money Market Funds, Bonds, Equity, …).
   *   Each section's `code` IS the catalog code, so generators consume
   *   `currentSection` directly — no id↔code mapping needed.
   * - Special logic: Uses InvestmentLiquidFundType catalog instead of InvestmentType
   * - Columns: Dynamic per liquid fund type from the catalog
   * - Filters: Dynamic per liquid fund type from the catalog (DB-backed fields
   *   only) + always-on Investment filter
   * - Data Transformation: Reports are transformed to analytics format
   */
  LIQUID_FUND: {
    subSectionStrategy: 'liquidFundTypes',
    catalogSource: 'TYPE',
    catalogKey: 'investmentLiquidFundTypes',
    entityPrefix: 'liquidFund',
    columnGenerator: (catalogData: any, currentSection?: string) =>
      generateLiquidFundReportColumns(catalogData, currentSection || ''),
    filterGenerator: (catalogData: any, currentSection: string, filterGroups: any) =>
      generateLiquidFundReportFilters(catalogData, currentSection, filterGroups),
    dataTransformer: transformReportsToAnalyticsData,
    tableConfig: LIQUID_FUND_TABLE_CONFIG,
    sortableColumns: getSortableColumnsForGroup('LIQUID_FUND'),
    /**
     * Liquid Fund records expose the liquid fund type on
     * `typeSpecificData.liquidFundInvestment.investmentLiquidFundType`. That
     * object's `code` is the catalog code (matches `currentSection` everywhere
     * else in this file), so the default `buildSectionFromInvestmentType` shape
     * applies directly — no id↔code mapping needed.
     */
    getRecordSection: (_investment: any, typeSpecificData?: any): SubSection | undefined =>
      buildSectionFromInvestmentType(typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType)
  }

  // Future groups (e.g., PRIVATE_EQUITY, CRYPTOCURRENCY, etc.) will use DEFAULT configuration
  // and work automatically with base functionality
}

/**
 * Default configuration for unknown investment groups
 * Provides sensible defaults that work for most groups
 */
export const DEFAULT_REPORT_GROUP_CONFIGURATION: ReportGroupConfiguration = {
  subSectionStrategy: 'investmentTypes', // Try to fetch investment types from catalog (will fallback to 'none' if no types found)
  catalogSource: 'GROUP',
  catalogKey: 'investmentGroups',
  entityPrefix: 'generic',
  columnGenerator: (catalogData: any, currentSection?: string) => {
    // For generic groups, try to generate columns from group-level catalog
    // This handles groups without investment types (fields defined at group level)
    return generateBaseReportColumns(catalogData, 'GROUP', currentSection || '', 'investmentGroups')
  },
  // Even unknown/future groups get the always-on Investment filter so users
  // can scope reports by investment without per-group catalog work.
  filterGenerator: (_catalogData: any, _currentSection: string, filterGroups: any) =>
    generateDefaultReportFilters(filterGroups),
  tableConfig: EQUITY_TABLE_CONFIG, // Use equity config as generic fallback
  sortableColumns: getSortableColumnsForGroup('UNKNOWN')
}

// Pre-normalized configurations (computed once at module load) so that
// `getReportGroupConfiguration` returns a stable object reference per
// `groupCode`. This is important: callers like `InvestmentReportPanel` use the
// returned config in `useMemo` dep arrays, and a fresh-per-call object would
// silently invalidate those caches on every render.
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
 * Returns specialized configuration if defined, otherwise returns default
 * configuration. In both cases, the returned configuration is normalized so
 * that {@link ReportGroupConfiguration.getRecordSection} always falls back to
 * {@link defaultGetRecordSection} — every group that doesn't override it
 * automatically inherits the standard `investment.investmentType`-based
 * record-section resolution (no per-group ceremony required).
 *
 * The returned object reference is stable per `groupCode` (configs are
 * normalized once at module load), so it's safe to use in React hook
 * dependency arrays.
 *
 * @param groupCode - Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'PRIVATE_EQUITY')
 * @returns ReportGroupConfiguration for the group
 */
export const getReportGroupConfiguration = (groupCode: string): ReportGroupConfiguration => {
  return NORMALIZED_REPORT_GROUP_CONFIGURATIONS[groupCode] || NORMALIZED_DEFAULT_REPORT_GROUP_CONFIGURATION
}
