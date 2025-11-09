// Customer Opportunity hooks - list and by-id operations for opportunities
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { BaseCustomerOpportunity, CustomerOpportunity } from '../types'

// Queries (New)
import {
  buildCustomerOpportunityQuery,
  buildCustomerOpportunityByIdQuery,
  buildCustomerOpportunitySearchQuery,
  buildCustomerOpportunityWhereCondition,
  buildCustomerOpportunityOrderBy,
  type CustomerOpportunityQueryVariables
} from '../queries/customerOpportunityQueries.new'

// Mapper
import { toCustomerOpportunity } from '../mappers/customerOpportunityMappers'

export interface CustomerOpportunityListQueryResponse {
  Opportunity: BaseCustomerOpportunity[]
  OpportunityAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerOpportunityListData {
  opportunities: CustomerOpportunity[]
  total: number
}

export const useCustomerOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerOpportunities = useCallback(
    async (variables: CustomerOpportunityQueryVariables = {}): Promise<CustomerOpportunityListData> => {
      const query = buildCustomerOpportunityQuery()

      const customConditions: Record<string, any>[] = []

      // Custom filter for stageValues (stage OR salesPipelineStage.value)
      if (variables.stageValues?.length) {
        customConditions.push({
          _or: [
            { stage: { _in: variables.stageValues } },
            { salesPipelineStage: { value: { _in: variables.stageValues } } }
          ]
        })
      }

      // Custom ranged filters for estimatedAmount (treat null as 0) and winningChance (multiple OR ranges)
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

      if (variables.winningChanceRanges?.length) {
        const orConditions = variables.winningChanceRanges.map(range => {
          const chanceCondition: any = {}
          if (range.min !== undefined) chanceCondition._gte = range.min
          if (range.max !== undefined) chanceCondition._lte = range.max
          return { winningChance: chanceCondition }
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

      const whereCondition = buildCustomerOpportunityWhereCondition(variables, [], customConditions)
      const orderBy = buildCustomerOpportunityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<CustomerOpportunityListQueryResponse>(query, graphQLVariables)
      const opportunities = result.Opportunity.map(toCustomerOpportunity)
      const total = result.OpportunityAggregate?.aggregate?.count || 0
      return { opportunities, total }
    },
    [graphqlClient]
  )

  const fetchCustomerOpportunityById = useCallback(
    async (id: string): Promise<CustomerOpportunity | null> => {
      const query = buildCustomerOpportunityByIdQuery(undefined, id)
      const result = await graphqlClient.request<{ OpportunityByPk: BaseCustomerOpportunity | null }>(query)
      return result.OpportunityByPk ? toCustomerOpportunity(result.OpportunityByPk) : null
    },
    [graphqlClient]
  )

  const searchCustomerOpportunities = useCallback(
    async (variables: CustomerOpportunityQueryVariables): Promise<CustomerOpportunity[]> => {
      const query = buildCustomerOpportunitySearchQuery()
      const whereCondition = buildCustomerOpportunityWhereCondition(variables)
      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        where: whereCondition
      }
      const result = await graphqlClient.request<{ Opportunity: BaseCustomerOpportunity[] }>(query, graphQLVariables)
      return result.Opportunity.map(toCustomerOpportunity)
    },
    [graphqlClient]
  )

  return { fetchCustomerOpportunities, fetchCustomerOpportunityById, searchCustomerOpportunities }
}
