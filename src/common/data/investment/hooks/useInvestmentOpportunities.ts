// Investment Opportunity hooks - CRM opportunity entity operations
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import type {
  InvestmentOpportunity,
  InvestmentTask,
  InvestmentActivity,
  InvestmentNote,
  InvestmentDocument
} from '../types'

// Import related-entity queries from new file
import {
  GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID,
  GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID,
  GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID,
  GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID
} from '../queries/investmentOpportunityQueries.new'
// Import new query builders
import {
  buildInvestmentOpportunityByIdQuery,
  type InvestmentOpportunityQueryVariables
} from '../queries/investmentOpportunityQueries.new'

// Import where/orderBy builders for related entities
import { buildInvestmentTaskWhereCondition, buildInvestmentTaskOrderBy } from '../queries/investmentTaskQueries.new'
import {
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries.new'
import { buildInvestmentNoteWhereCondition, buildInvestmentNoteOrderBy } from '../queries/investmentNoteQueries.new'
import {
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries.new'
// Import old queries that are not yet migrated (GET_INVESTMENT_OPPORTUNITIES, GET_INVESTMENT_OPPORTUNITY_AGGREGATES)
import {
  GET_INVESTMENT_OPPORTUNITIES,
  GET_INVESTMENT_OPPORTUNITY_AGGREGATES
} from '../queries/investmentOpportunityQueries'

// Use the mapper function
import {
  toInvestmentOpportunity,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '../types/investmentOpportunityTypes'

// Note: InvestmentOpportunityQueryVariables is imported from queries

// Response interfaces
export interface InvestmentOpportunityQueryResponse {
  InvestmentOpportunity: InvestmentOpportunity[]
  InvestmentOpportunityAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentOpportunityByIdData {
  opportunity?: InvestmentOpportunity
}

export interface InvestmentOpportunityAggregateResponse {
  InvestmentOpportunityAggregate: {
    aggregate: {
      count: number
      sum: {
        estimatedAmount: number
      }
      avg: {
        estimatedAmount: number
      }
    }
  }
  InvestmentOpportunityWonAggregate: {
    aggregate: {
      count: number
      sum: {
        estimatedAmount: number
      }
    }
  }
}

// Hook for getting investment opportunities with full details
export const useGetInvestmentOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentOpportunities = useCallback(
    async (variables: InvestmentOpportunityQueryVariables = {}) => {
      const query = GET_INVESTMENT_OPPORTUNITIES()

      const customConditions: Record<string, any>[] = []

      if (variables.dealType) {
        customConditions.push({ dealType: { _eq: variables.dealType } })
      }
      if (variables.accountSearch?.trim()) {
        customConditions.push({ investmentAccount: { name: { _ilike: `%${variables.accountSearch.trim()}%` } } })
      }

      // Custom ranged filters for estimatedAmount (treat null as 0)
      if (variables.estimatedAmountRanges?.length) {
        const orConditions = variables.estimatedAmountRanges.flatMap(range => {
          const conditions: any[] = []
          const amountCondition: any = {}

          if (range.min !== undefined) amountCondition._gte = range.min
          if (range.max !== undefined) amountCondition._lte = range.max

          if (Object.keys(amountCondition).length > 0) {
            conditions.push({ estimatedAmount: amountCondition })
          }

          // If range includes 0, also include null values (null treated as 0)
          const includesZero =
            (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
          if (includesZero) {
            conditions.push({ estimatedAmount: { _isNull: true } })
          }

          return conditions
        })
        customConditions.push({ _or: orConditions })
      }

      if (variables.forecastedProfitBetween) {
        customConditions.push({
          forecastedProfit: {
            _gte: variables.forecastedProfitBetween[0],
            _lte: variables.forecastedProfitBetween[1]
          }
        })
      }

      const whereCondition = buildWhere({
        variables,
        descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
        ids: variables.ids,
        customConditions
      })

      const orderBy = buildOrderBy(variables.orderBy || [], INVESTMENT_OPPORTUNITY_DESCRIPTORS)

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentOpportunityQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedOpportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity)

        return {
          ...result,
          InvestmentOpportunity: enhancedOpportunities
        }
      } catch (error) {
        console.error('Error fetching investment opportunities:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentOpportunities }
}

// Hook for getting investment opportunity by ID
export const useGetInvestmentOpportunityById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentOpportunityById = useCallback(
    async (id: string) => {
      const query = buildInvestmentOpportunityByIdQuery(undefined, undefined, id)

      try {
        const result = await graphqlClient.request<{ InvestmentOpportunityByPk: InvestmentOpportunity | null }>(query)

        return {
          opportunity: result.InvestmentOpportunityByPk
            ? toInvestmentOpportunity(result.InvestmentOpportunityByPk)
            : undefined
        } as InvestmentOpportunityByIdData
      } catch (error) {
        console.error('Error fetching investment opportunity by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentOpportunityById }
}

// Hook for searching investment opportunities
export const useSearchInvestmentOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const searchInvestmentOpportunities = useCallback(
    async (searchTerm: string, variables: InvestmentOpportunityQueryVariables = {}) => {
      const query = GET_INVESTMENT_OPPORTUNITIES()

      const searchVariables = { ...variables, search: searchTerm }
      const customConditions: Record<string, any>[] = []

      if (searchVariables.dealType) {
        customConditions.push({ dealType: { _eq: searchVariables.dealType } })
      }
      if (searchVariables.accountSearch?.trim()) {
        customConditions.push({ investmentAccount: { name: { _ilike: `%${searchVariables.accountSearch.trim()}%` } } })
      }

      if (searchVariables.estimatedAmountRanges?.length) {
        const orConditions = searchVariables.estimatedAmountRanges.flatMap(range => {
          const conditions: any[] = []
          const amountCondition: any = {}
          if (range.min !== undefined) amountCondition._gte = range.min
          if (range.max !== undefined) amountCondition._lte = range.max
          if (Object.keys(amountCondition).length > 0) {
            conditions.push({ estimatedAmount: amountCondition })
          }
          const includesZero =
            (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
          if (includesZero) {
            conditions.push({ estimatedAmount: { _isNull: true } })
          }
          return conditions
        })
        customConditions.push({ _or: orConditions })
      }

      if (searchVariables.forecastedProfitBetween) {
        customConditions.push({
          forecastedProfit: {
            _gte: searchVariables.forecastedProfitBetween[0],
            _lte: searchVariables.forecastedProfitBetween[1]
          }
        })
      }

      const whereCondition = buildWhere({
        variables: searchVariables,
        descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
        ids: searchVariables.ids,
        customConditions
      })

      const orderBy = buildOrderBy(searchVariables.orderBy || [], INVESTMENT_OPPORTUNITY_DESCRIPTORS)

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(searchVariables.limit || 50, 100),
        offset: searchVariables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentOpportunityQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedOpportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity)

        return {
          ...result,
          InvestmentOpportunity: enhancedOpportunities
        }
      } catch (error) {
        console.error('Error searching investment opportunities:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { searchInvestmentOpportunities }
}

// Hook for getting investment opportunity aggregates for metrics
export const useGetInvestmentOpportunityAggregates = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentOpportunityAggregates = useCallback(
    async (variables: InvestmentOpportunityQueryVariables = {}) => {
      const query = GET_INVESTMENT_OPPORTUNITY_AGGREGATES()

      const customConditions: Record<string, any>[] = []

      if (variables.dealType) {
        customConditions.push({ dealType: { _eq: variables.dealType } })
      }
      if (variables.accountSearch?.trim()) {
        customConditions.push({ investmentAccount: { name: { _ilike: `%${variables.accountSearch.trim()}%` } } })
      }

      if (variables.estimatedAmountRanges?.length) {
        const orConditions = variables.estimatedAmountRanges.flatMap(range => {
          const conditions: any[] = []
          const amountCondition: any = {}
          if (range.min !== undefined) amountCondition._gte = range.min
          if (range.max !== undefined) amountCondition._lte = range.max
          if (Object.keys(amountCondition).length > 0) {
            conditions.push({ estimatedAmount: amountCondition })
          }
          const includesZero =
            (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
          if (includesZero) {
            conditions.push({ estimatedAmount: { _isNull: true } })
          }
          return conditions
        })
        customConditions.push({ _or: orConditions })
      }

      if (variables.forecastedProfitBetween) {
        customConditions.push({
          forecastedProfit: {
            _gte: variables.forecastedProfitBetween[0],
            _lte: variables.forecastedProfitBetween[1]
          }
        })
      }

      const whereCondition = buildWhere({
        variables,
        descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
        ids: variables.ids,
        customConditions
      })

      // Build won condition (same as where but with won status filter)
      const wonCustomConditions: Record<string, any>[] = [
        ...customConditions,
        {
          _or: [
            { opportunityStatus: { code: { _ilike: '%won%' } } },
            { opportunityStatus: { value: { _ilike: '%won%' } } },
            { opportunityStatus: { alternativeCode: { _ilike: '%won%' } } }
          ]
        }
      ]

      const wonWhereCondition = buildWhere({
        variables,
        descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
        ids: variables.ids,
        customConditions: wonCustomConditions
      })

      const graphQLVariables: Record<string, any> = {
        where: whereCondition,
        wonWhere: wonWhereCondition
      }

      try {
        const result = await graphqlClient.request<InvestmentOpportunityAggregateResponse>(query, graphQLVariables)
        return result
      } catch (error) {
        console.error('Error fetching investment opportunity aggregates:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentOpportunityAggregates }
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by opportunity ID
export const useGetInvestmentTasksByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID()
      const whereCondition = buildInvestmentTaskWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentTask: InvestmentTask[] }>(query, graphQLVariables)
        return result.InvestmentTask.map(toInvestmentTask)
      } catch (error) {
        console.error('Error fetching investment tasks by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasksByOpportunityId }
}

// Hook for getting investment activities by opportunity ID
export const useGetInvestmentActivitiesByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivitiesByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID()
      const whereCondition = buildInvestmentActivityWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: InvestmentActivity[] }>(
          query,
          graphQLVariables
        )
        return result.InvestmentActivity.map(toInvestmentActivity)
      } catch (error) {
        console.error('Error fetching investment activities by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivitiesByOpportunityId }
}

// Hook for getting investment notes by opportunity ID
export const useGetInvestmentNotesByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNotesByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID()
      const whereCondition = buildInvestmentNoteWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentNote: InvestmentNote[] }>(query, graphQLVariables)
        return result.InvestmentNote.map(toInvestmentNote)
      } catch (error) {
        console.error('Error fetching investment notes by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNotesByOpportunityId }
}

// Hook for getting investment documents by opportunity ID
export const useGetInvestmentDocumentsByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID()
      const whereCondition = buildInvestmentDocumentWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentDocumentOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(
          query,
          graphQLVariables
        )
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        console.error('Error fetching investment documents by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentDocumentsByOpportunityId }
}
