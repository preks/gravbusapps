import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

/**
 * Task Instance Update Result
 */
export interface TaskInstanceUpdateResult {
  id: string
  taskStatus: string | null
  completedAt: string | null
  version: number
}

/**
 * Hook for updating task assignee instance status
 *
 * Supports both IRM (InvestmentTaskAssignee) and CRM (TaskAssignee) tables
 *
 * @param accessToken User access token
 * @param entityType 'investment' for IRM, 'customer' for CRM
 * @returns updateInstance function and loading/error state
 */
export const useTaskInstanceUpdate = (accessToken: string, entityType: 'investment' | 'customer' = 'investment') => {
  const graphqlClient = useGraphQLClient(accessToken)

  // Determine table name based on entity type
  const tableName = entityType === 'investment' ? 'InvestmentTaskAssignee' : 'TaskAssignee'

  /**
   * Update task instance status for a specific assignee
   *
   * @param taskAssigneeId ID of the task assignee junction record
   * @param status New status (SCHEDULED_TASK_STATUS, IN_PROGRESS_TASK_STATUS, COMPLETED_TASK_STATUS)
   * @param completedAt Optional completion timestamp (auto-set if status is COMPLETED and not provided)
   * @returns Updated task assignee record
   */
  const updateInstance = useCallback(
    async (taskAssigneeId: string, status: string, completedAt?: string | null): Promise<TaskInstanceUpdateResult> => {
      // Auto-set completedAt when marking as completed
      let finalCompletedAt = completedAt
      if (status === 'COMPLETED_TASK_STATUS' && !completedAt) {
        finalCompletedAt = new Date().toISOString()
      } else if (status !== 'COMPLETED_TASK_STATUS') {
        // Clear completedAt if not completed
        finalCompletedAt = null
      }

      const mutation = `
        mutation UpdateTaskAssignee($id: uuid!, $status: String!, $completedAt: timestamp) {
          update_${tableName}_by_pk(
            pk_columns: { id: $id }
            _set: { taskStatus: $status, completedAt: $completedAt }
          ) {
            id
            taskStatus
            completedAt
            version
          }
        }
      `

      const result = await graphqlClient.request<{ [`update_${typeof tableName}_by_pk`]: TaskInstanceUpdateResult }>(
        mutation,
        {
          id: taskAssigneeId,
          status,
          completedAt: finalCompletedAt
        }
      )

      const key = `update_${tableName}_by_pk` as const
      return result[key]
    },
    [graphqlClient, tableName]
  )

  return { updateInstance }
}
