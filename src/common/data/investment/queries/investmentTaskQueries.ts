// Investment Task Queries - generic task list queries for investment relations
import {
  INVESTMENT_TASK,
  INVESTMENT_ACCOUNT_REF,
  INVESTMENT_CONTACT_REF
} from './fragments/investmentRelationFragments'
import { buildOrderBy, buildSearch, buildFilter, type Descriptor } from '@/common/network/graphql/queryHelpers'

// Unified descriptors for InvestmentTask (search, sort, filters, and option metadata)
export const INVESTMENT_TASK_DESCRIPTORS: Descriptor[] = [
  // Search/sort
  { key: 'name', searchPaths: ['name', 'code', 'description'], sortPath: 'name', type: 'text' },
  { key: 'taskType', searchPaths: ['taskType.value', 'taskType.code'], sortPath: 'taskType.code', type: 'text' },
  {
    key: 'taskPriority',
    searchPaths: ['taskPriority.value', 'taskPriority.code'],
    sortPath: 'taskPriority.code',
    type: 'text'
  },
  {
    key: 'taskStatus',
    searchPaths: ['taskStatus.value', 'taskStatus.code'],
    sortPath: 'taskStatus.code',
    type: 'text'
  },
  {
    key: 'assignedEmployee',
    searchPaths: ['assignedEmployee.displayName', 'assignedEmployee.firstName', 'assignedEmployee.lastName'],
    sortPath: 'assignedEmployee.displayName',
    type: 'text'
  },
  {
    key: 'creatorEmployee',
    searchPaths: ['creatorEmployee.displayName', 'creatorEmployee.firstName', 'creatorEmployee.lastName'],
    sortPath: 'creatorEmployee.displayName',
    type: 'text'
  },
  { key: 'dueDate', searchPaths: ['dueDate'], type: 'date' },
  { key: 'startDate', searchPaths: ['startDate'], type: 'date' },
  { key: 'endDate', searchPaths: ['endDate'], type: 'date' },
  { key: 'createdAt', searchPaths: ['createdAt'], type: 'date' },

  // Filters (IDs, strings, booleans, dates, custom)
  { key: 'taskTypeIds', path: 'taskType.id', kind: 'inIds' },
  { key: 'taskPriorityIds', path: 'taskPriority.id', kind: 'inIds' },
  { key: 'taskStatusIds', path: 'taskStatus.id', kind: 'inIds' },
  { key: 'assignedEmployeeIds', path: 'assignedEmployee.id', kind: 'inIds' },
  { key: 'creatorEmployeeIds', path: 'creatorEmployee.id', kind: 'inIds' },
  { key: 'timingTypes', path: 'taskTiming', kind: 'inStrings' },

  // Relation filters
  { key: 'accountIds', path: 'account.id', kind: 'inIds' },
  { key: 'contactIds', path: 'contact.id', kind: 'inIds' },
  { key: 'leadIds', path: 'lead.id', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunity.id', kind: 'inIds' },

  // Reference type filters (custom handling)
  { key: 'referenceTypes', path: 'referenceType', kind: 'custom' },

  // Date range filters
  { key: 'dueDateFrom', path: 'dueDate', kind: 'dateFrom' },
  { key: 'dueDateTo', path: 'dueDate', kind: 'dateTo' },
  { key: 'startDateFrom', path: 'startDate', kind: 'dateFrom' },
  { key: 'startDateTo', path: 'startDate', kind: 'dateTo' },
  { key: 'endDateFrom', path: 'endDate', kind: 'dateFrom' },
  { key: 'endDateTo', path: 'endDate', kind: 'dateTo' },
  { key: 'createdAtFrom', path: 'createdAt', kind: 'dateFrom' },
  { key: 'createdAtTo', path: 'createdAt', kind: 'dateTo' }
]

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

        # Entity references (minimal for display)
        account { ${INVESTMENT_ACCOUNT_REF} }
        contact { ${INVESTMENT_CONTACT_REF} }
        lead { id code firstName lastName }
        opportunity { id code name }
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

      # Entity references (minimal for display and mapping)
      account { ${INVESTMENT_ACCOUNT_REF} }
      contact { ${INVESTMENT_CONTACT_REF} }
      lead { id code firstName lastName }
      opportunity { id code name }
      
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
    filters: { accountIds: [accountId] }
  })
}
