// Approve / reject a waiting Custom Flow Engine human task (APPROVAL step) from
// the workforce run surfaces. Wraps the shared FlowTasksClient mutations and
// transparently claims the task first when it sits in CLAIM mode and is not yet
// owned by the approver — the engine blocks complete/reject for non-owners.

import { useCallback, useMemo } from 'react'

import { FlowTasksClient } from '@/common/network/flows/FlowTasksClient'

export interface FlowTaskApprovalTarget {
  taskId: string
  userId: string
  assignmentMode?: string
  assignmentStatus?: string
  assignedUserId?: string
  comment?: string
}

export interface UseFlowTaskApproval {
  approve: (target: FlowTaskApprovalTarget) => Promise<void>
  reject: (target: FlowTaskApprovalTarget) => Promise<void>
}

function needsClaim(target: FlowTaskApprovalTarget): boolean {
  if ((target.assignmentMode ?? '').toUpperCase() !== 'CLAIM') return false
  return target.assignedUserId !== target.userId
}

export function useFlowTaskApproval(accessToken: string | null | undefined): UseFlowTaskApproval {
  const client = useMemo(() => (accessToken ? new FlowTasksClient(accessToken) : null), [accessToken])

  const ensureClaimed = useCallback(
    async (target: FlowTaskApprovalTarget): Promise<void> => {
      if (!client || !needsClaim(target)) return
      await client.claim(target.taskId, { userId: target.userId })
    },
    [client]
  )

  const approve = useCallback(
    async (target: FlowTaskApprovalTarget): Promise<void> => {
      if (!client) throw new Error('Sign in required to approve.')
      await ensureClaimed(target)
      await client.complete(target.taskId, { userId: target.userId, comment: target.comment })
    },
    [client, ensureClaimed]
  )

  const reject = useCallback(
    async (target: FlowTaskApprovalTarget): Promise<void> => {
      if (!client) throw new Error('Sign in required to reject.')
      await ensureClaimed(target)
      await client.reject(target.taskId, { userId: target.userId, comment: target.comment })
    },
    [client, ensureClaimed]
  )

  return useMemo(() => ({ approve, reject }), [approve, reject])
}
