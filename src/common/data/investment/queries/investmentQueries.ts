// Investment Queries - Core investment entities and their specializations
// Built using actual schema discovered via newwork-mcp
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { buildDocumentFragment } from '@/common/data/relations/queries/relationFragments'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { INVESTMENT, INVESTMENT_SHAREHOLDER } from './fragments/investmentFragments'
import {
  INVESTMENT_ACTIVITY_REF,
  INVESTMENT_TASK_REF,
  INVESTMENT_ACCOUNT_REF
} from './fragments/investmentReferenceFragments'

export interface InvestmentQueryVariables {
  ids?: string[]
  search?: string
  investmentTypeIds?: string[]
  investmentStatusIds?: string[]
  investmentGroupIds?: string[]
  investmentPhaseIds?: string[]
  investmentRiskLevelIds?: string[]
  currencyIds?: string[]
  currencyCode?: string // Simple currency code like 'EUR', 'USD' - convenience parameter
  ownerEmployeeIds?: string[]
  accountIds?: string[]
  opportunityIds?: string[]
  // Creation date range (createdAt)
  createdAfter?: string
  createdBefore?: string
  // Amount ranges
  initialInvestmentMinAmount?: number
  initialInvestmentMaxAmount?: number
  marketValueMinAmount?: number
  marketValueMaxAmount?: number
  // Performance (percentage) range - applied client-side if provided
  performanceMinPercent?: number
  performanceMaxPercent?: number
  acquisitionDateFrom?: string
  acquisitionDateTo?: string
  exitDateFrom?: string
  exitDateTo?: string
  plannedExitDateFrom?: string
  plannedExitDateTo?: string
  // Text filters
  isinContains?: string
  fundManagerNameContains?: string
  // Catalog filters (phase already supported; risk level & currency already declared above)
  // Numeric scalars
  stakePercentageMin?: number
  stakePercentageMax?: number
  totalInvestmentMinAmount?: number
  totalInvestmentMaxAmount?: number
  debtFinancingMinAmount?: number
  debtFinancingMaxAmount?: number
  forecastedProfitMinAmount?: number
  forecastedProfitMaxAmount?: number
  // Liquid fund specialization filters
  liquidFundBankAccountContains?: string
  liquidFundEarlyTermination?: boolean
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

export interface InvestmentDocumentQueryVariables {
  investmentId: string
  createdBy?: string // Filter by creator user ID
  limit?: number
  offset?: number
}

// Build where condition for Investment queries
export const buildInvestmentWhereCondition = (variables: InvestmentQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Search across multiple fields (only using fields that exist in the schema)
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim()
    whereClause += `, _or: [
      { name: { _ilike: "%${searchTerm}%" } },
      { code: { _ilike: "%${searchTerm}%" } },
      { isin: { _ilike: "%${searchTerm}%" } },
      { fundManagerName: { _ilike: "%${searchTerm}%" } },
      { loanRecipientName: { _ilike: "%${searchTerm}%" } }
    ]`
  }

  // Filter by specific fields
  if (variables.investmentTypeIds?.length) {
    whereClause += `, investmentType: { id: { _in: [${variables.investmentTypeIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  if (variables.investmentStatusIds?.length) {
    whereClause += `, investmentStatus: { id: { _in: [${variables.investmentStatusIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  if (variables.investmentGroupIds?.length) {
    whereClause += `, investmentGroup: { id: { _in: [${variables.investmentGroupIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  if (variables.investmentPhaseIds?.length) {
    whereClause += `, investmentPhase: { id: { _in: [${variables.investmentPhaseIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  if (variables.investmentRiskLevelIds?.length) {
    whereClause += `, investmentRiskLevel: { id: { _in: [${variables.investmentRiskLevelIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  if (variables.currencyIds?.length) {
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`
  } else if (variables.currencyCode?.trim()) {
    // Simple currency code filter - uses currency.code instead of currency.id
    whereClause += `, currency: { code: { _eq: "${variables.currencyCode.trim()}" } }`
  }

  // Text contains filters
  if (variables.isinContains?.trim()) {
    whereClause += `, isin: { _ilike: "%${variables.isinContains.trim()}%" }`
  }
  if (variables.fundManagerNameContains?.trim()) {
    whereClause += `, fundManagerName: { _ilike: "%${variables.fundManagerNameContains.trim()}%" }`
  }

  // Phase (already supported earlier; keep guard only if variable exists)
  if ((variables as any).investmentPhaseIds?.length) {
    const ids = (variables as any).investmentPhaseIds as string[]
    whereClause += `, investmentPhase: { id: { _in: [${ids.map(id => `"${id}"`).join(', ')}] } }`
  }

  // Note: Investment entity doesn't have a direct 'country' field based on schema analysis

  if (variables.ownerEmployeeIds?.length) {
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  // Creation date range
  {
    const createdParts: string[] = []
    if (variables.createdAfter) createdParts.push(`_gte: "${variables.createdAfter}"`)
    if (variables.createdBefore) createdParts.push(`_lte: "${variables.createdBefore}"`)
    if (createdParts.length) {
      whereClause += `, createdAt: { ${createdParts.join(', ')} }`
    }
  }

  if (variables.accountIds?.length) {
    const accountIdsList = variables.accountIds.map(id => `"${id}"`).join(', ')
    // Updated to use junction table path
    whereClause += `, investmentAccounts: { investmentAccountId: { _in: [${accountIdsList}] } }`
  }

  if (variables.opportunityIds?.length) {
    const opportunityIdsList = variables.opportunityIds.map(id => `"${id}"`).join(', ')
    whereClause += `, investmentOpportunity: { id: { _in: [${opportunityIdsList}] } }`
  }

  // Numeric ranges
  {
    const parts: string[] = []
    if (typeof variables.initialInvestmentMinAmount === 'number')
      parts.push(`_gte: ${variables.initialInvestmentMinAmount}`)
    if (typeof variables.initialInvestmentMaxAmount === 'number')
      parts.push(`_lte: ${variables.initialInvestmentMaxAmount}`)
    if (parts.length) whereClause += `, initialInvestmentAmount: { ${parts.join(', ')} }`
  }
  {
    const parts: string[] = []
    if (typeof variables.marketValueMinAmount === 'number') parts.push(`_gte: ${variables.marketValueMinAmount}`)
    if (typeof variables.marketValueMaxAmount === 'number') parts.push(`_lte: ${variables.marketValueMaxAmount}`)
    if (parts.length) whereClause += `, investmentMarketValue: { ${parts.join(', ')} }`
  }

  {
    const acqParts: string[] = []
    if (variables.acquisitionDateFrom) acqParts.push(`_gte: "${variables.acquisitionDateFrom}"`)
    if (variables.acquisitionDateTo) acqParts.push(`_lte: "${variables.acquisitionDateTo}"`)
    if (acqParts.length) whereClause += `, acquisitionDate: { ${acqParts.join(', ')} }`
  }

  {
    const exitParts: string[] = []
    if (variables.exitDateFrom) exitParts.push(`_gte: "${variables.exitDateFrom}"`)
    if (variables.exitDateTo) exitParts.push(`_lte: "${variables.exitDateTo}"`)
    if (exitParts.length) whereClause += `, exitDate: { ${exitParts.join(', ')} }`
  }

  {
    const pexitParts: string[] = []
    if (variables.plannedExitDateFrom) pexitParts.push(`_gte: "${variables.plannedExitDateFrom}"`)
    if (variables.plannedExitDateTo) pexitParts.push(`_lte: "${variables.plannedExitDateTo}"`)
    if (pexitParts.length) whereClause += `, plannedExitDate: { ${pexitParts.join(', ')} }`
  }

  // Stake percentage
  {
    const parts: string[] = []
    if (typeof variables.stakePercentageMin === 'number') parts.push(`_gte: ${variables.stakePercentageMin}`)
    if (typeof variables.stakePercentageMax === 'number') parts.push(`_lte: ${variables.stakePercentageMax}`)
    if (parts.length) whereClause += `, stakePercentage: { ${parts.join(', ')} }`
  }

  // Totals / Debt / Forecasted Profit
  {
    const parts: string[] = []
    if (typeof variables.totalInvestmentMinAmount === 'number')
      parts.push(`_gte: ${variables.totalInvestmentMinAmount}`)
    if (typeof variables.totalInvestmentMaxAmount === 'number')
      parts.push(`_lte: ${variables.totalInvestmentMaxAmount}`)
    if (parts.length) whereClause += `, totalInvestmentAmount: { ${parts.join(', ')} }`
  }
  {
    const parts: string[] = []
    if (typeof variables.debtFinancingMinAmount === 'number') parts.push(`_gte: ${variables.debtFinancingMinAmount}`)
    if (typeof variables.debtFinancingMaxAmount === 'number') parts.push(`_lte: ${variables.debtFinancingMaxAmount}`)
    if (parts.length) whereClause += `, debtFinancingAmount: { ${parts.join(', ')} }`
  }
  {
    const parts: string[] = []
    if (typeof variables.forecastedProfitMinAmount === 'number')
      parts.push(`_gte: ${variables.forecastedProfitMinAmount}`)
    if (typeof variables.forecastedProfitMaxAmount === 'number')
      parts.push(`_lte: ${variables.forecastedProfitMaxAmount}`)
    if (parts.length) whereClause += `, forecastedProfitAmount: { ${parts.join(', ')} }`
  }

  // Liquid fund nested filters
  if (variables.liquidFundBankAccountContains?.trim()) {
    whereClause += `, liquidFundInvestment: { bankAccountNumber: { _ilike: "%${variables.liquidFundBankAccountContains.trim()}%" } }`
  }
  if (typeof variables.liquidFundEarlyTermination === 'boolean') {
    const val = variables.liquidFundEarlyTermination ? 'true' : 'false'
    whereClause += `, liquidFundInvestment: { earlyTerminationAllowed: { _eq: ${val} } }`
  }

  whereClause += ' }'
  return whereClause
}

// Get Investments with all specializations
export const GET_INVESTMENTS = (variables: InvestmentQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentWhereCondition(variables)

  // Build orderBy safely. Support nested fields using GraphQL syntax
  // Allowed sort fields on Investment root or immediate nested objects with scalar values
  const allowedSortFields = new Set<string>([
    // Root scalars
    'name',
    'code',
    'createdAt',
    'updatedAt',
    'acquisitionDate',
    'plannedExitDate',
    'exitDate',
    'initialInvestmentAmount',
    'totalInvestmentAmount',
    'investmentMarketValue',
    'stakePercentage',
    'fundManagerName',
    'loanInterestRate',
    // Nested catalog value sorts
    'investmentType',
    'investmentStatus',
    'investmentGroup'
  ])

  // Build one orderBy entry string
  const buildOrderByEntry = (field: string, direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'): string | null => {
    // Nested catalog value sorts
    if (field === 'investmentType.value') return `{ investmentType: { value: ${direction} } }`
    if (field === 'investmentStatus.value') return `{ investmentStatus: { value: ${direction} } }`
    if (field === 'investmentGroup.value') return `{ investmentGroup: { value: ${direction} } }`
    // Nested owner display name
    if (field === 'ownerEmployee.displayName') return `{ ownerEmployee: { displayName: ${direction} } }`

    // Direct root field
    if (allowedSortFields.has(field)) return `{ ${field}: ${direction} }`

    // Unsupported field (e.g., computed performancePercentage)
    return null
  }

  const orderByEntries: string[] = []
  for (const ob of variables.orderBy || []) {
    const entry = buildOrderByEntry(ob.field, ob.direction)
    if (entry) orderByEntries.push(entry)
  }

  const orderByClause = orderByEntries.length
    ? `orderBy: [${orderByEntries.join(', ')}]`
    : 'orderBy: [{ createdAt: DESC_NULLS_LAST }]'

  return `
    query GetInvestments {
      Investment(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT}
      }
      
      InvestmentAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Activities by Investment ID
export const GET_INVESTMENT_ACTIVITIES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentActivitiesByInvestmentId {
      InvestmentActivity(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY_REF}
        
        # Documents relation (includes fileInfo)
        documents(where: { isDeleted: { _eq: false } }) {
          ${buildDocumentFragment(InvestmentDocumentFields)}
        }
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment Tasks by Investment ID
export const GET_INVESTMENT_TASKS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentTasksByInvestmentId {
      InvestmentTask(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK_REF}
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment by ID with full details
export const GET_INVESTMENT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentById {
      Investment(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT}
      }
    }
  `
}

// Search Investments (lightweight for autocomplete)
export const SEARCH_INVESTMENTS = (variables: InvestmentQueryVariables): string => {
  const { search = '', limit = 10 } = variables

  return `
    query SearchInvestments {
      Investment(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { isin: { _ilike: "%${search}%" } },
                { fundManagerName: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        id
        code
        name
        isin
        initialInvestmentAmount
        totalInvestmentAmount
        investmentMarketValue
        acquisitionDate
        exitDate
        stakePercentage
        
        investmentType {
          ${CATALOG_ENTRY}
        }
        investmentStatus {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        ownerEmployee {
          id
          displayName
        }
        investmentAccounts(where: { isDeleted: { _eq: false } }) {
          id
          investmentAccountId
          investmentAccount {
            ${INVESTMENT_ACCOUNT_REF}
          }
        }
      }
    }
  `
}

// Get Investment Shareholders by Investment ID
export const GET_INVESTMENT_SHAREHOLDERS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentShareholdersByInvestmentId {
      InvestmentShareholder(
        where: { 
          investmentId: { _eq: "${investmentId}" }
          isDeleted: { _eq: false }
        }
        orderBy: { stakePercentage: DESC_NULLS_LAST }
      ) {
        ${INVESTMENT_SHAREHOLDER}
      }
    }
  `
}
