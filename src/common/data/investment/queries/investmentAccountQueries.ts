// Investment Account Queries - Complete queries without custom fragments
// Using only common fragments: CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE
import {
  INVESTMENT_ACCOUNT,
  INVESTMENT_CONTACT_REF,
  INVESTMENT_TASK,
  INVESTMENT_ACTIVITY,
  INVESTMENT_NOTE,
  INVESTMENT_DOCUMENT
} from './fragments/investmentRelationFragments'
import { INVESTMENT_REF } from './fragments/investmentFragments'

export interface InvestmentAccountQueryVariables {
  ids?: string[]
  search?: string
  industryClassIds?: string[]
  industryClassCodes?: string[]
  industryIds?: string[]
  companySizeIds?: string[]
  companySizeCodes?: string[]
  legalFormIds?: string[]
  legalFormCodes?: string[]
  accountAnnualRevenueBandIds?: string[]
  accountAnnualRevenueBandCodes?: string[]
  revenueBandIds?: string[]
  ownerEmployeeIds?: string[]
  recordStates?: string[]
  countryIds?: string[]
  regionIds?: string[]
  cities?: string[]
  names?: string[]
  geographicPresenceValues?: string[]
  // Created timestamps
  createdAfter?: string
  createdBefore?: string
  createdAtFrom?: string
  createdAtTo?: string
  foundationDateFrom?: string
  foundationDateTo?: string
  // Contact info presence filters
  hasWebsite?: boolean
  missingWebsite?: boolean
  hasEmail?: boolean
  missingEmail?: boolean
  hasPhone?: boolean
  missingPhone?: boolean
  hasContact?: boolean
  missingContact?: boolean
  // Status filters
  isActive?: boolean
  isInactive?: boolean
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Investment Account queries
export const buildInvestmentAccountWhereCondition = (variables: InvestmentAccountQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  const andConditions: string[] = []
  const orConditions: string[] = []

  // Search across multiple fields
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim()
    orConditions.push(
      `{ name: { _ilike: "%${searchTerm}%" } }`,
      `{ code: { _ilike: "%${searchTerm}%" } }`,
      `{ email: { _ilike: "%${searchTerm}%" } }`,
      `{ phone: { _ilike: "%${searchTerm}%" } }`,
      `{ geographicPresence: { _ilike: "%${searchTerm}%" } }`,
      `{ specialty: { _ilike: "%${searchTerm}%" } }`,
      `{ mission: { _ilike: "%${searchTerm}%" } }`
    )
  }

  // Filter by specific fields
  // Industry filter (supports both industryIds and industryClassIds)
  const industryFilterIds = variables.industryIds || variables.industryClassIds
  if (industryFilterIds?.length) {
    andConditions.push(`{ industryClass: { id: { _in: [${industryFilterIds.map(id => `"${id}"`).join(', ')}] } } }`)
  }
  if (variables.industryClassCodes?.length) {
    andConditions.push(
      `{ industryClass: { code: { _in: [${variables.industryClassCodes.map(c => `"${c}"`).join(', ')}] } } }`
    )
  }

  // Company Size filter
  if (variables.companySizeIds?.length) {
    andConditions.push(
      `{ companySize: { id: { _in: [${variables.companySizeIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }
  if (variables.companySizeCodes?.length) {
    andConditions.push(
      `{ companySize: { code: { _in: [${variables.companySizeCodes.map(c => `"${c}"`).join(', ')}] } } }`
    )
  }

  // Legal Form filter
  if (variables.legalFormIds?.length) {
    andConditions.push(`{ legalForm: { id: { _in: [${variables.legalFormIds.map(id => `"${id}"`).join(', ')}] } } }`)
  }
  if (variables.legalFormCodes?.length) {
    andConditions.push(`{ legalForm: { code: { _in: [${variables.legalFormCodes.map(c => `"${c}"`).join(', ')}] } } }`)
  }

  // Revenue Band filter (supports both revenueBandIds and accountAnnualRevenueBandIds)
  const revenueFilterIds = variables.revenueBandIds || variables.accountAnnualRevenueBandIds
  if (revenueFilterIds?.length) {
    andConditions.push(
      `{ accountAnnualRevenueBand: { id: { _in: [${revenueFilterIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }
  if (variables.accountAnnualRevenueBandCodes?.length) {
    andConditions.push(
      `{ accountAnnualRevenueBand: { code: { _in: [${variables.accountAnnualRevenueBandCodes.map(c => `"${c}"`).join(', ')}] } } }`
    )
  }

  // Owner filter
  if (variables.ownerEmployeeIds?.length) {
    andConditions.push(
      `{ ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }

  // Record State filter
  if (variables.recordStates?.length) {
    andConditions.push(`{ recordState: { _in: [${variables.recordStates.map(s => `"${s}"`).join(', ')}] } }`)
  }

  // Country filter (from investmentAddress)
  if (variables.countryIds?.length) {
    andConditions.push(
      `{ investmentAddress: { country: { id: { _in: [${variables.countryIds.map(id => `"${id}"`).join(', ')}] } } } }`
    )
  }

  // Region filter (from investmentAddress)
  if (variables.regionIds?.length) {
    andConditions.push(
      `{ investmentAddress: { region: { id: { _in: [${variables.regionIds.map(id => `"${id}"`).join(', ')}] } } } }`
    )
  }

  // City filter
  if (variables.cities?.length) {
    andConditions.push(
      `{ investmentAddress: { locality: { _in: [${variables.cities.map(c => `"${c}"`).join(', ')}] } } }`
    )
  }

  if (variables.names?.length) {
    andConditions.push(`{ name: { _in: [${variables.names.map(n => `"${n}"`).join(', ')}] } }`)
  }

  if (variables.geographicPresenceValues?.length) {
    andConditions.push(
      `{ geographicPresence: { _in: [${variables.geographicPresenceValues.map(v => `"${v}"`).join(', ')}] } }`
    )
  }

  // CreatedAt range (support both createdAfter/Before and createdAtFrom/To)
  const createdFrom = variables.createdAfter || variables.createdAtFrom
  const createdTo = variables.createdBefore || variables.createdAtTo
  if (createdFrom || createdTo) {
    const parts: string[] = []
    if (createdFrom) parts.push(`_gte: "${createdFrom}"`)
    if (createdTo) parts.push(`_lte: "${createdTo}"`)
    andConditions.push(`{ createdAt: { ${parts.join(', ')} } }`)
  }

  // Foundation date range
  if (variables.foundationDateFrom || variables.foundationDateTo) {
    const parts: string[] = []
    if (variables.foundationDateFrom) parts.push(`_gte: "${variables.foundationDateFrom}"`)
    if (variables.foundationDateTo) parts.push(`_lte: "${variables.foundationDateTo}"`)
    andConditions.push(`{ foundationDate: { ${parts.join(', ')} } }`)
  }

  // Contact info presence
  if (variables.hasWebsite) {
    andConditions.push(`{ website: { _isNull: false, _neq: "" } }`)
  }
  if (variables.missingWebsite) {
    andConditions.push(`{ _or: [ { website: { _isNull: true } }, { website: { _eq: "" } } ] }`)
  }
  if (variables.hasEmail) {
    andConditions.push(`{ email: { _isNull: false, _neq: "" } }`)
  }
  if (variables.missingEmail) {
    andConditions.push(`{ _or: [ { email: { _isNull: true } }, { email: { _eq: "" } } ] }`)
  }
  if (variables.hasPhone) {
    andConditions.push(`{ phone: { _isNull: false, _neq: "" } }`)
  }
  if (variables.missingPhone) {
    andConditions.push(`{ _or: [ { phone: { _isNull: true } }, { phone: { _eq: "" } } ] }`)
  }
  if (variables.hasContact) {
    andConditions.push(`{ investmentAccountContact: { id: { _isNull: false } } }`)
  }
  if (variables.missingContact) {
    andConditions.push(`{ _not: { investmentAccountContact: { id: { _isNull: false } } } }`)
  }

  // Status filters (based on liquidationDate)
  if (variables.isActive) {
    andConditions.push(`{ liquidationDate: { _isNull: true } }`)
  }
  if (variables.isInactive) {
    andConditions.push(`{ liquidationDate: { _isNull: false } }`)
  }

  if (orConditions.length) {
    whereClause += `, _or: [${orConditions.join(', ')}]`
  }
  if (andConditions.length) {
    whereClause += `, _and: [${andConditions.join(', ')}]`
  }

  whereClause += ' }'
  return whereClause
}

// Get Investment Accounts with full details
export const GET_INVESTMENT_ACCOUNTS = (variables: InvestmentAccountQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentAccountWhereCondition(variables)

  const orderByClause = variables.orderBy?.length
    ? `orderBy: [${variables.orderBy
        .map(o => {
          const f = o.field
          if (f === 'legalForm' || f === 'industryClass' || f === 'companySize' || f === 'accountAnnualRevenueBand') {
            return `{ ${f}: { value: ${o.direction} } }`
          }
          if (f === 'ownerEmployee') {
            return `{ ownerEmployee: { displayName: ${o.direction} } }`
          }
          return `{ ${f}: ${o.direction} }`
        })
        .join(', ')}]`
    : 'orderBy: [{ name: ASC_NULLS_LAST }]'

  return `
    query GetInvestmentAccounts {
      InvestmentAccount(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_ACCOUNT}
        
        # Aggregate counts for relationships
        investmentAggregate {
          aggregate {
            count
          }
        }
        investmentAccountContactAggregate {
          aggregate {
            count
          }
        }
        investmentLeadAggregate {
          aggregate {
            count
          }
        }
        investmentOpportunityAggregate {
          aggregate {
            count
          }
        }
      }
      
      InvestmentAccountAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Account by ID
export const GET_INVESTMENT_ACCOUNT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentAccountById {
      InvestmentAccount(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_ACCOUNT}
        
        # Related investments
        investment {
          ${INVESTMENT_REF}
        }
        
        # Related contacts
        investmentAccountContact {
          id
          contactType
          contact {
            ${INVESTMENT_CONTACT_REF}
          }
        }
      }
    }
  `
}

// Search Investment Accounts (lightweight for autocomplete)
export const SEARCH_INVESTMENT_ACCOUNTS = (variables: InvestmentAccountQueryVariables): string => {
  const { search = '', limit = 10 } = variables

  return `
    query SearchInvestmentAccounts {
      InvestmentAccount(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { email: { _ilike: "%${search}%" } },
                { geographicPresence: { _ilike: "%${search}%" } }
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
        email
        geographicPresence
        industryClass {
          id
          code
          value
        }
        companySize {
          id
          code
          value
        }
        ownerEmployee {
          id
          displayName
        }
      }
    }
  `
}

// =====================================================
// INVESTMENT ACCOUNT RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Account ID
export const GET_INVESTMENT_TASKS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentTasksByAccountId {
      InvestmentTask(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK}
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment Activities by Account ID
export const GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentActivitiesByAccountId {
      InvestmentActivity(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY}

        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment Notes by Account ID
export const GET_INVESTMENT_NOTES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentNotesByAccountId {
      InvestmentNote(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE}
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment Documents by Account ID
export const GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentDocumentsByAccountId {
      InvestmentDocument(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `
}
