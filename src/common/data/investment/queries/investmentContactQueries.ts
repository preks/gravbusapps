// Investment Contact Queries - Complete queries using shared fragments
import {
  INVESTMENT_CONTACT,
  INVESTMENT_ACTIVITY,
  INVESTMENT_NOTE,
  INVESTMENT_DOCUMENT
} from './fragments/investmentFragments'
import { INVESTMENT_TASK_REF } from './fragments/investmentReferenceFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_CONTACT_DESCRIPTORS } from '@/common/data/investment/types/investmentContactTypes'
export interface InvestmentContactQueryVariables {
  ids?: string[]
  search?: string
  academicTitleIds?: string[]
  salutationIds?: string[]
  languageIds?: string[]
  ownerEmployeeIds?: string[]
  accountIds?: string[]
  contactTypes?: string[]
  departments?: string[]
  fullNames?: string[]
  // Created timestamps
  createdAtFrom?: string
  createdAtTo?: string
  birthDateFrom?: string
  birthDateTo?: string
  // Contact info presence filters
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

// Build where condition for Investment Contact queries
export const buildInvestmentContactWhereCondition = (variables: InvestmentContactQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // IDs filter
  if (variables.ids && variables.ids.length > 0) {
    whereClause += `, id: { _in: ["${variables.ids.join('","')}"] }`
  }

  // Custom filters for hasEmail/missingEmail/hasPhone/missingPhone
  if (variables.hasEmail) whereClause += `, email: { _isNull: false, _neq: "" }`
  if (variables.missingEmail) whereClause += `, _or: [ { email: { _isNull: true } }, { email: { _eq: "" } } ]`
  if (variables.hasPhone) whereClause += `, phone: { _isNull: false, _neq: "" }`
  if (variables.missingPhone) whereClause += `, _or: [ { phone: { _isNull: true } }, { phone: { _eq: "" } } ]`

  // Apply filters using descriptors
  const filterConditions = buildFilter(variables, INVESTMENT_CONTACT_DESCRIPTORS)
  if (filterConditions) {
    whereClause += `, ${filterConditions}`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, INVESTMENT_CONTACT_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

// Get Investment Contacts with full details
export const GET_INVESTMENT_CONTACTS = (variables: InvestmentContactQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentContactWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, INVESTMENT_CONTACT_DESCRIPTORS)

  return `
    query GetInvestmentContacts {
      InvestmentContact(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_CONTACT}
        
        # Aggregate counts for relationships
        investmentAccountContactAggregate {
          aggregate {
            count
          }
        }
        investmentActivityAggregate {
          aggregate {
            count
          }
        }
        investmentDocumentAggregate {
          aggregate {
            count
          }
        }
        investmentNoteAggregate {
          aggregate {
            count
          }
        }
        investmentTaskAggregate {
          aggregate {
            count
          }
        }
      }
      
      InvestmentContactAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Contact by ID
export const GET_INVESTMENT_CONTACT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentContactById {
      InvestmentContact(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_CONTACT}
      }
    }
  `
}

// =====================================================
// INVESTMENT CONTACT RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Contact ID
export const GET_INVESTMENT_TASKS_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetInvestmentTasksByContactId {
      InvestmentTask(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK_REF}
        
        # Entity references
        contact {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}

// Get Investment Activities by Contact ID
export const GET_INVESTMENT_ACTIVITIES_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetInvestmentActivitiesByContactId {
      InvestmentActivity(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY}
        
        # Entity references
        contact {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}

// Get Investment Notes by Contact ID
export const GET_INVESTMENT_NOTES_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetInvestmentNotesByContactId {
      InvestmentNote(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE}
        
        # Entity references
        contact {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}

// Get Investment Documents by Contact ID
export const GET_INVESTMENT_DOCUMENTS_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetInvestmentDocumentsByContactId {
      InvestmentDocument(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
        # Entity references
        contact {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}
