import { useCallback, useEffect, useRef, useState } from 'react'
import type { NoteActionItemFlow } from '../types'
import { FlowEngineApiService } from '../services/FlowEngineApiService'

export interface UseActionItemFlowStatusSyncOptions {
  accessToken?: string
  flows: NoteActionItemFlow[]
  onFlowsUpdated: (next: NoteActionItemFlow[]) => void
}

function isTerminal(status: NoteActionItemFlow['status']): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELED'
}

export function useActionItemFlowStatusSync(options: UseActionItemFlowStatusSyncOptions): {
  isSyncing: boolean
  syncNow: () => Promise<void>
} {
  const { accessToken, flows, onFlowsUpdated } = options
  const flowsRef = useRef<NoteActionItemFlow[]>(flows)
  const onFlowsUpdatedRef = useRef(onFlowsUpdated)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    flowsRef.current = flows
  }, [flows])

  useEffect(() => {
    onFlowsUpdatedRef.current = onFlowsUpdated
  }, [onFlowsUpdated])

  const syncNow = useCallback(async () => {
    if (!accessToken) return
    if (flowsRef.current.length === 0) return

    const current = flowsRef.current
    const active = current.filter(f => !isTerminal(f.status))
    if (active.length === 0) return

    setIsSyncing(true)
    const service = new FlowEngineApiService(accessToken)
    try {
      const updates = await Promise.all(
        active.map(async f => {
          const status = await service.getFlowStatus(f.workflowId)
          if (!status) return null
          return {
            id: f.id,
            status: status.status,
            completedAt: status.completedAt,
            lastSyncedAt: status.lastSyncedAt
          }
        })
      )

      const updatesMap = new Map(
        updates.filter(Boolean).map(u => [u!.id, u!]) as Array<[string, NonNullable<(typeof updates)[number]>]>
      )

      if (updatesMap.size === 0) return

      let changed = false
      const next = current.map(f => {
        const u = updatesMap.get(f.id)
        if (!u) return f

        const nextCompletedAt = u.completedAt || f.completedAt
        const nextStatus = u.status
        const nextLastSyncedAt = u.lastSyncedAt

        if (nextStatus !== f.status || nextCompletedAt !== f.completedAt || nextLastSyncedAt !== f.lastSyncedAt) {
          changed = true
          return {
            ...f,
            status: nextStatus,
            completedAt: nextCompletedAt,
            lastSyncedAt: nextLastSyncedAt
          }
        }
        return f
      })

      if (changed) {
        onFlowsUpdatedRef.current(next)
      }
    } catch {
      // ignore sync errors (best-effort)
    } finally {
      setIsSyncing(false)
    }
  }, [accessToken])

  return { isSyncing, syncNow }
}
