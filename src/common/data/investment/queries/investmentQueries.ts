// Investment Queries - Core investment entities and their specializations
// Built using actual schema discovered via newwork-mcp
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import {
  INVESTMENT,
  EQUITY_INVESTMENT_REF,
  EQUITY_INVESTMENT,
  REAL_ESTATE_INVESTMENT_REF,
  REAL_ESTATE_INVESTMENT,
  LIQUID_FUND_INVESTMENT_REF,
  LIQUID_FUND_INVESTMENT
} from './fragments/investmentFragments'
import {
  INVESTMENT_ACTIVITY,
  INVESTMENT_TASK,
  INVESTMENT_NOTE,
  INVESTMENT_DOCUMENT,
  INVESTMENT_ACCOUNT_REF,
  INVESTMENT_CONTACT_REF,
  INVESTMENT_OPPORTUNITY_REF
} from './fragments/investmentRelationFragments'

export interface InvestmentQueryVariables {
  ids?: string[]
  search?: string
  investmentTypeIds?: string[]
  investmentStatusIds?: string[]
  investmentGroupIds?: string[]
  investmentPhaseIds?: string[]
  investmentRiskLevelIds?: string[]
  currencyIds?: string[]
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
    whereClause += `, investmentAccount: { id: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  if (variables.opportunityIds?.length) {
    whereClause += `, investmentOpportunity: { id: { _in: [${variables.opportunityIds.map(id => `"${id}"`).join(', ')}] } }`
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
        
        # Entity relationships (simplified)
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
        }
        investmentOpportunity {
          ${INVESTMENT_OPPORTUNITY_REF}
        }
        
        # Investment specializations (simplified)
        equityInvestment {
          ${EQUITY_INVESTMENT_REF}
        }
        
        realEstateInvestment {
          ${REAL_ESTATE_INVESTMENT_REF}
        }
        
        liquidFundInvestment {
          ${LIQUID_FUND_INVESTMENT_REF}
        }
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
        ${INVESTMENT_ACTIVITY}
        
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
        ${INVESTMENT_TASK}
        
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

// Get Investment Notes by Investment ID
export const GET_INVESTMENT_NOTES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentNotesByInvestmentId {
      InvestmentNote(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE}
        
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

// Get Investment Note by ID
export const GET_INVESTMENT_NOTE_BY_ID = (noteId: string): string => {
  return `
    query GetInvestmentNoteById {
      InvestmentNote(
        where: { 
          id: { _eq: "${noteId}" }, 
          isDeleted: { _eq: false } 
        }
      ) {
        ${INVESTMENT_NOTE}
        
        # Entity references
        investment {
          id
          code
          name
        }
        account {
          id
          name
        }
        contact {
          id
          firstName
          lastName
        }
        lead {
          id
          firstName
          lastName
        }
        
        # Documents relationship
        documents(where: { isDeleted: { _eq: false } }) {
          id
          version
          name
          description
          file
          fileSize
          mimeType
          documentGroup {
            id
            value
            code
          }
          documentType {
            id
            value
            code
          }
        }
        opportunity {
          id
          name
        }
      }
    }
  `
}

// Get Investment Documents by Investment ID
export const GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentDocumentsByInvestmentId {
      InvestmentDocument(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
        # Entity references
        investment {
          id
          code
          name
        }
        
        # Parent document reference (for folders)
        parentDocument {
          id
          name
          description
        }
        
        # Related activity and task references
        activity {
          id
          title
          description
        }
        task {
          id
          name
          description
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
        
        # Entity relationships
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
          investmentAccountContact {
            contactType
            contact {
              ${INVESTMENT_CONTACT_REF}
            }
          }
        }
        
        # Loan recipient investment account
        loanRecipientInvestmentAccount {
          id
          code
          name
          email
          foundationDate
          geographicPresence
          companySize {
            ${CATALOG_ENTRY}
          }
          accountAnnualRevenueBand {
            ${CATALOG_ENTRY}
          }
          industryClass {
            ${CATALOG_ENTRY}
          }
          ${AUDIT_FIELDS}
        }
        
        # All investment specializations with full details
        equityInvestment {
          ${EQUITY_INVESTMENT}
        }
        
        realEstateInvestment {
          ${REAL_ESTATE_INVESTMENT}
        }
        
        liquidFundInvestment {
          ${LIQUID_FUND_INVESTMENT}
        }
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
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
        }
      }
    }
  `
}
