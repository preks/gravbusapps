// Investment Opportunity hooks - CRM opportunity entity operations
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  InvestmentOpportunity,
  InvestmentTask,
  InvestmentActivity,
  InvestmentNote,
  InvestmentDocument
} from '../types'

// Import new query builders
import {
  buildInvestmentOpportunityQuery,
  buildInvestmentOpportunityByIdQuery,
  buildInvestmentOpportunityWhereCondition,
  buildInvestmentOpportunityOrderBy,
  type InvestmentOpportunityQueryVariables
} from '../queries/investmentOpportunityQueries'

// Import where/orderBy builders for related entities
import {
  buildInvestmentTaskByOpportunityIdQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy
} from '../queries/investmentTaskQueries'
import {
  buildInvestmentActivityByOpportunityIdQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries'
import {
  buildInvestmentNoteByOpportunityIdQuery,
  buildInvestmentNoteWhereCondition,
  buildInvestmentNoteOrderBy
} from '../queries/investmentNoteQueries'
import {
  buildInvestmentDocumentByOpportunityIdQuery,
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries'
// Import old queries that are not yet migrated (GET_INVESTMENT_OPPORTUNITY_AGGREGATES)
import { GET_INVESTMENT_OPPORTUNITY_AGGREGATES } from '../queries/investmentOpportunityQueries'

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
      const query = buildInvestmentOpportunityQuery()

      const customConditions: Record<string, any>[] = []

      if (variables.dealType) {
        customConditions.push({ dealType: { _eq: variables.dealType } })
      }
      if (variables.accountSearch?.trim()) {
        customConditions.push({ account: { name: { _ilike: `%${variables.accountSearch.trim()}%` } } })
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
          forecastedProfitAmount: {
            _gte: variables.forecastedProfitBetween[0],
            _lte: variables.forecastedProfitBetween[1]
          }
        })
      }

      const whereCondition = buildInvestmentOpportunityWhereCondition(variables, [], customConditions)
      const orderBy = buildInvestmentOpportunityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{
          InvestmentOpportunity: InvestmentOpportunity[]
          InvestmentOpportunityAggregate: {
            aggregate: { count: number }
          }
        }>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedOpportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity)

        return {
          InvestmentOpportunity: enhancedOpportunities,
          InvestmentOpportunityAggregate: result.InvestmentOpportunityAggregate
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
      const query = buildInvestmentOpportunityByIdQuery(undefined, id)

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
      const query = buildInvestmentTaskByOpportunityIdQuery()
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
      const query = buildInvestmentActivityByOpportunityIdQuery()
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
      const query = buildInvestmentNoteByOpportunityIdQuery()
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
      const query = buildInvestmentDocumentByOpportunityIdQuery()
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
