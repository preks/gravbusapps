/**
 * Hook for fetching combined calendar data (activities + tasks) in parallel
 * Used in Personal Workspace Overview calendar for performance optimization
 * Executes both queries simultaneously using Promise.all for faster loading
 * Returns both activities and tasks for the displayed date range
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildInvestmentActivityQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy,
  type InvestmentActivityQueryVariables
} from '../queries/investmentActivityQueries'
import {
  buildInvestmentTaskQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy,
  type InvestmentTaskQueryVariables
} from '../queries/investmentTaskQueries'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import { toInvestmentActivity } from '../mappers/investmentRelatedEntityMappers'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'

export interface InvestmentCalendarDataVariables {
  employeeId: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export interface InvestmentCalendarDataResult {
  activities: InvestmentActivity[]
  activitiesTotal: number
  tasks: InvestmentTask[]
  tasksTotal: number
}

/**
 * Hook to fetch both activities and tasks in parallel using Promise.all
 * Optimized for calendar view in Personal Workspace
 */
export const useInvestmentCalendarData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCalendarData = useCallback(
    async (variables: InvestmentCalendarDataVariables): Promise<InvestmentCalendarDataResult> => {
      const { employeeId, dateFrom, dateTo, limit = 100 } = variables

      // Build activities query variables
      const activitiesQueryVariables: InvestmentActivityQueryVariables = {
        ownerEmployeeIds: [employeeId],
        limit,
        offset: 0,
        orderBy: [{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }],
        occurredAtFrom: dateFrom,
        occurredAtTo: dateTo
      }

      // Build tasks query variables
      const tasksQueryVariables: InvestmentTaskQueryVariables = {
        assignedEmployeeIds: [employeeId],
        taskStatusIds: [
          'InvestmentTaskStatus:v1:PENDING',
          'InvestmentTaskStatus:v1:IN_PROGRESS',
          'InvestmentTaskStatus:v1:OVERDUE'
        ],
        limit,
        offset: 0,
        orderBy: [
          { field: 'dueDate', direction: 'ASC_NULLS_LAST' },
          { field: 'taskPriority', direction: 'DESC_NULLS_LAST' }
        ],
        dueDateFrom: dateFrom,
        dueDateTo: dateTo
      }

      // Build queries and conditions
      const activitiesQuery = buildInvestmentActivityQuery()
      const activitiesWhereCondition = buildInvestmentActivityWhereCondition(activitiesQueryVariables)
      const activitiesOrderBy = buildInvestmentActivityOrderBy(activitiesQueryVariables.orderBy || [])

      const tasksQuery = buildInvestmentTaskQuery()
      const tasksWhereCondition = buildInvestmentTaskWhereCondition(tasksQueryVariables)
      const tasksOrderBy = buildInvestmentTaskOrderBy(tasksQueryVariables.orderBy || [])

      const activitiesGraphQLVariables = {
        limit: activitiesQueryVariables.limit,
        offset: activitiesQueryVariables.offset,
        where: activitiesWhereCondition,
        orderBy: activitiesOrderBy
      }

      const tasksGraphQLVariables = {
        limit: tasksQueryVariables.limit,
        offset: tasksQueryVariables.offset,
        where: tasksWhereCondition,
        orderBy: tasksOrderBy
      }

      try {
        // Execute both queries in parallel (single network round-trip with batching)
        const [activitiesResult, tasksResult] = await Promise.all([
          graphqlClient.request<{
            InvestmentActivity: any[]
            InvestmentActivityAggregate: { aggregate: { count: number } }
          }>(activitiesQuery, activitiesGraphQLVariables),
          graphqlClient.request<{
            InvestmentTask: any[]
            InvestmentTaskAggregate: { aggregate: { count: number } }
          }>(tasksQuery, tasksGraphQLVariables)
        ])

        const mappedActivities = activitiesResult.InvestmentActivity.map(toInvestmentActivity)
        const mappedTasks = tasksResult.InvestmentTask.map(toInvestmentTask)
        const activitiesTotal = activitiesResult.InvestmentActivityAggregate?.aggregate?.count || 0
        const tasksTotal = tasksResult.InvestmentTaskAggregate?.aggregate?.count || 0

        return {
          activities: mappedActivities,
          activitiesTotal,
          tasks: mappedTasks,
          tasksTotal
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchCalendarData }
}
