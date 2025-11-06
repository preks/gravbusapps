// Customer Contact Queries - using shared fragments
import { CUSTOMER_CONTACT } from './fragments/customerFragments'
import {
  CUSTOMER_TASK_REF,
  CUSTOMER_ACTIVITY_REF,
  CUSTOMER_DOCUMENT_REF,
  CUSTOMER_NOTE_REF
} from './fragments/customerReferenceFragments'

import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'

export interface CustomerContactQueryVariables {
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
  createdAtFrom?: string
  createdAtTo?: string
  birthDateFrom?: string
  birthDateTo?: string
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

export const buildCustomerContactWhereCondition = (variables: CustomerContactQueryVariables = {}) => {
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
  const filterConditions = buildFilter(variables, CUSTOMER_CONTACT_DESCRIPTORS)
  if (filterConditions) {
    whereClause += `, ${filterConditions}`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, CUSTOMER_CONTACT_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

export const GET_CUSTOMER_CONTACTS = (variables: CustomerContactQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerContactWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, CUSTOMER_CONTACT_DESCRIPTORS)

  return `
    query GetCustomerContacts {
      CustomerContact: Contact(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
          ${CUSTOMER_CONTACT}
      }
      CustomerContactAggregate: ContactAggregate(${where}) { aggregate { count } }
    }
  `
}

export const GET_CUSTOMER_CONTACT_BY_ID = (id: string): string => {
  return `
    query GetCustomerContactById {
      CustomerContact: Contact(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_CONTACT}
      }
    }
  `
}

export const SEARCH_CUSTOMER_CONTACTS = (variables: CustomerContactQueryVariables): string => {
  const { search = '', limit = 10 } = variables
  return `
    query SearchCustomerContacts {
      CustomerContact: Contact(
        where: {
          isDeleted: { _eq: false }
          _and: [ { _or: [
            { firstName: { _ilike: "%${search}%" } },
            { lastName: { _ilike: "%${search}%" } },
            { email: { _ilike: "%${search}%" } },
            { code: { _ilike: "%${search}%" } }
          ] } ]
        }
        limit: ${limit}
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        code
        firstName
        lastName
        email
      }
    }
  `
}

// Get Customer Tasks by Contact ID
export const GET_CUSTOMER_TASKS_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetCustomerTasksByContactId {
      SalesTask(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK_REF}

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

// Get Customer Activities by Contact ID
export const GET_CUSTOMER_ACTIVITIES_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetCustomerActivitiesByContactId {
      SalesActivity(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_ACTIVITY_REF}

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

// Get Customer Notes by Contact ID
export const GET_CUSTOMER_NOTES_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetCustomerNotesByContactId {
      CrmNote(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_NOTE_REF}
        
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

// Get Customer Documents by Contact ID
export const GET_CUSTOMER_DOCUMENTS_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetCustomerDocumentsByContactId {
      CrmDocument(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_DOCUMENT_REF}
        
        # Entity references
        contact {
          id
          code
          firstName
          lastName
          fullName
        }
      }
    }
  `
}
