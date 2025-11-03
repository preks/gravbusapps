// Customer Opportunity Queries - using shared fragments
import {
  CUSTOMER_OPPORTUNITY,
  CUSTOMER_ACCOUNT_REF,
  CUSTOMER_TASK,
  CUSTOMER_SALES_ACTIVITY,
  CUSTOMER_CRM_NOTE,
  CUSTOMER_CRM_DOCUMENT
} from './fragments/customerRelationFragments'

export interface CustomerOpportunityQueryVariables {
  ids?: string[]
  search?: string
  accountIds?: string[]
  contactIds?: string[]
  stageIds?: string[]
  stageValues?: string[]
  pipelineIds?: string[]
  statusIds?: string[]
  currencyIds?: string[]
  ownerEmployeeIds?: string[]
  // Additional range filters used by customer opportunity list
  estimatedAmountRanges?: Array<{ min?: number; max?: number }>
  winningChanceRanges?: Array<{ min?: number; max?: number }>
  forecastedProfitBetween?: [number, number]
  closeDateFrom?: string
  closeDateTo?: string
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Helper: Build search clause
const buildSearchClause = (searchTerm: string): string => {
  const q = searchTerm.trim()
  const isNumber = !isNaN(Number(q))
  const numericValue = isNumber ? Number(q) : 0
  const numericFields = isNumber
    ? `, { estimatedAmount: { _eq: ${numericValue} } }, { winningChance: { _eq: ${numericValue} } }`
    : ''

  return `, _or: [
    { name: { _ilike: "%${q}%" } },
    { code: { _ilike: "%${q}%" } },
    { notesSummary: { _ilike: "%${q}%" } },
    { account: { name: { _ilike: "%${q}%" } } },
    { ownerEmployee: { firstName: { _ilike: "%${q}%" } } },
    { ownerEmployee: { lastName: { _ilike: "%${q}%" } } },
    { ownerEmployee: { displayName: { _ilike: "%${q}%" } } },
    { salesPipelineStage: { value: { _ilike: "%${q}%" } } },
    { salesPipeline: { value: { _ilike: "%${q}%" } } },
    { opportunityStatus: { value: { _ilike: "%${q}%" } } }
    ${numericFields}
  ]`
}

// Helper: Format IDs for GraphQL IN clause
const formatIds = (ids: string[]): string => ids.map(id => `"${id}"`).join(', ')

// Helper: Format values for GraphQL IN clause
const formatValues = (values: string[]): string => values.map(v => `"${v}"`).join(', ')

// Helper: Build ID filter clauses
const buildIdFiltersClause = (variables: CustomerOpportunityQueryVariables): string => {
  const clauses: string[] = []

  if (variables.accountIds?.length) {
    const formattedIds = formatIds(variables.accountIds)
    clauses.push(`, account: { id: { _in: [${formattedIds}] } }`)
  }
  if (variables.contactIds?.length) {
    const formattedIds = formatIds(variables.contactIds)
    clauses.push(`, OpportunityContact: { contact: { id: { _in: [${formattedIds}] } } }`)
  }
  if (variables.stageIds?.length) {
    const formattedIds = formatIds(variables.stageIds)
    clauses.push(`, salesPipelineStage: { id: { _in: [${formattedIds}] } }`)
  }
  if (variables.stageValues?.length) {
    const formattedValues = formatValues(variables.stageValues)
    clauses.push(
      `, _or: [ { stage: { _in: [${formattedValues}] } }, { salesPipelineStage: { value: { _in: [${formattedValues}] } } } ]`
    )
  }
  if (variables.pipelineIds?.length) {
    const formattedIds = formatIds(variables.pipelineIds)
    clauses.push(`, salesPipeline: { id: { _in: [${formattedIds}] } }`)
  }
  if (variables.statusIds?.length) {
    const formattedIds = formatIds(variables.statusIds)
    clauses.push(`, opportunityStatus: { id: { _in: [${formattedIds}] } }`)
  }
  if (variables.currencyIds?.length) {
    const formattedIds = formatIds(variables.currencyIds)
    clauses.push(`, currency: { id: { _in: [${formattedIds}] } }`)
  }
  if (variables.ownerEmployeeIds?.length) {
    const formattedIds = formatIds(variables.ownerEmployeeIds)
    clauses.push(`, ownerEmployee: { id: { _in: [${formattedIds}] } }`)
  }

  return clauses.join('')
}

export const buildCustomerOpportunityWhereCondition = (variables: CustomerOpportunityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  if (variables.search?.trim()) {
    whereClause += buildSearchClause(variables.search)
  }

  whereClause += buildIdFiltersClause(variables)

  // Ranged filters for estimatedAmount (treat null as 0) and winningChance (multiple OR ranges)
  if (variables.estimatedAmountRanges?.length) {
    const orConditions = variables.estimatedAmountRanges.flatMap(range => {
      const conditions: string[] = []
      const parts: string[] = []

      if (range.min !== undefined) parts.push(`_gte: ${range.min}`)
      if (range.max !== undefined) parts.push(`_lte: ${range.max}`)

      // Add the actual value condition
      if (parts.length > 0) {
        conditions.push(`{ estimatedAmount: { ${parts.join(', ')} } }`)
      }

      // If range includes 0, also include null values (null treated as 0)
      const includesZero = (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
      if (includesZero) {
        conditions.push(`{ estimatedAmount: { _isNull: true } }`)
      }

      return conditions
    })
    whereClause += `, _or: [${orConditions.join(', ')}]`
  }
  if (variables.winningChanceRanges?.length) {
    const orConditions = variables.winningChanceRanges.map(range => {
      const parts: string[] = []
      if (range.min !== undefined) parts.push(`_gte: ${range.min}`)
      if (range.max !== undefined) parts.push(`_lte: ${range.max}`)
      return `{ winningChance: { ${parts.join(', ')} } }`
    })
    whereClause += `, _or: [${orConditions.join(', ')}]`
  }
  if (variables.forecastedProfitBetween)
    whereClause += `, forecastedProfitAmount: { _gte: ${variables.forecastedProfitBetween[0]}, _lte: ${variables.forecastedProfitBetween[1]} }`

  // Close Date Filter - handle both conditions properly
  if (variables.closeDateFrom && variables.closeDateTo) {
    whereClause += `, closeDate: { _gte: "${variables.closeDateFrom}", _lte: "${variables.closeDateTo}" }`
  } else if (variables.closeDateFrom) {
    whereClause += `, closeDate: { _gte: "${variables.closeDateFrom}" }`
  } else if (variables.closeDateTo) {
    whereClause += `, closeDate: { _lte: "${variables.closeDateTo}" }`
  }

  whereClause += ' }'
  return whereClause
}

export const GET_CUSTOMER_OPPORTUNITIES = (variables: CustomerOpportunityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerOpportunityWhereCondition(variables)
  const orderByClause = variables.orderBy?.length
    ? `orderBy: [${variables.orderBy
        .map(o => {
          const f = o.field
          if (f === 'ownerEmployee') return `{ ownerEmployee: { displayName: ${o.direction} } }`
          if (f === 'account') return `{ account: { name: ${o.direction} } }`
          if (f === 'estimatedAmount' || f === 'winningChance') {
            // Use NULLS_LAST for both directions to keep nulls at the end
            return `{ ${f}: ${o.direction} }`
          }
          // CatalogEntry fields need nested sorting by value
          if (f === 'salesPipeline' || f === 'salesPipelineStage' || f === 'opportunityStatus') {
            return `{ ${f}: { value: ${o.direction} } }`
          }
          // Only direct scalar fields allowed otherwise
          return `{ ${f}: ${o.direction} }`
        })
        .join(', ')}]`
    : 'orderBy: [{ createdAt: DESC_NULLS_LAST }]'

  return `
    query GetCustomerOpportunities {
      CustomerOpportunity: Opportunity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_OPPORTUNITY}
        account { ${CUSTOMER_ACCOUNT_REF} }
      }
      CustomerOpportunityAggregate: OpportunityAggregate(${where}) { aggregate { count } }
    }
  `
}

export const GET_CUSTOMER_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetCustomerOpportunityById {
      CustomerOpportunity: Opportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_OPPORTUNITY}
        account { ${CUSTOMER_ACCOUNT_REF} }
      }
    }
  `
}

export const SEARCH_CUSTOMER_OPPORTUNITIES = (variables: CustomerOpportunityQueryVariables): string => {
  const { search = '', limit = 10 } = variables
  return `
    query SearchCustomerOpportunities {
      CustomerOpportunity: Opportunity(
        where: {
          isDeleted: { _eq: false }
          _and: [ { _or: [
            { name: { _ilike: "%${search}%" } },
            { code: { _ilike: "%${search}%" } },
            { description: { _ilike: "%${search}%" } }
          ] } ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        id
        code
        name
        description
        closeDate
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
        ${CUSTOMER_TASK}

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

// Get Customer Activities by Opportunity ID
export const GET_CUSTOMER_ACTIVITIES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetCustomerActivitiesByOpportunityId {
      SalesActivity(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_SALES_ACTIVITY}

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

// Get Customer Notes by Opportunity ID
export const GET_CUSTOMER_NOTES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetCustomerNotesByOpportunityId {
      CrmNote(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_CRM_NOTE}
        
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

// Get Customer Documents by Opportunity ID
export const GET_CUSTOMER_DOCUMENTS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetCustomerDocumentsByOpportunityId {
      CrmDocument(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_CRM_DOCUMENT}
        
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
