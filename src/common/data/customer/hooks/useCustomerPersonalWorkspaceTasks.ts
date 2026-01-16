/**
 * Hook for fetching personal workspace tasks
 * Uses centralized query builders instead of hardcoded queries
 * Returns pure functions - state management handled by consumer
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildCustomerTaskQuery,
  buildCustomerTaskWhereCondition,
  buildCustomerTaskOrderBy,
  type CustomerTaskQueryVariables
} from '../queries/customerTaskQueries'
import type { CustomerTask } from '../types/customerTaskTypes'
import { toCustomerTask } from '../mappers/customerTaskMappers'

export interface CustomerPersonalWorkspaceTasksVariables {
  employeeId: string
  statusFilter?: string[]
  limit?: number
}

export interface CustomerPersonalWorkspaceTasksResult {
  tasks: CustomerTask[]
  total: number
}

/**
 * Hook to fetch tasks assigned to a specific employee
 * Used in Personal Workspace Overview and Tasks tabs
 */
export const useCustomerPersonalWorkspaceTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTasks = useCallback(
    async (variables: CustomerPersonalWorkspaceTasksVariables): Promise<CustomerPersonalWorkspaceTasksResult> => {
      const { employeeId, statusFilter = ['PENDING', 'IN_PROGRESS'], limit = 100 } = variables

      // Build query variables
      const queryVariables: CustomerTaskQueryVariables = {
        assigneeEmployeeIds: [employeeId],
        statusCodes: statusFilter,
        limit,
        offset: 0,
        orderBy: [
          { field: 'dueDate', direction: 'ASC_NULLS_LAST' },
          { field: 'priority', direction: 'DESC_NULLS_LAST' }
        ]
      }

      // Build query using central builders
      const query = buildCustomerTaskQuery()
      const whereCondition = buildCustomerTaskWhereCondition(queryVariables)
      const orderBy = buildCustomerTaskOrderBy(queryVariables.orderBy || [])

      const graphQLVariables = {
        limit: queryVariables.limit,
        offset: queryVariables.offset,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<{
          SalesTask: any[]
          SalesTaskAggregate: { aggregate: { count: number } }
        }>(query, graphQLVariables)

        const mappedTasks = result.SalesTask.map(toCustomerTask)
        const total = result.SalesTaskAggregate?.aggregate?.count || 0

        return { tasks: mappedTasks, total }
      } catch (error) {
        console.error('Error fetching personal workspace tasks:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchTasks }
}
