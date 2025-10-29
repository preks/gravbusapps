import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTaskQueryVariables, SalesTaskResponse } from '../types/SalesTaskTypes'
import {
  GET_SALES_TASKS,
  GET_SALES_TASKS_COUNT,
  GET_SALES_TASKS_WITH_COUNT,
  GET_HISTORICAL_TASK_STATISTICS
} from '../queries/SalesTaskQueries'

export interface UseSalesTaskQueriesProps {
  accessToken: string
}

export interface SalesTaskWithCountResponse extends SalesTaskResponse {
  SalesTaskAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface HistoricalTaskStatisticsResponse {
  currentTasks: any[]
  previousTasks: any[]
  allTasks: any[]
}

export interface UseSalesTaskQueriesReturn {
  fetchSalesTasks: (variables?: SalesTaskQueryVariables) => Promise<SalesTaskResponse>
  fetchSalesTasksCount: (variables?: SalesTaskQueryVariables) => Promise<number>
  fetchSalesTasksWithCount: (variables?: SalesTaskQueryVariables) => Promise<SalesTaskWithCountResponse>
  fetchHistoricalStatistics: (
    daysAgo?: number,
    filterVariables?: SalesTaskQueryVariables
  ) => Promise<HistoricalTaskStatisticsResponse>
}

/**
 * Custom hook for SalesTask GraphQL operations
 * Provides methods to fetch sales tasks and their count
 */
export const useSalesTaskQueries = ({ accessToken }: UseSalesTaskQueriesProps): UseSalesTaskQueriesReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchSalesTasks = useCallback(
    async (variables: SalesTaskQueryVariables = {}): Promise<SalesTaskResponse> => {
      const { query, variables: queryVariables } = GET_SALES_TASKS(variables)
      try {
        const result = await graphqlClient.request<SalesTaskResponse>(query, queryVariables)
        return result
      } catch (error) {
        console.error('Error fetching sales tasks:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchSalesTasksCount = useCallback(
    async (variables: SalesTaskQueryVariables = {}): Promise<number> => {
      const { query, variables: queryVariables } = GET_SALES_TASKS_COUNT(variables)
      try {
        const result = await graphqlClient.request<{ SalesTask: { id: string }[] }>(query, queryVariables)
        return result.SalesTask.length
      } catch (error) {
        console.error('Error fetching sales tasks count:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchSalesTasksWithCount = useCallback(
    async (variables: SalesTaskQueryVariables = {}): Promise<SalesTaskWithCountResponse> => {
      const { query, variables: queryVariables } = GET_SALES_TASKS_WITH_COUNT(variables)
      try {
        const result = await graphqlClient.request<SalesTaskWithCountResponse>(query, queryVariables)
        return result
      } catch (error) {
        console.error('Error fetching sales tasks with count:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchHistoricalStatistics = useCallback(
    async (filterVariables?: SalesTaskQueryVariables): Promise<HistoricalTaskStatisticsResponse> => {
      const { query, variables: queryVariables } = GET_HISTORICAL_TASK_STATISTICS(filterVariables)
      try {
        const result = await graphqlClient.request<HistoricalTaskStatisticsResponse>(query, queryVariables)
        return result
      } catch (error) {
        console.error('Error fetching historical task statistics:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchSalesTasks,
    fetchSalesTasksCount,
    fetchSalesTasksWithCount,
    fetchHistoricalStatistics
  }
}

/**
 * Legacy compatibility wrapper
 * @deprecated Use useSalesTaskQueries with accessToken prop instead
 */
export const useSalesTaskQueriesLegacy = (context: BusinessAppContextProps) => {
  return useSalesTaskQueries({ accessToken: context.accessToken })
}
