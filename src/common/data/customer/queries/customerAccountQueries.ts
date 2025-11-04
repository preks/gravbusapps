// Customer Account Queries - using shared fragments
import {
  CUSTOMER_ACCOUNT,
  CUSTOMER_ACCOUNT_REF,
  CUSTOMER_TASK,
  CUSTOMER_SALES_ACTIVITY,
  CUSTOMER_CRM_NOTE,
  CUSTOMER_CRM_DOCUMENT
} from './fragments/customerRelationFragments'

export interface CustomerAccountQueryVariables {
  ids?: string[]
  search?: string
  // Catalog filters (using correct field names for Customer Accounts)
  industryIds?: string[]
  legalFormIds?: string[]
  companySizeIds?: string[]
  revenueBandIds?: string[]
  // Legacy support for Investment Account field names
  industryClassIds?: string[]
  annualRevenueIds?: string[]
  ownerEmployeeIds?: string[]
  recordStates?: string[]
  countryIds?: string[]
  regionIds?: string[]
  cities?: string[]
  names?: string[]
  geographicPresenceValues?: string[]
  createdAfter?: string
  createdBefore?: string
  createdAtFrom?: string
  createdAtTo?: string
  foundationDateFrom?: string
  foundationDateTo?: string
  hasWebsite?: boolean
  missingWebsite?: boolean
  hasEmail?: boolean
  missingEmail?: boolean
  hasPhone?: boolean
  missingPhone?: boolean
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

export const buildCustomerAccountWhereCondition = (variables: CustomerAccountQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  const andConditions: string[] = []
  const orConditions: string[] = []

  if (variables.search?.trim()) {
    const q = variables.search.trim()
    orConditions.push(
      `{ name: { _ilike: "%${q}%" } }`,
      `{ code: { _ilike: "%${q}%" } }`,
      `{ website: { _ilike: "%${q}%" } }`,
      `{ communicationChannels: { value: { _ilike: "%${q}%" } } }`
    )
  }

  // Industry filter (supports both 'industry' and 'industryClass' field names)
  if (variables.industryIds?.length) {
    andConditions.push(`{ industry: { id: { _in: [${variables.industryIds.map(id => `"${id}"`).join(', ')}] } } }`)
  }
  if (variables.industryClassIds?.length) {
    andConditions.push(`{ industry: { id: { _in: [${variables.industryClassIds.map(id => `"${id}"`).join(', ')}] } } }`)
  }

  // Legal Form filter
  if (variables.legalFormIds?.length) {
    andConditions.push(`{ legalForm: { id: { _in: [${variables.legalFormIds.map(id => `"${id}"`).join(', ')}] } } }`)
  }

  // Company Size filter (supports both 'numberOfEmployees' and 'companySize')
  if (variables.companySizeIds?.length) {
    andConditions.push(
      `{ numberOfEmployees: { id: { _in: [${variables.companySizeIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }

  // Annual Revenue filter (supports both 'annualRevenue' and legacy)
  if (variables.revenueBandIds?.length) {
    andConditions.push(
      `{ annualRevenue: { id: { _in: [${variables.revenueBandIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }
  if (variables.annualRevenueIds?.length) {
    andConditions.push(
      `{ annualRevenue: { id: { _in: [${variables.annualRevenueIds.map(id => `"${id}"`).join(', ')}] } } }`
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

  // Country filter (from addresses)
  if (variables.countryIds?.length) {
    andConditions.push(
      `{ crmAddress: { country: { id: { _in: [${variables.countryIds.map(id => `"${id}"`).join(', ')}] } } } }`
    )
  }

  // Region filter (from addresses)
  if (variables.regionIds?.length) {
    andConditions.push(
      `{ crmAddress: { region: { id: { _in: [${variables.regionIds.map(id => `"${id}"`).join(', ')}] } } } }`
    )
  }

  // City filter
  if (variables.cities?.length) {
    andConditions.push(`{ crmAddress: { city: { _in: [${variables.cities.map(c => `"${c}"`).join(', ')}] } } }`)
  }

  if (variables.names?.length) {
    andConditions.push(`{ name: { _in: [${variables.names.map(n => `"${n}"`).join(', ')}] } }`)
  }
  if (variables.geographicPresenceValues?.length) {
    andConditions.push(
      `{ geographicPresence: { _in: [${variables.geographicPresenceValues.map(v => `"${v}"`).join(', ')}] } }`
    )
  }

  // Date filters (support both createdAfter/Before and createdAtFrom/To)
  const createdFrom = variables.createdAfter || variables.createdAtFrom
  const createdTo = variables.createdBefore || variables.createdAtTo
  if (createdFrom || createdTo) {
    const parts: string[] = []
    if (createdFrom) parts.push(`_gte: "${createdFrom}"`)
    if (createdTo) parts.push(`_lte: "${createdTo}"`)
    andConditions.push(`{ createdAt: { ${parts.join(', ')} } }`)
  }
  if (variables.foundationDateFrom || variables.foundationDateTo) {
    const parts: string[] = []
    if (variables.foundationDateFrom) parts.push(`_gte: "${variables.foundationDateFrom}"`)
    if (variables.foundationDateTo) parts.push(`_lte: "${variables.foundationDateTo}"`)
    andConditions.push(`{ foundationDate: { ${parts.join(', ')} } }`)
  }

  if (variables.hasWebsite) andConditions.push(`{ website: { _isNull: false, _neq: "" } }`)
  if (variables.missingWebsite)
    andConditions.push(`{ _or: [ { website: { _isNull: true } }, { website: { _eq: "" } } ] }`)
  if (variables.hasEmail)
    andConditions.push(
      `{ communicationChannels: { communicationChannel: { alternativeCode: { _eq: "EMAIL" } }, value: { _isNull: false, _neq: "" } } }`
    )
  if (variables.missingEmail)
    andConditions.push(
      `{ _not: { communicationChannels: { communicationChannel: { alternativeCode: { _eq: "EMAIL" } } } } }`
    )
  if (variables.hasPhone)
    andConditions.push(
      `{ communicationChannels: { communicationChannel: { alternativeCode: { _eq: "PHONE" } }, value: { _isNull: false, _neq: "" } } }`
    )
  if (variables.missingPhone)
    andConditions.push(
      `{ _not: { communicationChannels: { communicationChannel: { alternativeCode: { _eq: "PHONE" } } } } }`
    )

  if (orConditions.length) whereClause += `, _or: [${orConditions.join(', ')}]`
  if (andConditions.length) whereClause += `, _and: [${andConditions.join(', ')}]`

  whereClause += ' }'
  return whereClause
}

export const GET_CUSTOMER_ACCOUNTS = (variables: CustomerAccountQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerAccountWhereCondition(variables)
  const orderByClause = variables.orderBy?.length
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ name: ASC }]'

  return `
    query GetCustomerAccounts {
      CustomerAccount: Account(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_ACCOUNT}
      }
      CustomerAccountAggregate: AccountAggregate(${where}) {
        aggregate { count }
      }
    }
  `
}

export const GET_CUSTOMER_ACCOUNT_BY_ID = (id: string): string => {
  return `
    query GetCustomerAccountById {
      CustomerAccount: Account(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_ACCOUNT}
      }
    }
  `
}

export const SEARCH_CUSTOMER_ACCOUNTS = (variables: CustomerAccountQueryVariables): string => {
  const { search = '', limit = 10 } = variables
  return `
    query SearchCustomerAccounts {
      CustomerAccount: Account(
        where: {
          isDeleted: { _eq: false }
          _and: [ { _or: [
            { name: { _ilike: "%${search}%" } },
            { code: { _ilike: "%${search}%" } },
            { email: { _ilike: "%${search}%" } },
            { website: { _ilike: "%${search}%" } }
          ] } ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        ${CUSTOMER_ACCOUNT_REF}
      }
    }
  `
}

// Get Customer Tasks by Account ID
export const GET_CUSTOMER_TASKS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetCustomerTasksByAccountId {
      SalesTask(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK}

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

// Get Customer Activities by Account ID
export const GET_CUSTOMER_ACTIVITIES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetCustomerActivitiesByAccountId {
      SalesActivity(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_SALES_ACTIVITY}

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

// Get Customer Notes by Account ID
export const GET_CUSTOMER_NOTES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetCustomerNotesByAccountId {
      CrmNote(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_CRM_NOTE}
        
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

// Get Customer Documents by Account ID
export const GET_CUSTOMER_DOCUMENTS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetCustomerDocumentsByAccountId {
      CrmDocument(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_CRM_DOCUMENT}
        
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
