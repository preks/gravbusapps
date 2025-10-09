import { useState, useCallback, useEffect } from 'react'
import { useSalesTaskQueries } from './useSalesTaskQueries'

export interface ReferenceTypeCounts {
  opportunity: number
  account: number
  lead: number
  contact: number
}

export interface UseTaskReferenceCountsProps {
  accessToken: string
  sourceApp?: string
}

export interface UseTaskReferenceCountsReturn {
  counts: ReferenceTypeCounts
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useTaskReferenceCounts = ({
  accessToken,
  sourceApp
}: UseTaskReferenceCountsProps): UseTaskReferenceCountsReturn => {
  const [counts, setCounts] = useState<ReferenceTypeCounts>({
    opportunity: 0,
    account: 0,
    lead: 0,
    contact: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { fetchSalesTasks } = useSalesTaskQueries({ accessToken })

  const calculateReferenceCounts = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskReferenceCounts')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all tasks to calculate reference counts (non-deleted only)
      const result = await fetchSalesTasks({
        limit: 1000, // Get enough records to calculate accurate counts
        offset: 0,
        orderBy: [{ createdAt: 'DESC' }]
        // Note: Deletion filtering is already handled by salesTaskQueryBuilder.ts
        // which adds: recordState: { _neq: "DELETED" }
      })

      const tasks = result.SalesTask || []

      // Calculate counts based on which reference entities exist
      const referenceCounts = {
        opportunity: 0,
        account: 0,
        lead: 0,
        contact: 0
      }

      tasks.forEach(task => {
        if (task.opportunity?.id) {
          referenceCounts.opportunity++
        } else if (task.account?.id) {
          referenceCounts.account++
        } else if (task.lead?.id) {
          referenceCounts.lead++
        } else if (task.contact?.id) {
          referenceCounts.contact++
        }
      })

      setCounts(referenceCounts)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to calculate reference counts')
      setError(error)
      console.error('Error calculating reference counts:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, fetchSalesTasks])

  const refetch = useCallback(() => {
    calculateReferenceCounts()
  }, [calculateReferenceCounts])

  useEffect(() => {
    if (accessToken) {
      calculateReferenceCounts()
    }
  }, [calculateReferenceCounts])

  return {
    counts,
    loading,
    error,
    refetch
  }
}
