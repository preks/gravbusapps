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
  industryClassIds?: string[]
  companySizeIds?: string[]
  legalFormIds?: string[]
  annualRevenueIds?: string[]
  ownerEmployeeIds?: string[]
  names?: string[]
  geographicPresenceValues?: string[]
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
      `{ email: { _ilike: "%${q}%" } }`,
      `{ phone: { _ilike: "%${q}%" } }`,
      `{ website: { _ilike: "%${q}%" } }`,
      `{ geographicPresence: { _ilike: "%${q}%" } }`
    )
  }

  if (variables.industryClassIds?.length) {
    andConditions.push(
      `{ industryClass: { id: { _in: [${variables.industryClassIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }
  if (variables.companySizeIds?.length) {
    andConditions.push(
      `{ companySize: { id: { _in: [${variables.companySizeIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }
  if (variables.legalFormIds?.length) {
    andConditions.push(`{ legalForm: { id: { _in: [${variables.legalFormIds.map(id => `"${id}"`).join(', ')}] } } }`)
  }
  if (variables.annualRevenueIds?.length) {
    andConditions.push(
      `{ annualRevenue: { id: { _in: [${variables.annualRevenueIds.map(id => `"${id}"`).join(', ')}] } } }`
    )
  }
  if (variables.ownerEmployeeIds?.length) {
    andConditions.push(
      `{ ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } } }`
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

  if (variables.createdAtFrom || variables.createdAtTo) {
    const parts: string[] = []
    if (variables.createdAtFrom) parts.push(`_gte: "${variables.createdAtFrom}"`)
    if (variables.createdAtTo) parts.push(`_lte: "${variables.createdAtTo}"`)
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
  if (variables.hasEmail) andConditions.push(`{ email: { _isNull: false, _neq: "" } }`)
  if (variables.missingEmail) andConditions.push(`{ _or: [ { email: { _isNull: true } }, { email: { _eq: "" } } ] }`)
  if (variables.hasPhone) andConditions.push(`{ phone: { _isNull: false, _neq: "" } }`)
  if (variables.missingPhone) andConditions.push(`{ _or: [ { phone: { _isNull: true } }, { phone: { _eq: "" } } ] }`)

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
