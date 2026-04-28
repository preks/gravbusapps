import type { FilterConfiguration } from '@newwork/nw-design-system'
import { generateFiltersFromCatalog } from './catalogFilterGenerator'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'

type FilterGroup = NonNullable<FilterConfiguration['groups']>[number]

/**
 * Always-on "Investment" filter group.
 *
 * - Filters reports by `investmentId` on the backend (descriptor `investmentIds`).
 * - Renders investment names in the UI.
 * - Deduped via `optionDistinctOn: [investmentId]` in the descriptor, so each
 *   unique investment appears exactly once even if it has many reports.
 */
const buildInvestmentFilterGroup = (): FilterGroup => ({
  id: 'investmentIds-group',
  label: 'Investment',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'investmentIds',
      field: 'investmentIds',
      label: 'Investment',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search investments…',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

/**
 * Build a filter configuration that contains only the always-on Investment
 * filter, enriched with options from `filterGroups`. Used as the fallback when
 * a group/type has no usable catalog form fields.
 */
function emptyFilterConfig(entityPrefix: string, filterGroups: any): FilterConfiguration {
  const base: FilterConfiguration = {
    id: `${entityPrefix}-filters`,
    name: 'Report Filters',
    groups: [buildInvestmentFilterGroup()]
  }
  return buildDynamicFilterConfig(base, INVESTMENT_REPORT_DESCRIPTORS, filterGroups)
}

/**
 * Generate report filters from catalog data
 * This is a generalized function that works for any investment group/type.
 *
 * The Investment filter is always prepended, regardless of catalog content.
 * Catalog-driven filters are appended after; fields backed by JSONB
 * `additionalProperties` are skipped inside `catalogFilterGenerator` since
 * they aren't backed by real DB columns and have no descriptors.
 *
 * @param catalogData - The full catalog data
 * @param catalogSource - Whether to look at GROUP or TYPE level
 * @param groupOrTypeCode - The code to find in the catalog
 * @param catalogKey - Which catalog collection to use
 * @param entityPrefix - Prefix for filter field names ('equity', 'realEstate', 'liquidFund')
 * @param filterGroups - Filter groups from useFilterGroups hook (for populating options)
 * @returns FilterConfiguration with dynamically generated filters
 */
export const generateReportFiltersFromCatalog = (
  catalogData: any,
  catalogSource: 'GROUP' | 'TYPE',
  groupOrTypeCode: string,
  catalogKey: 'investmentGroups' | 'investmentTypes' | 'investmentLiquidFundTypes',
  entityPrefix: 'equity' | 'realEstate' | 'liquidFund',
  filterGroups: any
): FilterConfiguration => {
  if (!catalogData?.[catalogKey]) return emptyFilterConfig(entityPrefix, filterGroups)

  const entry = catalogData[catalogKey].find((item: any) => item.code === groupOrTypeCode)
  if (!entry?.objectValue) return emptyFilterConfig(entityPrefix, filterGroups)

  const parsed = typeof entry.objectValue === 'string' ? JSON.parse(entry.objectValue) : entry.objectValue

  if (!parsed?.formFields) return emptyFilterConfig(entityPrefix, filterGroups)

  // Generate filters from catalog formFields (skips additionalProperties)
  const catalogGeneratedConfig = generateFiltersFromCatalog(
    parsed.formFields,
    entityPrefix,
    `${entityPrefix}-report-filters-dynamic`,
    'Report Filters'
  )

  // Always include the Investment filter, regardless of catalog content.
  catalogGeneratedConfig.groups = [buildInvestmentFilterGroup(), ...catalogGeneratedConfig.groups]

  // Populate multi-select filter options from filterGroups (for catalog-based filters)
  return buildDynamicFilterConfig(catalogGeneratedConfig, INVESTMENT_REPORT_DESCRIPTORS, filterGroups)
}

/**
 * Generate filters for Equity reports
 * Uses GROUP-level catalog - same filters for all equity types
 *
 * @param catalogData - The full catalog data
 * @param filterGroups - Filter groups from useFilterGroups hook
 * @returns FilterConfiguration for equity reports
 */
export const generateEquityReportFilters = (catalogData: any, filterGroups: any): FilterConfiguration => {
  return generateReportFiltersFromCatalog(catalogData, 'GROUP', 'EQUITY', 'investmentGroups', 'equity', filterGroups)
}

/**
 * Generate filters for Real Estate reports
 * Uses TYPE-level catalog - filters change per investment type
 *
 * @param catalogData - The full catalog data
 * @param investmentTypeCode - The specific investment type code
 * @param filterGroups - Filter groups from useFilterGroups hook
 * @returns FilterConfiguration for real estate reports
 */
export const generateRealEstateReportFilters = (
  catalogData: any,
  investmentTypeCode: string,
  filterGroups: any
): FilterConfiguration => {
  if (!investmentTypeCode || investmentTypeCode === 'overview') {
    return emptyFilterConfig('realEstate', filterGroups)
  }

  return generateReportFiltersFromCatalog(
    catalogData,
    'TYPE',
    investmentTypeCode,
    'investmentTypes',
    'realEstate',
    filterGroups
  )
}

/**
 * Generate filters for Liquid Fund reports.
 *
 * Sourced from the InvestmentLiquidFundType catalog (TYPE-level), the same
 * catalog used to derive Liquid Fund columns. Only fields backed by real DB
 * columns are emitted as filters — `additionalProperties` are skipped inside
 * `catalogFilterGenerator`. The Investment filter is always included.
 *
 * @param catalogData - The full catalog data
 * @param liquidFundTypeCode - The specific liquid fund type code. Liquid Fund
 *   sub-sections are catalog-driven and each section's `code` IS the
 *   `InvestmentLiquidFundType` code, so the LIQUID_FUND config passes
 *   `currentSection` straight through here.
 * @param filterGroups - Filter groups from useFilterGroups hook
 * @returns FilterConfiguration for liquid fund reports
 */
export const generateLiquidFundReportFilters = (
  catalogData: any,
  liquidFundTypeCode: string | undefined,
  filterGroups: any
): FilterConfiguration => {
  if (!liquidFundTypeCode) return emptyFilterConfig('liquidFund', filterGroups)

  return generateReportFiltersFromCatalog(
    catalogData,
    'TYPE',
    liquidFundTypeCode,
    'investmentLiquidFundTypes',
    'liquidFund',
    filterGroups
  )
}

/**
 * Generate the default report filter set (Investment filter only) for groups
 * that don't define a catalog-driven filter generator.
 *
 * @param filterGroups - Filter groups from useFilterGroups hook
 * @returns FilterConfiguration with just the Investment filter
 */
export const generateDefaultReportFilters = (filterGroups: any): FilterConfiguration => {
  return emptyFilterConfig('generic', filterGroups)
}
