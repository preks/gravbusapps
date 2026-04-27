// Investment Report Queries - Core investment report entities and their specializations
// Built using actual schema discovered via newwork-mcp
// This mirrors investmentQueries.ts but targets InvestmentReport tables instead of Investment tables
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import {
  INVESTMENT_REPORT,
  EQUITY_INVESTMENT_REPORT,
  LIQUID_FUND_INVESTMENT_REPORT,
  REAL_ESTATE_INVESTMENT_REPORT
} from './fragments/investmentReportFragments'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'

/**
 * Escapes GraphQL string values to prevent injection attacks
 * @param input - Raw string input from user
 * @returns Escaped string safe for GraphQL interpolation
 */
const escapeGraphQLString = (input: string): string => {
  if (!input) return ''

  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t') // Escape tabs
}

// Whitelist of allowed fields for orderBy to prevent injection attacks
const ORDERABLE_FIELDS = new Set([
  // Root scalar fields
  'date',
  'investmentMarketValue',
  'loanAmount',
  'createdAt',
  'updatedAt',
  'stakePercentage',
  'fundManagerName',
  'loanRecipientName',
  'forecastedRevenueAmount',
  'forecastedProfitAmount',
  'debtFinancingAmount',
  'requiredCapitalAmount',
  'irr',
  'moic',
  // Nested fields (for validation)
  'investment.name',
  'investment.code',
  'investment.acquisitionDate',
  'investment.investmentType.value',
  'investment.investmentGroup.value',
  'investmentPhase.value',
  'currency.value'
])

/**
 * Builds a single orderBy entry with support for nested fields
 * @param field - Field name (can be nested like 'investment.name')
 * @param direction - Sort direction with null handling
 * @returns GraphQL orderBy string or null if field is not allowed
 */
function buildOrderByEntry(
  field: string,
  direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
): string | null {
  // Normalize direction
  const normalizedDirection =
    direction === 'ASC' || direction === 'ASC_NULLS_LAST'
      ? direction === 'ASC_NULLS_LAST'
        ? 'ASC_NULLS_LAST'
        : 'ASC'
      : direction === 'DESC_NULLS_LAST'
        ? 'DESC_NULLS_LAST'
        : 'DESC'

  // Handle nested investment fields
  if (field === 'investment.name') {
    return `{ investment: { name: ${normalizedDirection} } }`
  }
  if (field === 'investment.code') {
    return `{ investment: { code: ${normalizedDirection} } }`
  }
  if (field === 'investment.acquisitionDate') {
    return `{ investment: { acquisitionDate: ${normalizedDirection} } }`
  }
  if (field === 'investment.investmentType.value') {
    return `{ investment: { investmentType: { value: ${normalizedDirection} } } }`
  }
  if (field === 'investment.investmentGroup.value') {
    return `{ investment: { investmentGroup: { value: ${normalizedDirection} } } }`
  }

  // Handle catalog value fields
  if (field === 'investmentPhase.value') {
    return `{ investmentPhase: { value: ${normalizedDirection} } }`
  }
  if (field === 'currency.value') {
    return `{ currency: { value: ${normalizedDirection} } }`
  }

  // Handle root fields
  if (ORDERABLE_FIELDS.has(field)) {
    return `{ ${field}: ${normalizedDirection} }`
  }

  // Unsupported field
  return null
}

/**
 * Sanitizes orderBy array to prevent GraphQL injection attacks
 * Supports nested fields and NULLS_LAST directives
 * @param arr - Array of order by objects with field and direction
 * @returns Sanitized array of GraphQL orderBy strings
 */
function sanitizeOrderBy(
  arr: Array<{ field: string; direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' }>
): string[] {
  const orderByEntries: string[] = []

  for (const orderItem of arr) {
    const entry = buildOrderByEntry(orderItem.field, orderItem.direction)
    if (entry) {
      orderByEntries.push(entry)
    }
  }

  return orderByEntries
}

export interface InvestmentReportQueryVariables {
  // Basic filters
  ids?: string[]
  investmentIds?: string[]
  search?: string

  // Investment relationship filters
  investmentTypeIds?: string[]
  investmentGroupIds?: string[]

  // Catalog filters
  currencyIds?: string[]

  // Date ranges for reports
  reportDateFrom?: string
  reportDateTo?: string
  createdAfter?: string
  createdBefore?: string

  // Amount ranges (implemented)
  marketValueMinAmount?: number
  marketValueMaxAmount?: number
  loanMinAmount?: number
  loanMaxAmount?: number

  // Text filters (implemented)
  fundManagerNameContains?: string
  loanRecipientNameContains?: string

  // Type-specific investment IDs (implemented)
  equityInvestmentIds?: string[]
  liquidFundInvestmentIds?: string[]
  realEstateInvestmentIds?: string[]

  // Liquid Fund Type Filters (for filtering by liquidFundInvestmentReport.investmentLiquidFundType)
  liquidFundTypeIds?: string[]
  liquidFundTypeIdsExclude?: string[]

  // Pagination
  limit?: number
  offset?: number

  // Sorting (supports nested fields and null handling)
  orderBy?: Array<{
    field: string
    direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>

  // Allow dynamic number range filters from descriptors
  [key: string]: any
}

// Build where conditions for InvestmentReport queries
export const buildInvestmentReportWhereCondition = (variables: InvestmentReportQueryVariables = {}) => {
  try {
    let whereClause = '{ '
    const conditions: string[] = []
    const orConditions: string[] = []

    // Basic filters
    if (variables.ids?.length) {
      const safeIds = variables.ids.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      conditions.push(`id: { _in: [${safeIds}] }`)
    }

    // Search across relevant text fields - add to OR conditions
    if (variables.search?.trim()) {
      const safeSearch = escapeGraphQLString(variables.search.trim())
      const searchPattern = `{ _ilike: "%${safeSearch}%" }`
      orConditions.push(
        `{ loanRecipientName: ${searchPattern} }`,
        `{ fundManagerName: ${searchPattern} }`,
        `{ investment: { name: ${searchPattern} } }`,
        `{ investment: { code: ${searchPattern} } }`,
        `{ investment: { isin: ${searchPattern} } }`
      )
    }

    // Date ranges - combine into single date condition to avoid duplicate keys
    if (variables.reportDateFrom || variables.reportDateTo) {
      const dateParts: string[] = []
      if (variables.reportDateFrom) {
        dateParts.push(`_gte: "${escapeGraphQLString(variables.reportDateFrom)}"`)
      }
      if (variables.reportDateTo) {
        dateParts.push(`_lte: "${escapeGraphQLString(variables.reportDateTo)}"`)
      }
      conditions.push(`date: { ${dateParts.join(', ')} }`)
    }

    // Creation date range - combine into single createdAt condition to avoid duplicate keys
    if (variables.createdAfter || variables.createdBefore) {
      const createdAtParts: string[] = []
      if (variables.createdAfter) {
        createdAtParts.push(`_gte: "${escapeGraphQLString(variables.createdAfter)}"`)
      }
      if (variables.createdBefore) {
        createdAtParts.push(`_lte: "${escapeGraphQLString(variables.createdBefore)}"`)
      }
      conditions.push(`createdAt: { ${createdAtParts.join(', ')} }`)
    }

    // Amount ranges
    if (typeof variables.marketValueMinAmount === 'number') {
      conditions.push(`investmentMarketValue: { _gte: ${variables.marketValueMinAmount} }`)
    }
    if (typeof variables.marketValueMaxAmount === 'number') {
      conditions.push(`investmentMarketValue: { _lte: ${variables.marketValueMaxAmount} }`)
    }

    if (typeof variables.loanMinAmount === 'number') {
      conditions.push(`loanAmount: { _gte: ${variables.loanMinAmount} }`)
    }
    if (typeof variables.loanMaxAmount === 'number') {
      conditions.push(`loanAmount: { _lte: ${variables.loanMaxAmount} }`)
    }

    // Text filters
    if (variables.fundManagerNameContains?.trim()) {
      const v = escapeGraphQLString(variables.fundManagerNameContains.trim())
      conditions.push(`fundManagerName: { _ilike: "%${v}%" }`)
    }
    if (variables.loanRecipientNameContains?.trim()) {
      const v = escapeGraphQLString(variables.loanRecipientNameContains.trim())
      conditions.push(`loanRecipientName: { _ilike: "%${v}%" }`)
    }

    // Catalog filters
    if (variables.currencyIds?.length) {
      const safeCurrencyIds = variables.currencyIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      conditions.push(`currency: { id: { _in: [${safeCurrencyIds}] } }`)
    }

    // Dynamic number range filters (using descriptors)
    // Process any field with _gte/_lte that has a number descriptor
    const numberDescriptors = INVESTMENT_REPORT_DESCRIPTORS.filter(d => d.type === 'number' && d.path)

    numberDescriptors.forEach(descriptor => {
      const value = variables[descriptor.key]
      if (!value || typeof value !== 'object') return

      // Check if this is a GraphQL range condition
      if ('_gte' in value || '_lte' in value) {
        const rangeParts: string[] = []
        if (typeof value._gte === 'number') {
          rangeParts.push(`_gte: ${value._gte}`)
        }
        if (typeof value._lte === 'number') {
          rangeParts.push(`_lte: ${value._lte}`)
        }

        if (rangeParts.length > 0) {
          // Parse nested path to build correct GraphQL structure
          const path = descriptor.path!
          const pathParts = path.split('.')

          if (pathParts.length === 1) {
            // Direct field: totalInvestmentAmount: { _gte: 10, _lte: 100 }
            conditions.push(`${pathParts[0]}: { ${rangeParts.join(', ')} }`)
          } else if (pathParts.length === 2) {
            // Nested field: realEstateInvestmentReport: { size: { _gte: 10, _lte: 100 } }
            conditions.push(`${pathParts[0]}: { ${pathParts[1]}: { ${rangeParts.join(', ')} } }`)
          } else {
            // Deeper nesting (if needed in the future)
            console.warn(`Unsupported nested path depth for descriptor ${descriptor.key}: ${path}`)
          }
        }
      }
    })

    // Investment-level filters (through relationship)
    // Consolidate ALL investment-related filters into single investment clause to avoid duplicate keys
    // Add investment ID filter if provided (direct field, not nested)
    if (variables.investmentIds?.length) {
      const safeInvestmentIds = variables.investmentIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      conditions.push(`investmentId: { _in: [${safeInvestmentIds}] }`)
    }

    // Investment relationship filters (nested)
    const investmentFilters: string[] = []

    // Add investment type filter if provided
    if (variables.investmentTypeIds?.length) {
      const safeInvestmentTypeIds = variables.investmentTypeIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      investmentFilters.push(`investmentType: { id: { _in: [${safeInvestmentTypeIds}] } }`)
    }

    // Add investment group filter if provided
    if (variables.investmentGroupIds?.length) {
      const safeInvestmentGroupIds = variables.investmentGroupIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      investmentFilters.push(`investmentGroup: { id: { _in: [${safeInvestmentGroupIds}] } }`)
    }

    // Only push the investment clause if there are filters to apply
    if (investmentFilters.length > 0) {
      conditions.push(`investment: { ${investmentFilters.join(', ')} }`)
    }

    // Type-specific investment filters - use AND conditions for precise filtering
    if (variables.equityInvestmentIds?.length) {
      const safeEquityInvestmentIds = variables.equityInvestmentIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      conditions.push(`equityInvestmentReport: { equityInvestmentId: { _in: [${safeEquityInvestmentIds}] } }`)
    }
    if (variables.liquidFundInvestmentIds?.length) {
      const safeLiquidFundInvestmentIds = variables.liquidFundInvestmentIds
        .map(id => `"${escapeGraphQLString(id)}"`)
        .join(', ')
      conditions.push(
        `liquidFundInvestmentReport: { liquidFundInvestmentId: { _in: [${safeLiquidFundInvestmentIds}] } }`
      )
    }
    if (variables.realEstateInvestmentIds?.length) {
      const safeRealEstateInvestmentIds = variables.realEstateInvestmentIds
        .map(id => `"${escapeGraphQLString(id)}"`)
        .join(', ')
      conditions.push(
        `realEstateInvestmentReport: { realEstateInvestmentId: { _in: [${safeRealEstateInvestmentIds}] } }`
      )
    }

    // Liquid Fund Type Filters - filter by liquidFundInvestmentReport.investmentLiquidFundType
    if (variables.liquidFundTypeIds?.length) {
      const safeLiquidFundTypeIds = variables.liquidFundTypeIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ')
      conditions.push(
        `liquidFundInvestmentReport: { investmentLiquidFundType: { id: { _in: [${safeLiquidFundTypeIds}] } } }`
      )
    }
    if (variables.liquidFundTypeIdsExclude?.length) {
      const safeLiquidFundTypeIdsExclude = variables.liquidFundTypeIdsExclude
        .map(id => `"${escapeGraphQLString(id)}"`)
        .join(', ')
      conditions.push(
        `liquidFundInvestmentReport: { investmentLiquidFundType: { id: { _nin: [${safeLiquidFundTypeIdsExclude}] } } }`
      )
    }

    // Add consolidated OR conditions if any exist
    if (orConditions.length > 0) {
      conditions.push(`_or: [${orConditions.join(', ')}]`)
    }

    // Soft delete filter
    conditions.push('isDeleted: { _eq: false }')

    whereClause += conditions.join(', ')
    whereClause += ' }'
    return `where: ${whereClause}`
  } catch (error) {
    console.error('Error building where conditions:', error)
    console.error('Variables that caused the error:', variables)
    // Return a basic fallback condition
    return 'where: { isDeleted: { _eq: false } }'
  }
}

// Get Investment Reports with all specializations
export const GET_INVESTMENT_REPORTS = (variables: InvestmentReportQueryVariables = {}): string => {
  const requestedLimit = variables.limit ?? 50
  const limit = Math.min(Math.max(requestedLimit, 1), 10000)
  const offset = variables.offset || 0
  const where = buildInvestmentReportWhereCondition(variables)

  // Build orderBy clause with sanitization to prevent injection attacks
  const sanitizedOrderBy = variables.orderBy?.length ? sanitizeOrderBy(variables.orderBy) : []
  const orderByClause =
    sanitizedOrderBy.length > 0 ? `orderBy: [${sanitizedOrderBy.join(', ')}]` : 'orderBy: [{ date: DESC_NULLS_LAST }]' // Default sort with null handling

  const query = `
    query GetInvestmentReports {
      InvestmentReport(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_REPORT}
        
        # Type-specific report relationships
        equityInvestmentReport {
          ${EQUITY_INVESTMENT_REPORT}
        }
        
        liquidFundInvestmentReport {
          ${LIQUID_FUND_INVESTMENT_REPORT}
        }
        
        realEstateInvestmentReport {
          ${REAL_ESTATE_INVESTMENT_REPORT}
        }
      }
      
      InvestmentReportAggregate(
        ${where}
      ) {
        aggregate {
          count
        }
      }
    }
  `

  return query
}

// Get Investment Report By ID
export const GET_INVESTMENT_REPORT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentReportById {
      InvestmentReport(
        where: { 
          id: { _eq: ${JSON.stringify(id)} }
          isDeleted: { _eq: false }
        }
      ) {
        ${INVESTMENT_REPORT}
        
        # Type-specific report relationships
        equityInvestmentReport {
          ${EQUITY_INVESTMENT_REPORT}
        }
        
        liquidFundInvestmentReport {
          ${LIQUID_FUND_INVESTMENT_REPORT}
        }
        
        realEstateInvestmentReport {
          ${REAL_ESTATE_INVESTMENT_REPORT}
        }
      }
    }
  `
}

// Search Investment Reports (lightweight for autocomplete)
export const SEARCH_INVESTMENT_REPORTS = (variables: InvestmentReportQueryVariables): string => {
  const { limit = 10 } = variables
  const whereCondition = buildInvestmentReportWhereCondition(variables)

  return `
    query SearchInvestmentReports {
      InvestmentReport(
        ${whereCondition}
        limit: ${limit}
        orderBy: [{ date: DESC }]
      ) {
        id
        date
        loanRecipientName
        loanAmount
        investmentMarketValue
        
        investment {
          id
          code
          name
          investmentType { ${CATALOG_ENTRY} }
          investmentGroup { ${CATALOG_ENTRY} }
        }
      }
    }
  `
}
