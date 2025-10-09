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

export const buildCustomerOpportunityWhereCondition = (variables: CustomerOpportunityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  if (variables.search?.trim()) {
    const q = variables.search.trim()
    const isNumber = !isNaN(Number(q))
    whereClause += `, _or: [
      { name: { _ilike: "%${q}%" } },
      { code: { _ilike: "%${q}%" } },
      { notesSummary: { _ilike: "%${q}%" } },
      { account: { name: { _ilike: "%${q}%" } } },
      { ownerEmployee: { firstName: { _ilike: "%${q}%" } } },
      { ownerEmployee: { lastName: { _ilike: "%${q}%" } } },
      { ownerEmployee: { displayName: { _ilike: "%${q}%" } } },
      { salesPipelineStage: { value: { _ilike: "%${q}%" } } },
      { salesPipeline: { value: { _ilike: "%${q}%" } } },
      { pipeline: { value: { _ilike: "%${q}%" } } },
      { opportunityStatus: { value: { _ilike: "%${q}%" } } }
      ${isNumber ? `, { estimatedAmount: { _eq: ${Number(q)} } }, { winningChance: { _eq: ${Number(q)} } }` : ''}
    ]`
  }

  if (variables.accountIds?.length)
    whereClause += `, account: { id: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.stageIds?.length)
    whereClause += `, salesPipelineStage: { id: { _in: [${variables.stageIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.stageValues?.length)
    whereClause += `, _or: [ { stage: { _in: [${variables.stageValues.map(v => `"${v}"`).join(', ')}] } }, { salesPipelineStage: { value: { _in: [${variables.stageValues.map(v => `"${v}"`).join(', ')}] } } } ]`
  if (variables.pipelineIds?.length)
    whereClause += `, _or: [ { salesPipeline: { id: { _in: [${variables.pipelineIds.map(id => `"${id}"`).join(', ')}] } } }, { pipeline: { id: { _in: [${variables.pipelineIds.map(id => `"${id}"`).join(', ')}] } } } ]`
  if (variables.statusIds?.length)
    whereClause += `, opportunityStatus: { id: { _in: [${variables.statusIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.currencyIds?.length)
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`
  if (variables.ownerEmployeeIds?.length)
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`

  // Ranged filters for estimatedAmount and winningChance (multiple OR ranges)
  if (variables.estimatedAmountRanges?.length) {
    const orConditions = variables.estimatedAmountRanges.map(range => {
      const parts: string[] = []
      if (range.min !== undefined) parts.push(`_gte: ${range.min}`)
      if (range.max !== undefined) parts.push(`_lte: ${range.max}`)
      return `{ estimatedAmount: { ${parts.join(', ')} } }`
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
  if (variables.closeDateFrom) whereClause += `, closeDate: { _gte: "${variables.closeDateFrom}" }`
  if (variables.closeDateTo) whereClause += `, closeDate: { _lte: "${variables.closeDateTo}" }`

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
            const dir = o.direction === 'ASC' ? 'ASC_NULLS_FIRST' : 'DESC_NULLS_LAST'
            return `{ ${f}: ${dir} }`
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
