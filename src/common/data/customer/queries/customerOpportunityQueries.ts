// Customer Opportunity Queries - using shared fragments
import { CUSTOMER_OPPORTUNITY, CUSTOMER_NOTE } from './fragments/customerFragments'
import { CUSTOMER_TASK_REF, CUSTOMER_ACTIVITY_REF, CUSTOMER_DOCUMENT_REF } from './fragments/customerReferenceFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'

export interface CustomerOpportunityQueryVariables {
  ids?: string[]
  search?: string
  accountIds?: string[]
  contactIds?: string[]
  stageIds?: string[]
  stageValues?: string[]
  opportunityPipelineIds?: string[]
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

export const buildCustomerOpportunityWhereCondition = (variables: CustomerOpportunityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // IDs filter
  if (variables.ids && variables.ids.length > 0) {
    whereClause += `, id: { _in: ["${variables.ids.join('","')}"] }`
  }

  // Custom filter for stageValues (stage OR salesPipelineStage.value)
  if (variables.stageValues?.length) {
    const formattedValues = variables.stageValues.map(v => `"${v}"`).join(', ')
    whereClause += `, _or: [ { stage: { _in: [${formattedValues}] } }, { salesPipelineStage: { value: { _in: [${formattedValues}] } } } ]`
  }

  // Custom ranged filters for estimatedAmount (treat null as 0) and winningChance (multiple OR ranges)
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
  if (variables.forecastedProfitBetween) {
    whereClause += `, forecastedProfitAmount: { _gte: ${variables.forecastedProfitBetween[0]}, _lte: ${variables.forecastedProfitBetween[1]} }`
  }

  // Apply standard filters using descriptors
  const filterConditions = buildFilter(variables, CUSTOMER_OPPORTUNITY_DESCRIPTORS)
  if (filterConditions) {
    whereClause += `, ${filterConditions}`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, CUSTOMER_OPPORTUNITY_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

export const GET_CUSTOMER_OPPORTUNITIES = (variables: CustomerOpportunityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerOpportunityWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, CUSTOMER_OPPORTUNITY_DESCRIPTORS)

  return `
    query GetCustomerOpportunities {
      CustomerOpportunity: Opportunity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_OPPORTUNITY}
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
        ${CUSTOMER_ACTIVITY_REF}

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
        ${CUSTOMER_NOTE}
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
        ${CUSTOMER_DOCUMENT_REF}
        
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
