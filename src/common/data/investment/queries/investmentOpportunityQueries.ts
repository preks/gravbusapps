// Investment Opportunity Queries - Complete queries using shared fragments
import { INVESTMENT, INVESTMENT_REF } from './fragments/investmentFragments'
import {
  INVESTMENT_OPPORTUNITY,
  INVESTMENT_ACCOUNT_REF,
  INVESTMENT_TASK,
  INVESTMENT_ACTIVITY,
  INVESTMENT_NOTE,
  INVESTMENT_DOCUMENT
} from './fragments/investmentRelationFragments'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

export interface InvestmentOpportunityQueryVariables {
  ids?: string[]
  search?: string
  dealType?: string // Added dealType filtering
  accountIds?: string[]
  accountSearch?: string // Search account by name
  contactIds?: string[] // Filter by contact IDs
  stageIds?: string[]
  pipelineIds?: string[]
  statusIds?: string[]
  leadSourceIds?: string[]
  currencyIds?: string[]
  ownerEmployeeIds?: string[]
  forecastedProfitBetween?: [number, number]
  // Amount filters
  estimatedAmountRanges?: Array<{ min?: number; max?: number }>
  // Date filters
  createdAfter?: string
  createdBefore?: string
  closeDateFrom?: string
  closeDateTo?: string
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Filter structure types for type safety
export interface GraphQLFilter {
  [key: string]: any
}

export interface GraphQLWhereCondition {
  isDeleted: { _eq: boolean }
  [key: string]: any
}

export interface DateRangeFilter {
  _gte?: string
  _lte?: string
}

export interface SearchFilter {
  _or: Array<Record<string, { _ilike: string }>>
}

export interface InFilter {
  _in: string[]
}

export interface NumberRangeFilter {
  _gte?: number
  _lte?: number
}

const escapeGraphQLString = (str: string): string => {
  return JSON.stringify(str).slice(1, -1)
}

// Utility function to serialize filter objects to GraphQL string format with secure escaping
const serializeGraphQLFilter = (filter: Record<string, any>): string => {
  const serializeValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null'
    }
    if (typeof value === 'string') {
      return `"${escapeGraphQLString(value)}"`
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (Array.isArray(value)) {
      return `[${value.map(serializeValue).join(', ')}]`
    }
    if (typeof value === 'object') {
      return serializeGraphQLFilter(value)
    }
    return String(value)
  }

  const pairs = Object.entries(filter).map(([key, value]) => {
    return `${key}: ${serializeValue(value)}`
  })

  return `{ ${pairs.join(', ')} }`
}

// Helper: Build basic ID-based filters
const buildIdFilters = (variables: InvestmentOpportunityQueryVariables): GraphQLFilter[] => {
  const filters: GraphQLFilter[] = []

  if (variables.dealType) filters.push({ dealType: { _eq: variables.dealType } })
  if (variables.accountIds?.length) filters.push({ accountId: { _in: variables.accountIds } })
  if (variables.contactIds?.length) {
    filters.push({ investmentOpportunityContact: { contactId: { _in: variables.contactIds } } })
  }
  if (variables.stageIds?.length) {
    filters.push({ opportunityPipelineStage: { id: { _in: variables.stageIds } } })
  }
  if (variables.pipelineIds?.length) {
    filters.push({ opportunityPipeline: { id: { _in: variables.pipelineIds } } })
  }
  if (variables.statusIds?.length) {
    filters.push({ opportunityStatus: { id: { _in: variables.statusIds } } })
  }
  if (variables.currencyIds?.length) {
    filters.push({ currency: { id: { _in: variables.currencyIds } } })
  }
  if (variables.ownerEmployeeIds?.length) {
    filters.push({ ownerEmployee: { id: { _in: variables.ownerEmployeeIds } } })
  }

  return filters
}

// Helper: Build search filters
const buildSearchFilters = (variables: InvestmentOpportunityQueryVariables): GraphQLFilter[] => {
  const filters: GraphQLFilter[] = []

  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim()
    filters.push({
      _or: [
        { name: { _ilike: `%${searchTerm}%` } },
        { code: { _ilike: `%${searchTerm}%` } },
        { notesSummary: { _ilike: `%${searchTerm}%` } },
        { investmentName: { _ilike: `%${searchTerm}%` } }
      ]
    })
  }

  if (variables.accountSearch?.trim()) {
    filters.push({
      account: { name: { _ilike: `%${variables.accountSearch.trim()}%` } }
    })
  }

  return filters
}

// Helper: Build date range filters
const buildDateFilters = (variables: InvestmentOpportunityQueryVariables): GraphQLFilter[] => {
  const filters: GraphQLFilter[] = []

  if (variables.createdAfter || variables.createdBefore) {
    const createdAtFilter: DateRangeFilter = {}
    if (variables.createdAfter) createdAtFilter._gte = variables.createdAfter
    if (variables.createdBefore) createdAtFilter._lte = variables.createdBefore
    filters.push({ createdAt: createdAtFilter })
  }

  if (variables.closeDateFrom || variables.closeDateTo) {
    const closeDateFilter: DateRangeFilter = {}
    if (variables.closeDateFrom) closeDateFilter._gte = variables.closeDateFrom
    if (variables.closeDateTo) closeDateFilter._lte = variables.closeDateTo
    filters.push({ closeDate: closeDateFilter })
  }

  if (variables.forecastedProfitBetween) {
    const [min, max] = variables.forecastedProfitBetween
    filters.push({
      forecastedProfitAmount: { _gte: min, _lte: max }
    })
  }

  return filters
}

// Base filter builder that returns structured filter objects
const buildBaseFilters = (variables: InvestmentOpportunityQueryVariables = {}): GraphQLFilter[] => {
  const filters: GraphQLFilter[] = [
    ...buildIdFilters(variables),
    ...buildSearchFilters(variables),
    ...buildDateFilters(variables)
  ]

  // Amount range filters (treat null as 0)
  if (variables.estimatedAmountRanges && variables.estimatedAmountRanges.length > 0) {
    const amountFilters = variables.estimatedAmountRanges.map(range => {
      const conditions: any[] = []

      // If we have min/max, create two conditions: one for actual values, one for null (treated as 0)
      if (range.min !== undefined && range.max !== undefined) {
        // Condition 1: estimatedAmount is between min and max
        conditions.push({
          estimatedAmount: {
            _gte: range.min,
            _lte: range.max
          }
        })
        // Condition 2: if min is 0, also include null values
        if (range.min === 0) {
          conditions.push({
            estimatedAmount: { _isNull: true }
          })
        }
      } else if (range.min !== undefined) {
        // Only min specified
        conditions.push({
          estimatedAmount: { _gte: range.min }
        })
      } else if (range.max !== undefined) {
        // Only max specified - include null as 0
        conditions.push({
          estimatedAmount: { _lte: range.max }
        })
        if (range.max >= 0) {
          conditions.push({
            estimatedAmount: { _isNull: true }
          })
        }
      }

      // If multiple conditions, combine with _or
      if (conditions.length > 1) {
        return { _or: conditions }
      }
      return conditions[0]
    })

    if (amountFilters.length === 1) {
      filters.push(amountFilters[0])
    } else {
      filters.push({ _or: amountFilters })
    }
  }

  return filters
}

export const buildInvestmentOpportunityWhereCondition = (
  variables: InvestmentOpportunityQueryVariables = {}
): string => {
  const baseFilters = buildBaseFilters(variables)

  // Start with the base condition that always includes isDeleted: false
  if (baseFilters.length === 0) {
    return `where: ${serializeGraphQLFilter({ isDeleted: { _eq: false } })}`
  }
  const whereCondition: GraphQLWhereCondition = {
    isDeleted: { _eq: false },
    _and: baseFilters
  }
  return `where: ${serializeGraphQLFilter(whereCondition)}`
}

// Get Investment Opportunities with full details
export const GET_INVESTMENT_OPPORTUNITIES = (variables: InvestmentOpportunityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentOpportunityWhereCondition(variables)

  const orderByClause = variables.orderBy?.length
    ? `orderBy: [${variables.orderBy
        .map(o => {
          const f = o.field
          if (
            f === 'opportunityStatus' ||
            f === 'opportunityPipeline' ||
            f === 'opportunityPipelineStage' ||
            f === 'currency'
          ) {
            return `{ ${f}: { code: ${o.direction} } }`
          }
          if (f === 'ownerEmployee') {
            return `{ ownerEmployee: { displayName: ${o.direction} } }`
          }
          return `{ ${f}: ${o.direction} }`
        })
        .join(', ')}]`
    : 'orderBy: [{ closeDate: ASC }]'

  return `
    query GetInvestmentOpportunities {
      InvestmentOpportunity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_OPPORTUNITY}
        
        # Account relationship
        account {
          ${INVESTMENT_ACCOUNT_REF}
        }
        
        # Related investments
        investment {
          ${INVESTMENT_REF}
        }
        
        # Aggregate counts for relationships
        investmentAggregate {
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
      
      InvestmentOpportunityAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Opportunity by ID
export const GET_INVESTMENT_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityById {
      InvestmentOpportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_OPPORTUNITY}
        
        # Account relationship
        account {
          ${INVESTMENT_ACCOUNT_REF}
        }
        
        # Related investments (detailed view)
        investment {
          ${INVESTMENT}
        }

        # Include pipeline with stages for UI stage lists
        opportunityPipeline {
          ${CATALOG_ENTRY}
          childEntries {
            ${CATALOG_ENTRY}
          }
        }
      }
    }
  `
}

// Search Investment Opportunities (lightweight for autocomplete)
export const SEARCH_INVESTMENT_OPPORTUNITIES = (variables: InvestmentOpportunityQueryVariables): string => {
  const { search = '', limit = 10 } = variables

  return `
    query SearchInvestmentOpportunities {
      InvestmentOpportunity(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { description: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        id
        code
        name
        description
        estimatedAmount
        probability
        closeDate
        stage {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        ownerEmployee {
          id
          displayName
        }
        account {
          id
          code
          name
        }
      }
    }
  `
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Opportunity ID
export const GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentTasksByOpportunityId {
      InvestmentTask(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK}
        
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

// Get Investment Activities by Opportunity ID
export const GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentActivitiesByOpportunityId {
      InvestmentActivity(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY}
        
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

// Get Investment Notes by Opportunity ID
export const GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentNotesByOpportunityId {
      InvestmentNote(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE}
        
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

// Get Investment Documents by Opportunity ID
export const GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentDocumentsByOpportunityId {
      InvestmentDocument(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
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

// Build where condition specifically for won opportunities using object merging
const buildWonOpportunityWhereCondition = (variables: InvestmentOpportunityQueryVariables = {}): string => {
  const baseFilters = buildBaseFilters(variables)

  // Create the won filter as a structured object
  const wonFilter: GraphQLFilter = {
    _or: [{ opportunityStatus: { alternativeCode: { _eq: 'WON' } } }, { opportunityStatus: { value: { _eq: 'WON' } } }]
  }

  // Start with base condition and add all filters using _and array
  const whereCondition: GraphQLWhereCondition = {
    isDeleted: { _eq: false },
    _and: [wonFilter, ...baseFilters]
  }

  return `where: ${serializeGraphQLFilter(whereCondition)}`
}

// Get Investment Opportunity Aggregates - for metrics calculation
export const GET_INVESTMENT_OPPORTUNITY_AGGREGATES = (variables: InvestmentOpportunityQueryVariables = {}): string => {
  const where = buildInvestmentOpportunityWhereCondition(variables)
  const wonWhere = buildWonOpportunityWhereCondition(variables)

  return `
    query GetInvestmentOpportunityAggregates {
      # All opportunities aggregate
      InvestmentOpportunityAggregate(${where}) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
          avg {
            estimatedAmount
          }
        }
      }
      
      # Won opportunities aggregate
      InvestmentOpportunityWonAggregate: InvestmentOpportunityAggregate(${wonWhere}) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
    }
  `
}

// Get Investment Opportunity Stage Condition by ID
export const GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITION_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityStageConditionById {
      InvestmentOpportunityStageConditionByPk(id: "${id}") {
        id
        completed
        completedAt
        deadlineAt
        version
        opportunityPipelineStageCondition {
          id
          value
          code
          parentEntryId
        }
        configSnapshot
      }
    }
  `
}

// Get all Investment Opportunity Stage Conditions for an Opportunity
export const GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITIONS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentOpportunityStageConditionsByOpportunityId {
      InvestmentOpportunityStageCondition(
        where: {
          opportunity: { id: { _eq: "${opportunityId}" } },
          isDeleted: { _eq: false }
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        completed
        completedAt
        deadlineAt
        version
        configSnapshot
        completedByEmployee {
          id
          displayName
          firstName
          lastName
        }
        opportunityPipelineStageCondition {
          id
          value
          code
          parentEntryId
        }
      }
    }
  `
}
