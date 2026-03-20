import { useCallback } from 'react'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { useBaseGraphQLDataFetch } from './useBaseGraphQLDataFetch'

export interface ActiveTaskItem {
  id: string
  name: string
  description: string
  dueDate: string | null
  status: {
    value: string
  } | null
  priority: {
    value: string
  } | null
  assignedEmployee: {
    firstName: string
    lastName: string
    displayName?: string
  } | null
  lead: {
    id: string
    name?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  opportunity: {
    id: string
    name: string
  } | null
  account: {
    id: string
    name: string
  } | null
  contact: {
    id: string
    firstName: string
    lastName: string
  } | null
}

/**
 * Configuration for task queries (module-agnostic)
 * Each module (CRM, IRM, etc.) provides its specific configuration
 */
export interface ActiveTasksConfig {
  /** Task table name (e.g., 'SalesTask', 'InvestmentTask') */
  taskTable: string
  /** Task aggregate table name */
  taskAggregateTable: string
  /** Status field name (e.g., 'status' or 'taskStatus') */
  statusField: string
  /** Priority field name */
  priorityField: string
  /** Lead field name */
  leadField: string
  /** Opportunity field name */
  opportunityField: string
  /** Lead name fields GraphQL query fragment (e.g., 'name' or 'firstName\n              lastName') */
  leadNameFields: string
}

export interface UseActiveTasksDataProps {
  accessToken: string
  enabled?: boolean
  config: ActiveTasksConfig
  limit?: number
  offset?: number
  currentEmployeeId?: string // Optional: filter tasks assigned to specific employee
}

export interface UseActiveTasksDataReturn {
  tasks: ActiveTaskItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: (limit?: number, offset?: number) => void
}

/**
 * Generic hook for fetching active tasks (tasks without endDate)
 * Module-agnostic - accepts configuration for any module
 *
 * Features:
 * - Pagination support (limit/offset)
 * - Total count for pagination
 * - Configurable table and field names
 * - Fetches only active tasks (endDate is null)
 * - Handles multiple assignees (taskAssignees)
 */
export const useActiveTasksData = ({
  accessToken,
  enabled = true,
  config,
  limit = 20,
  offset = 0,
  currentEmployeeId
}: UseActiveTasksDataProps): UseActiveTasksDataReturn => {
  const fetchTasks = useCallback(
    async ({
      graphqlClient,
      limit: fetchLimit,
      offset: fetchOffset
    }: {
      graphqlClient: GraphQLClient
      limit: number
      offset: number
    }) => {
      const tasksQuery = `
        query GetActiveTasks($limit: Int, $offset: Int${currentEmployeeId ? ', $currentEmployeeId: uuid' : ''}) {
          tasks: ${config.taskTable}(
            where: {
              isDeleted: { _eq: false }
              endDate: { _isNull: true }
              ${currentEmployeeId ? 'taskAssignees: { assignedEmployeeId: { _eq: $currentEmployeeId }, isDeleted: { _eq: false } }' : ''}
            }
            limit: $limit
            offset: $offset
            orderBy: { createdAt: DESC }
          ) {
            id
            name
            description
            dueDate
            ${config.statusField} {
              value
            }
            ${config.priorityField} {
              value
            }
            taskAssignees(where: { isDeleted: { _eq: false } }) {
              assignedEmployee {
                firstName
                lastName
                displayName
              }
            }
            ${config.leadField} {
              id
              ${config.leadNameFields}
            }
            ${config.opportunityField} {
              id
              name
            }
            account {
              id
              name
            }
            contact {
              id
              firstName
              lastName
            }
          }
          tasksAggregate: ${config.taskAggregateTable}(
            where: {
              isDeleted: { _eq: false }
              endDate: { _isNull: true }
              ${currentEmployeeId ? 'taskAssignees: { assignedEmployeeId: { _eq: $currentEmployeeId }, isDeleted: { _eq: false } }' : ''}
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const variables: any = {
        limit: fetchLimit,
        offset: fetchOffset
      }

      if (currentEmployeeId) {
        variables.currentEmployeeId = currentEmployeeId
      }

      const result = await graphqlClient.request<any>(tasksQuery, variables)

      // Transform data to unified structure
      const transformedTasks: ActiveTaskItem[] = (result.tasks || []).map((task: any) => {
        // Handle taskAssignees array - combine all assignees into a comma-separated display
        const assignees = task.taskAssignees || []
        const assignedEmployee =
          assignees.length > 0
            ? {
                firstName: assignees[0].assignedEmployee?.firstName || '',
                lastName: assignees[0].assignedEmployee?.lastName || '',
                // Combine all assignee names separated by comma
                displayName: assignees
                  .map(
                    (a: any) =>
                      a.assignedEmployee?.displayName ||
                      `${a.assignedEmployee?.firstName || ''} ${a.assignedEmployee?.lastName || ''}`.trim()
                  )
                  .filter(Boolean)
                  .join(', ')
              }
            : null

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          dueDate: task.dueDate,
          status: task[config.statusField] || null,
          priority: task[config.priorityField] || null,
          assignedEmployee,
          lead: task[config.leadField] || null,
          opportunity: task[config.opportunityField] || null,
          account: task.account || null,
          contact: task.contact || null
        }
      })

      const totalCount = result.tasksAggregate?.aggregate?.count || 0

      return {
        data: transformedTasks,
        totalCount
      }
    },
    [config, currentEmployeeId]
  )

  const { data, totalCount, isLoading, error, refetch } = useBaseGraphQLDataFetch<ActiveTaskItem>({
    accessToken,
    enabled,
    limit,
    offset,
    fetchFn: fetchTasks
  })

  return {
    tasks: data,
    totalCount,
    isLoading,
    error,
    refetch
  }
}
