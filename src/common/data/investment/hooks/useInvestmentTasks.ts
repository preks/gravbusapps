// Investment Task hooks - list and search operations for investment tasks
import { useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { InvestmentTask } from '../types/investmentTaskTypes'

// Queries
import {
  buildInvestmentTaskQuery,
  buildInvestmentTaskByIdQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy,
  type InvestmentTaskQueryVariables
} from '../queries/investmentTaskQueries'

// Mapper
import { toInvestmentTask } from '../mappers/investmentTaskMappers'

export interface InvestmentTaskListQueryResponse {
  InvestmentTask: InvestmentTask[]
  InvestmentTaskAggregate: {
    aggregate: { count: number }
  }
}

export interface InvestmentTaskListData {
  tasks: InvestmentTask[]
  total: number
}

export interface InvestmentTaskQueryOptions {
  orConditions?: Record<string, any>[]
}

export const useInvestmentTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasks = useCallback(
    async (
      variables: InvestmentTaskQueryVariables = {},
      options?: InvestmentTaskQueryOptions
    ): Promise<InvestmentTaskListData> => {
      // Use new query builder with fields mapping
      const query = buildInvestmentTaskQuery()

      // Handle reference type filtering - add as custom conditions
      const customConditions: Record<string, any>[] = []

      // Add custom OR conditions if provided (e.g., for assigned OR created by filters)
      if (options?.orConditions && options.orConditions.length > 0) {
        customConditions.push(...options.orConditions)
      }

      if (variables.referenceTypes && variables.referenceTypes.length > 0) {
        const referenceConditions = variables.referenceTypes
          .map(type => {
            switch (type) {
              case 'opportunity':
                return { opportunity: { id: { _neq: null } } }
              case 'account':
                return { account: { id: { _neq: null } } }
              case 'lead':
                return { lead: { id: { _neq: null } } }
              case 'contact':
                return { contact: { id: { _neq: null } } }
              case 'investment':
                return { investment: { id: { _neq: null } } }
              default:
                return null
            }
          })
          .filter((c): c is Record<string, any> => c !== null)

        if (referenceConditions.length > 0) {
          customConditions.push({ _or: referenceConditions })
        }
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentTaskWhereCondition(variables, [], customConditions)

      let orderBy = buildInvestmentTaskOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy = [{ createdAt: 'DESC' }]
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentTaskListQueryResponse>(query, graphQLVariables)
        const tasks = result.InvestmentTask.map(toInvestmentTask)
        const total = result.InvestmentTaskAggregate?.aggregate?.count || 0
        return { tasks, total }
      } catch (error) {
        console.error('Error fetching investment tasks:', error)
        throw error
      }
    },
    [context.accessToken]
  )

  const fetchInvestmentTaskById = useCallback(
    async (id: string): Promise<InvestmentTask | null> => {
      try {
        // Use new query builder with fields mapping
        const query = buildInvestmentTaskByIdQuery(undefined, id)
        const result = await graphqlClient.request<{ InvestmentTaskByPk: InvestmentTask }>(query)
        const taskData = result.InvestmentTaskByPk
        return taskData ? toInvestmentTask(taskData) : null
      } catch (error) {
        console.error('Error fetching investment task by id:', error)
        throw error
      }
    },
    [context.accessToken]
  )

  return useMemo(
    () => ({ fetchInvestmentTasks, fetchInvestmentTaskById }),
    [fetchInvestmentTasks, fetchInvestmentTaskById]
  )
}
