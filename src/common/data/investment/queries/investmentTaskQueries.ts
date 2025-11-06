// Investment Task Queries - generic task list queries for investment relations
import { INVESTMENT_TASK } from './fragments/investmentFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_TASK_DESCRIPTORS } from '@/common/data/investment/types/investmentTaskTypes'

export interface InvestmentTaskQueryVariables {
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
  referenceTypes?: string[]

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

// Build where condition for Investment Task queries
export const buildInvestmentTaskWhereCondition = (variables: InvestmentTaskQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Generic search across dot-paths from descriptors
  const searchOr = buildSearch(variables.search || '', INVESTMENT_TASK_DESCRIPTORS)
  if (searchOr) whereClause += `, ${searchOr}`

  // Generic AND filters from descriptors
  const andFilters = buildFilter(variables as any, INVESTMENT_TASK_DESCRIPTORS)
  if (andFilters) whereClause += `, ${andFilters}`

  // Handle reference type filtering
  if (variables.referenceTypes && variables.referenceTypes.length > 0) {
    const referenceConditions = variables.referenceTypes
      .map(type => {
        switch (type) {
          case 'opportunity':
            return '{ opportunity: { id: { _neq: null } } }'
          case 'account':
            return '{ account: { id: { _neq: null } } }'
          case 'lead':
            return '{ lead: { id: { _neq: null } } }'
          case 'contact':
            return '{ contact: { id: { _neq: null } } }'
          default:
            return null
        }
      })
      .filter(Boolean)

    if (referenceConditions.length > 0) {
      whereClause += `, _or: [${referenceConditions.join(', ')}]`
    }
  }

  whereClause += ' }'
  return whereClause
}

// Get Investment Tasks with full details and aggregate count
export const GET_INVESTMENT_TASKS = (variables: InvestmentTaskQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentTaskWhereCondition(variables)

  const orderByBuilt = buildOrderBy(variables.orderBy || [], INVESTMENT_TASK_DESCRIPTORS)
  const orderByClause = orderByBuilt || 'orderBy: [{ createdAt: DESC }]'

  return `
    query GetInvestmentTasks {
      InvestmentTask(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_TASK}
      }

      InvestmentTaskAggregate(${where}) {
        aggregate { count }
      }
    }
  `
}

// Get a single Investment Task by ID
export const GET_INVESTMENT_TASK_BY_ID = `
  query GetInvestmentTaskById($id: uuid!) {
    InvestmentTask(where: { id: { _eq: $id } }, limit: 1) {
      ${INVESTMENT_TASK}
      
      # Documents relationship
      investmentDocument(where: { isDeleted: { _eq: false } }) {
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
    }
  }
`

// Get investment tasks by account ID (alias for backward compatibility)
export const GET_INVESTMENT_TASKS_BY_ACCOUNT_ID = (accountId: string) => {
  return GET_INVESTMENT_TASKS({
    accountIds: [accountId]
  })
}
