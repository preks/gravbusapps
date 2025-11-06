// Customer Lead Queries
import { CUSTOMER_LEAD } from './fragments/customerFragments'
import {
  CUSTOMER_LEAD_REF,
  CUSTOMER_TASK_REF,
  CUSTOMER_ACTIVITY_REF,
  CUSTOMER_DOCUMENT_REF,
  CUSTOMER_NOTE_REF,
  CUSTOMER_ACCOUNT_REF,
  CUSTOMER_CONTACT_REF,
  CUSTOMER_OPPORTUNITY_REF
} from './fragments/customerReferenceFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { CUSTOMER_LEAD_DESCRIPTORS } from '@/common/data/customer/types/customerLeadTypes'

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

  // Generic search across dot-paths from descriptors
  const searchOr = buildSearch(variables.search || '', CUSTOMER_LEAD_DESCRIPTORS)
  if (searchOr) whereClause += `, ${searchOr}`

  // Generic AND filters from descriptors
  const andFilters = buildFilter(variables as any, CUSTOMER_LEAD_DESCRIPTORS)
  if (andFilters) whereClause += `, ${andFilters}`

  whereClause += ' }'
  return whereClause
}

export const GET_CUSTOMER_LEADS = (variables: CustomerLeadQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerLeadWhereCondition(variables)
  const orderBy = buildOrderBy(variables.orderBy || [], CUSTOMER_LEAD_DESCRIPTORS) || 'orderBy: [{ createdAt: DESC }]'

  return `
    query GetCustomerLeads {
      CustomerLead: Lead(
        limit: ${limit}
        offset: ${offset}
        ${orderBy}
        ${where}
      ) {
        ${CUSTOMER_LEAD_REF}
        convertedAccount {
          ${CUSTOMER_ACCOUNT_REF}
        }
        convertedContact {
          ${CUSTOMER_CONTACT_REF}
        }     
        convertedOpportunity {
          ${CUSTOMER_OPPORTUNITY_REF}
        }
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
        ${CUSTOMER_TASK_REF}

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
        ${CUSTOMER_ACTIVITY_REF}

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
        ${CUSTOMER_NOTE_REF}
        
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
        ${CUSTOMER_DOCUMENT_REF}
        
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
