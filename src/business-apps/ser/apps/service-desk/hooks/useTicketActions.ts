import { useState } from 'react'
import type { Comment } from '../../../../packages/services-plus-core/src'
import { ConductorWorkflowEngineAdapter } from '../../../services/ConductorWorkflowEngineAdapter'
import type { UserInfoProps } from '@/common/BusinessAppContext'

export interface UseTicketActionsProps {
  accessToken: string
  userInfo?: UserInfoProps
  onSuccess?: () => void
  onError?: (error: string) => void
}

export interface UseTicketActionsReturn {
  claimTicket: (stepId: string) => Promise<void>
  unclaimTicket: (stepId: string, comment?: string) => Promise<void>
  assignTicket: (stepId: string, userId: string) => Promise<void>
  completeTicket: (stepId: string, payload?: any) => Promise<void>
  rejectTicket: (stepId: string, reason: string) => Promise<void>
  advanceTicket: (stepId: string, payload?: any) => Promise<void>
  addComment: (stepId: string, body: string, visibility?: string) => Promise<Comment>
  isLoading: boolean
  isPerformingAction: boolean
}

/**
 * Hook to handle ticket actions (claim, assign, advance, comment)
 * Always uses ConductorWorkflowEngineAdapter for real API integration
 */
export const useTicketActions = ({
  accessToken,
  userInfo,
  onSuccess,
  onError
}: UseTicketActionsProps): UseTicketActionsReturn => {
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false)

  // Always use ConductorWorkflowEngineAdapter for real API integration
  const getEngine = () => {
    console.log(`🎯 [useTicketActions] Using ConductorWorkflowEngineAdapter for actions`)
    return new ConductorWorkflowEngineAdapter({ accessToken, userInfo })
  }

  const handleAction = async <T>(actionName: string, actionFn: () => Promise<T>): Promise<T> => {
    try {
      setIsPerformingAction(true)
      const result = await actionFn()
      onSuccess?.()
      return result
    } catch (err) {
      console.error(`Error performing ${actionName}:`, err)
      const errorMessage = err instanceof Error ? err.message : `Failed to ${actionName}`
      onError?.(errorMessage)
      throw err
    } finally {
      setIsPerformingAction(false)
    }
  }

  const claimTicket = async (stepId: string): Promise<void> => {
    return handleAction('claim ticket', async () => {
      const workflowEngine = getEngine()
      const userId = userInfo?.id || 'current-user'
      console.log(`🎯 [useTicketActions] *** CLAIMING TICKET: ${stepId} by user: ${userId} ***`)
      await workflowEngine.claim(stepId, userId)
    })
  }

  const assignTicket = async (stepId: string, assignToUserId: string): Promise<void> => {
    return handleAction('reassign ticket', async () => {
      const workflowEngine = getEngine()
      const currentUserId = userInfo?.id || 'current-user'
      console.log(
        `🎯 [useTicketActions] *** REASSIGNING TICKET: ${stepId} from ${currentUserId} to ${assignToUserId} ***`
      )
      await workflowEngine.assign(stepId, currentUserId, assignToUserId, `Reassigned via Service Desk`)
    })
  }

  const advanceTicket = async (stepId: string, payload?: any): Promise<void> => {
    return handleAction('advance ticket', async () => {
      const workflowEngine = getEngine()
      const userId = userInfo?.id || 'current-user'
      console.log(
        `🎯 [useTicketActions] *** ADVANCING TICKET: ${stepId} by user: ${userId} ***`,
        payload ? 'with form data' : 'without form data'
      )
      await workflowEngine.advance(stepId, userId, payload, `Completed via Service Desk`)
    })
  }

  const unclaimTicket = async (stepId: string, comment?: string): Promise<void> => {
    return handleAction('unclaim ticket', async () => {
      const workflowEngine = getEngine()
      const userId = userInfo?.id || 'current-user'
      console.log(`🎯 [useTicketActions] *** UNCLAIMING TICKET: ${stepId} by user: ${userId} ***`)
      await workflowEngine.unclaim(stepId, userId, comment)
    })
  }

  const completeTicket = async (stepId: string, payload?: any): Promise<void> => {
    return handleAction('complete ticket', async () => {
      const workflowEngine = getEngine()
      const userId = userInfo?.id || 'current-user'
      console.log(
        `🎯 [useTicketActions] *** COMPLETING TICKET: ${stepId} by user: ${userId} ***`,
        payload ? 'with form data' : 'without form data'
      )
      await workflowEngine.advance(stepId, userId, payload, 'Completed via Service Desk')
    })
  }

  const rejectTicket = async (stepId: string, reason: string): Promise<void> => {
    return handleAction('reject ticket', async () => {
      const workflowEngine = getEngine()
      const userId = userInfo?.id || 'current-user'
      console.log(`🎯 [useTicketActions] *** REJECTING TICKET: ${stepId} by user: ${userId} with reason: ${reason} ***`)
      await workflowEngine.reject(stepId, userId, reason)
    })
  }

  const addComment = async (stepId: string, body: string, visibility?: string): Promise<Comment> => {
    return handleAction('add comment', async () => {
      const workflowEngine = getEngine()
      const userId = userInfo?.id || 'current-user'
      console.log(
        `🎯 [useTicketActions] *** ADDING COMMENT to: ${stepId} by user: ${userId} with visibility: ${visibility || 'default'} ***`
      )
      return await workflowEngine.comment(stepId, userId, body, visibility)
    })
  }

  return {
    claimTicket,
    unclaimTicket,
    assignTicket,
    completeTicket,
    rejectTicket,
    advanceTicket,
    addComment,
    isLoading: isPerformingAction, // Alias for backward compatibility
    isPerformingAction
  }
}
