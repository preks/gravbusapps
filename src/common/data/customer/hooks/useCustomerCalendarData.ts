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
  buildCustomerActivityQuery,
  buildCustomerActivityWhereCondition,
  buildCustomerActivityOrderBy,
  type CustomerActivityQueryVariables
} from '../queries/customerActivityQueries'
import {
  buildCustomerTaskQuery,
  buildCustomerTaskWhereCondition,
  buildCustomerTaskOrderBy,
  type CustomerTaskQueryVariables
} from '../queries/customerTaskQueries'
import type { CustomerActivity } from '../types/customerActivityTypes'
import type { CustomerTask } from '../types/customerTaskTypes'
import { toCustomerActivity } from '../mappers/customerRelatedEntityMappers'
import { toCustomerTask } from '../mappers/customerTaskMappers'

export interface CustomerCalendarDataVariables {
  employeeId: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export interface CustomerCalendarDataResult {
  activities: CustomerActivity[]
  activitiesTotal: number
  tasks: CustomerTask[]
  tasksTotal: number
}

/**
 * Hook to fetch both activities and tasks in parallel using Promise.all
 * Optimized for calendar view in Personal Workspace
 */
export const useCustomerCalendarData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCalendarData = useCallback(
    async (variables: CustomerCalendarDataVariables): Promise<CustomerCalendarDataResult> => {
      const { employeeId, dateFrom, dateTo, limit = 100 } = variables

      // Build activities query variables
      const activitiesQueryVariables: CustomerActivityQueryVariables = {
        ownerEmployeeIds: [employeeId],
        limit,
        offset: 0,
        orderBy: [{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }],
        occurredAtFrom: dateFrom,
        occurredAtTo: dateTo
      }

      // Build tasks query variables
      const tasksQueryVariables: CustomerTaskQueryVariables = {
        assignedEmployeeIds: [employeeId],
        taskStatusIds: ['SalesTaskStatus:v1:PENDING', 'SalesTaskStatus:v1:IN_PROGRESS', 'SalesTaskStatus:v1:OVERDUE'],
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
      const activitiesQuery = buildCustomerActivityQuery()
      const activitiesWhereCondition = buildCustomerActivityWhereCondition(activitiesQueryVariables)
      const activitiesOrderBy = buildCustomerActivityOrderBy(activitiesQueryVariables.orderBy || [])

      const tasksQuery = buildCustomerTaskQuery()
      const tasksWhereCondition = buildCustomerTaskWhereCondition(tasksQueryVariables)
      const tasksOrderBy = buildCustomerTaskOrderBy(tasksQueryVariables.orderBy || [])

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
            SalesActivity: any[]
            SalesActivityAggregate: { aggregate: { count: number } }
          }>(activitiesQuery, activitiesGraphQLVariables),
          graphqlClient.request<{
            SalesTask: any[]
            SalesTaskAggregate: { aggregate: { count: number } }
          }>(tasksQuery, tasksGraphQLVariables)
        ])

        const mappedActivities = activitiesResult.SalesActivity.map(toCustomerActivity)
        const mappedTasks = tasksResult.SalesTask.map(toCustomerTask)
        const activitiesTotal = activitiesResult.SalesActivityAggregate?.aggregate?.count || 0
        const tasksTotal = tasksResult.SalesTaskAggregate?.aggregate?.count || 0

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
