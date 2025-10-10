// Customer Lead Queries - using shared fragments
import {
  CUSTOMER_LEAD,
  CUSTOMER_ACCOUNT_REF,
  CUSTOMER_TASK,
  CUSTOMER_SALES_ACTIVITY,
  CUSTOMER_CRM_NOTE,
  CUSTOMER_CRM_DOCUMENT
} from './fragments/customerRelationFragments'

export interface CustomerLeadQueryVariables {
  ids?: string[]
  search?: string
  sensitive?: boolean
  academicTitleIds?: string[]
  salutationIds?: string[]
  leadStatusIds?: string[]
  leadSourceIds?: string[]
  leadRatingIds?: string[]
  industryClassIds?: string[]
  companySizeIds?: string[]
  ownerEmployeeIds?: string[]
  conversionDateFrom?: string
  conversionDateTo?: string
  createdAtFrom?: string
  createdAtTo?: string
  companyNames?: string[]
  regions?: string[]
  localities?: string[]
  contactFullNames?: string[]
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

export const buildCustomerLeadWhereCondition = (variables: CustomerLeadQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  if (variables.search?.trim()) {
    const q = variables.search.trim()
    whereClause += `, _or: [
      { firstName: { _ilike: "%${q}%" } },
      { lastName: { _ilike: "%${q}%" } },
      { email: { _ilike: "%${q}%" } },
      { phoneNumber: { _ilike: "%${q}%" } },
      { position: { _ilike: "%${q}%" } },
      { companyName: { _ilike: "%${q}%" } },
      { companyEmail: { _ilike: "%${q}%" } },
      { companyPhone: { _ilike: "%${q}%" } },
      { companyWebsite: { _ilike: "%${q}%" } },
      { code: { _ilike: "%${q}%" } },
      { description: { _ilike: "%${q}%" } }
    ]`
  }

  if (variables.academicTitleIds?.length)
    whereClause += `, academicTitle: { id: { _in: [${variables.academicTitleIds.map(id => `"${id}"`).join(', ')}] } }`
  // salutation catalog may not exist on Lead in this schema
  if (variables.leadStatusIds?.length)
    whereClause += `, leadStatus: { id: { _in: [${variables.leadStatusIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.leadSourceIds?.length)
    whereClause += `, leadSource: { id: { _in: [${variables.leadSourceIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.leadRatingIds?.length)
    whereClause += `, leadRating: { id: { _in: [${variables.leadRatingIds.map(id => `"${id}"`).join(', ')}] } }`
  // industryClass not available in Lead schema (per MCP)
  if (variables.companySizeIds?.length)
    whereClause += `, companySize: { id: { _in: [${variables.companySizeIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.ownerEmployeeIds?.length)
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.conversionDateFrom) whereClause += `, conversionDate: { _gte: "${variables.conversionDateFrom}" }`
  if (variables.conversionDateTo) whereClause += `, conversionDate: { _lte: "${variables.conversionDateTo}" }`
  if (variables.createdAtFrom) whereClause += `, createdAt: { _gte: "${variables.createdAtFrom}" }`
  if (variables.createdAtTo) whereClause += `, createdAt: { _lte: "${variables.createdAtTo}" }`
  if (variables.companyNames?.length)
    whereClause += `, companyName: { _in: [${variables.companyNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(', ')}] }`
  if (variables.regions?.length)
    whereClause += `, region: { value: { _in: [${variables.regions.map(r => `"${r.replace(/"/g, '\\"')}"`).join(', ')}] } }`
  if (variables.localities?.length)
    whereClause += `, locality: { _in: [${variables.localities.map(c => `"${c.replace(/"/g, '\\"')}"`).join(', ')}] }`
  if (typeof variables.sensitive === 'boolean') whereClause += `, sensitive: { _eq: ${variables.sensitive} }`

  whereClause += ' }'
  return whereClause
}

export const GET_CUSTOMER_LEADS = (variables: CustomerLeadQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerLeadWhereCondition(variables)
  const orderByClause = variables.orderBy?.length
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ createdAt: DESC }]'

  return `
    query GetCustomerLeads {
      CustomerLead: Lead(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_LEAD}
      }
      CustomerLeadAggregate: LeadAggregate(${where}) { aggregate { count } }
    }
  `
}

export const GET_CUSTOMER_LEAD_BY_ID = (id: string): string => {
  return `
    query GetCustomerLeadById {
      CustomerLead: Lead(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_LEAD}
        account { ${CUSTOMER_ACCOUNT_REF} }
      }
    }
  `
}

export const SEARCH_CUSTOMER_LEADS = (variables: CustomerLeadQueryVariables): string => {
  const { search = '', limit = 10 } = variables
  return `
    query SearchCustomerLeads {
      CustomerLead: Lead(
        where: {
          isDeleted: { _eq: false }
          _and: [ { _or: [
            { firstName: { _ilike: "%${search}%" } },
            { lastName: { _ilike: "%${search}%" } },
            { email: { _ilike: "%${search}%" } },
            { companyName: { _ilike: "%${search}%" } },
            { code: { _ilike: "%${search}%" } }
          ] } ]
        }
        limit: ${limit}
        orderBy: [{ firstName: ASC }]
      ) {
        id
        code
        firstName
        lastName
        sensitive
        email
        companyName
      }
    }
  `
}

// Get Customer Tasks by Lead ID
export const GET_CUSTOMER_TASKS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetCustomerTasksByLeadId {
      SalesTask(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK}

        # Entity references
        lead {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `
}

// Get Customer Activities by Lead ID
export const GET_CUSTOMER_ACTIVITIES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetCustomerActivitiesByLeadId {
      SalesActivity(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_SALES_ACTIVITY}

        # Entity references
        lead {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `
}

// Get Customer Notes by Lead ID
export const GET_CUSTOMER_NOTES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetCustomerNotesByLeadId {
      CrmNote(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_CRM_NOTE}
        
        # Entity references
        lead {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `
}

// Get Customer Documents by Lead ID
export const GET_CUSTOMER_DOCUMENTS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetCustomerDocumentsByLeadId {
      CrmDocument(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_CRM_DOCUMENT}
        
        # Entity references
        lead {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `
}
