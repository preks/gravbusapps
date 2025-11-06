// Customer Task Queries - generic task list queries for customer relations
import { CUSTOMER_TASK } from './fragments/customerFragments'
import { CUSTOMER_TASK_REF } from './fragments/customerReferenceFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { CUSTOMER_TASK_DESCRIPTORS } from '@/common/data/customer/types/customerTaskTypes'

export interface CustomerTaskQueryVariables {
  search?: string
  taskTypeIds?: string[]
  taskPriorityIds?: string[]
  taskStatusIds?: string[]
  assignedEmployeeIds?: string[]
  creatorEmployeeIds?: string[]
  timingTypes?: string[]

  accountIds?: string[]
  contactIds?: string[]
  leadIds?: string[]
  opportunityIds?: string[]

  dueDateFrom?: string
  dueDateTo?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  createdAtFrom?: string
  createdAtTo?: string

  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Customer Task queries
export const buildCustomerTaskWhereCondition = (variables: CustomerTaskQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Generic search across dot-paths from descriptors
  const searchOr = buildSearch(variables.search || '', CUSTOMER_TASK_DESCRIPTORS)
  if (searchOr) whereClause += `, ${searchOr}`

  // Generic AND filters from descriptors
  const andFilters = buildFilter(variables as any, CUSTOMER_TASK_DESCRIPTORS)
  if (andFilters) whereClause += `, ${andFilters}`

  whereClause += ' }'
  return whereClause
}

// Get Customer Tasks with full details and aggregate count
export const GET_CUSTOMER_TASKS = (variables: CustomerTaskQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerTaskWhereCondition(variables)

  const orderByBuilt = buildOrderBy(variables.orderBy || [], CUSTOMER_TASK_DESCRIPTORS)
  const orderByClause = orderByBuilt || 'orderBy: [{ createdAt: DESC }]'

  return `
    query GetCustomerTasks {
      SalesTask(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_TASK}
      }

      SalesTaskAggregate(${where}) {
        aggregate { count }
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
        ${CUSTOMER_TASK_REF}

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

// Get Customer Tasks by Opportunity ID
export const GET_CUSTOMER_TASKS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetCustomerTasksByOpportunityId {
      SalesTask(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK_REF}

        # Entity references
        opportunity {
          id
          code
          name
        }
      }
    }
  `
}

// Get Customer Task by ID for editing
export const GET_CUSTOMER_TASK_BY_ID = (taskId: string): string => {
  return `
    query GetCustomerTaskById {
      SalesTask(
        where: { 
          id: { _eq: "${taskId}" }, 
          isDeleted: { _eq: false } 
        }
      ) {
        ${CUSTOMER_TASK}
      }
    }
  `
}
