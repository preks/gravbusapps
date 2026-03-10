import type { FilterConfiguration } from '@newwork/nw-design-system'
import { generateFiltersFromCatalog } from './catalogFilterGenerator'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'

/**
 * Generate report filters from catalog data
 * This is a generalized function that works for any investment group
 *
 * @param catalogData - The full catalog data
 * @param catalogSource - Whether to look at GROUP or TYPE level
 * @param groupOrTypeCode - The code to find in the catalog
 * @param catalogKey - Which catalog collection to use
 * @param entityPrefix - Prefix for filter field names ('equity', 'realEstate', 'liquidFund')
 * @param filterGroups - Filter groups from useFilterGroups hook (for populating options)
 * @returns FilterConfiguration with dynamically generated filters
 */
function emptyFilterConfig(entityPrefix: string): FilterConfiguration {
  return { id: `${entityPrefix}-filters-empty`, name: 'Report Filters', groups: [] }
}

export const generateReportFiltersFromCatalog = (
  catalogData: any,
  catalogSource: 'GROUP' | 'TYPE',
  groupOrTypeCode: string,
  catalogKey: 'investmentGroups' | 'investmentTypes' | 'investmentLiquidFundTypes',
  entityPrefix: 'equity' | 'realEstate' | 'liquidFund',
  filterGroups: any
): FilterConfiguration => {
  if (!catalogData?.[catalogKey]) return emptyFilterConfig(entityPrefix)

  const entry = catalogData[catalogKey].find((item: any) => item.code === groupOrTypeCode)
  if (!entry?.objectValue) return emptyFilterConfig(entityPrefix)

  const parsed = typeof entry.objectValue === 'string' ? JSON.parse(entry.objectValue) : entry.objectValue

  if (!parsed?.formFields) return emptyFilterConfig(entityPrefix)

  // Generate filters from catalog formFields
  const catalogGeneratedConfig = generateFiltersFromCatalog(
    parsed.formFields,
    entityPrefix,
    `${entityPrefix}-report-filters-dynamic`,
    'Report Filters'
  )

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
    return {
      id: 'real-estate-filters-empty',
      name: 'Real Estate Report Filters',
      groups: []
    }
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
 * Generate filters for Liquid Fund reports
 * Liquid Fund reports don't use catalog-generated filters (returns empty)
 *
 * @returns Empty FilterConfiguration
 */
export const generateLiquidFundReportFilters = (): FilterConfiguration => {
  return {
    id: 'liquid-fund-filters-empty',
    name: 'Liquid Fund Report Filters',
    groups: []
  }
}
