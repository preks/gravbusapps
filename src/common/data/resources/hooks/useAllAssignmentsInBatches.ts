import { useState, useCallback } from 'react'
import type { ActionAssignmentDTO } from '../types/assignment.types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

const BATCH_SIZE = 100

export interface UseAllAssignmentsInBatchesResult {
  assignments: ActionAssignmentDTO[]
  isLoading: boolean
  error: string | null
  loadAll: () => Promise<void>
}

export const useAllAssignmentsInBatches = (
  context: BusinessAppContextProps
): UseAllAssignmentsInBatchesResult => {
  const [assignments, setAssignments] = useState<ActionAssignmentDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const loadAll = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      return
    }
    setIsLoading(true)
    setError(null)
    const accumulated: ActionAssignmentDTO[] = []
    let offset = 0
    let totalRecords = BATCH_SIZE

    try {
      while (offset < totalRecords) {
        const response = await resourceClient.action.getActionAssignments({
          limit: BATCH_SIZE,
          offset,
          returnTotalRecords: true
        })
        const data = response?.data ?? []
        const total = response?.paging?.totalRecords ?? data.length
        totalRecords = total
        accumulated.push(...data)
        offset += data.length
        if (data.length < BATCH_SIZE) break
      }
      setAssignments(accumulated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assignments'
      setError(errorMessage)
      setAssignments([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  return { assignments, isLoading, error, loadAll }
}
