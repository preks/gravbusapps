import { ColumnConfig } from '../hooks/useReportFilters'

const BASE_COLUMNS: ColumnConfig[] = [
  { id: 'investment', label: 'Investment', visible: true, disabled: true },
  { id: 'date', label: 'Date', visible: true }
]

const REAL_ESTATE_FALLBACK_COLUMNS: ColumnConfig[] = [
  ...BASE_COLUMNS,
  { id: 'name', label: 'Name', visible: true },
  { id: 'proprietor', label: 'Proprietor', visible: true },
  { id: 'location', label: 'Location', visible: true },
  { id: 'size', label: 'Size', visible: true },
  { id: 'buildingYear', label: 'Building Year', visible: true },
  { id: 'annualNetColdRent', label: 'Annual Net Cold Rent', visible: true },
  { id: 'occupancyPercent', label: 'Occupancy %', visible: true },
  { id: 'funding', label: 'Funding', visible: true }
]

const LIQUID_FUND_FALLBACK_COLUMNS: ColumnConfig[] = [
  ...BASE_COLUMNS,
  { id: 'name', label: 'Name', visible: true },
  { id: 'proprietor', label: 'Proprietor', visible: true },
  { id: 'currency', label: 'Currency', visible: true },
  { id: 'openingBalance', label: 'Opening Balance', visible: true },
  { id: 'incoming', label: 'Incoming', visible: true },
  { id: 'outgoing', label: 'Outgoing', visible: true },
  { id: 'realized', label: 'Realized', visible: true },
  { id: 'gainsLosses', label: 'Gains/Losses', visible: true },
  { id: 'closingBalance', label: 'Closing Balance', visible: true },
  { id: 'timeWeightedReturn', label: 'Time-Weighted Return', visible: true },
  { id: 'interestRate', label: 'Interest Rate', visible: true },
  { id: 'maturityDate', label: 'Maturity Date', visible: true }
]

/**
 * Base column generator that works for any investment group
 * Extracts columns from catalog data based on configuration
 *
 * @param catalogData - The catalog data containing form fields
 * @param catalogSource - Whether to look at GROUP or TYPE level
 * @param groupOrTypeCode - The code to find in the catalog
 * @param catalogKey - Which catalog collection to use
 * @returns Array of column configurations
 */
export const generateBaseReportColumns = (
  catalogData: any,
  catalogSource: 'GROUP' | 'TYPE',
  groupOrTypeCode: string,
  catalogKey: 'investmentGroups' | 'investmentTypes' | 'investmentLiquidFundTypes'
): ColumnConfig[] => {
  const columns: ColumnConfig[] = [
    { id: 'investment', label: 'Investment', visible: true, disabled: true },
    { id: 'date', label: 'Date', visible: true }
  ]

  if (!catalogData?.[catalogKey]) {
    return columns
  }

  const entry = catalogData[catalogKey].find((item: any) => item.code === groupOrTypeCode)
  if (!entry?.objectValue) {
    return columns
  }

  // Parse objectValue if it's a string
  const parsed = typeof entry.objectValue === 'string' ? JSON.parse(entry.objectValue) : entry.objectValue

  if (!parsed?.formFields) {
    return columns
  }

  parsed.formFields?.forEach((group: any) => {
    group.fields.forEach((field: any) => {
      // Filter out fields with report: false (not for report tables)
      if (field.report === false) {
        return
      }
      // Use the same ID generation as the table transformer (property with dots -> underscores)
      const columnId = field.property.replaceAll('.', '_')
      columns.push({
        id: columnId,
        label: field.label,
        visible: true // All visible by default
      })
    })
  })

  return columns
}

/**
 * Generate columns for Equity reports
 * Uses GROUP-level catalog - same columns for all equity types
 *
 * @param catalogData - The catalog data
 * @returns Array of column configurations
 */
const EQUITY_FALLBACK_COLUMNS: ColumnConfig[] = [
  ...BASE_COLUMNS,
  { id: 'name', label: 'Name', visible: true },
  { id: 'company', label: 'Company', visible: true },
  { id: 'sector', label: 'Sector', visible: true },
  { id: 'shares', label: 'Shares', visible: true },
  { id: 'sharePrice', label: 'Share Price', visible: true },
  { id: 'totalValue', label: 'Total Value', visible: true },
  { id: 'gainLoss', label: 'Gain/Loss', visible: true },
  { id: 'returnPercent', label: 'Return %', visible: true }
]

/**
 * Generate columns for Equity reports.
 * Tries TYPE-level catalog for the active investment type first so each
 * sub-section (Venture Capital, Growth Equity, …) can have its own column set.
 * Falls back to GROUP-level catalog (EQUITY group) when no type-specific
 * fields are defined, and finally to the static fallback list.
 *
 * @param catalogData - The catalog data
 * @param investmentTypeCode - The specific investment type code (current sub-section)
 * @returns Array of column configurations
 */
export const generateEquityReportColumns = (catalogData: any, investmentTypeCode?: string): ColumnConfig[] => {
  if (investmentTypeCode) {
    const typeColumns = generateBaseReportColumns(catalogData, 'TYPE', investmentTypeCode, 'investmentTypes')
    if (typeColumns.length > 2) return typeColumns
  }

  const groupColumns = generateBaseReportColumns(catalogData, 'GROUP', 'EQUITY', 'investmentGroups')
  return groupColumns.length === 2 ? EQUITY_FALLBACK_COLUMNS : groupColumns
}

/**
 * Generate columns for Real Estate reports
 * Uses TYPE-level catalog - columns change per investment type
 *
 * @param catalogData - The catalog data
 * @param investmentTypeCode - The specific investment type code
 * @returns Array of column configurations
 */
export const generateRealEstateReportColumns = (catalogData: any, investmentTypeCode: string): ColumnConfig[] => {
  if (!investmentTypeCode || investmentTypeCode === 'overview') {
    return REAL_ESTATE_FALLBACK_COLUMNS
  }

  const columns = generateBaseReportColumns(catalogData, 'TYPE', investmentTypeCode, 'investmentTypes')

  return columns.length === 2 ? REAL_ESTATE_FALLBACK_COLUMNS : columns
}

/**
 * Generate columns for Liquid Fund reports
 * Uses TYPE-level catalog for liquid fund types
 *
 * @param catalogData - The catalog data
 * @param liquidFundTypeCode - The specific liquid fund type code
 * @returns Array of column configurations
 */
export const generateLiquidFundReportColumns = (catalogData: any, liquidFundTypeCode: string): ColumnConfig[] => {
  if (!liquidFundTypeCode) {
    return LIQUID_FUND_FALLBACK_COLUMNS
  }

  const columns = generateBaseReportColumns(catalogData, 'TYPE', liquidFundTypeCode, 'investmentLiquidFundTypes')

  return columns.length === 2 ? LIQUID_FUND_FALLBACK_COLUMNS : columns
}
