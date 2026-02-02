/**
 * Hook for fetching personal workspace tasks
 * Uses centralized query builders instead of hardcoded queries
 * Returns pure functions - state management handled by consumer
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildInvestmentTaskQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy,
  type InvestmentTaskQueryVariables
} from '../queries/investmentTaskQueries'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'

export interface InvestmentPersonalWorkspaceTasksVariables {
  employeeId: string
  statusFilter?: string[]
  limit?: number
  dueDateFrom?: string
  dueDateTo?: string
}

export interface InvestmentPersonalWorkspaceTasksResult {
  tasks: InvestmentTask[]
  total: number
}

/**
 * Hook to fetch tasks assigned to a specific employee
 * Used in Personal Workspace Overview and Tasks tabs
 */
export const useInvestmentPersonalWorkspaceTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTasks = useCallback(
    async (variables: InvestmentPersonalWorkspaceTasksVariables): Promise<InvestmentPersonalWorkspaceTasksResult> => {
      const { employeeId, statusFilter = ['PENDING', 'IN_PROGRESS'], limit = 100, dueDateFrom, dueDateTo } = variables

      // Build query variables
      const queryVariables: InvestmentTaskQueryVariables = {
        assignedEmployeeIds: [employeeId],
        taskStatusIds: statusFilter,
        limit,
        offset: 0,
        orderBy: [
          { field: 'dueDate', direction: 'ASC_NULLS_LAST' },
          { field: 'taskPriority', direction: 'DESC_NULLS_LAST' }
        ],
        dueDateFrom,
        dueDateTo
      }

      // Build query using central builders
      const query = buildInvestmentTaskQuery()
      const whereCondition = buildInvestmentTaskWhereCondition(queryVariables)
      const orderBy = buildInvestmentTaskOrderBy(queryVariables.orderBy || [])

      const graphQLVariables = {
        limit: queryVariables.limit,
        offset: queryVariables.offset,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<{
          InvestmentTask: any[]
          InvestmentTaskAggregate: { aggregate: { count: number } }
        }>(query, graphQLVariables)

        const mappedTasks = result.InvestmentTask.map(toInvestmentTask)
        const total = result.InvestmentTaskAggregate?.aggregate?.count || 0

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
