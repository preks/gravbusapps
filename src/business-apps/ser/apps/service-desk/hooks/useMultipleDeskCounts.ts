import { useState, useEffect } from 'react'
import { createConductorWorkflowEngine } from '../../../services'
import type { StepReceiver } from '../../../../packages/services-plus-core/src'

export interface UseMultipleDeskCountsProps {
  deskKeys: string[]
  accessToken: string
  userInfo?: any
}

export interface UseMultipleDeskCountsReturn {
  counts: Record<string, number>
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch ticket counts for multiple desks dynamically
 * This replaces the need for hardcoded individual useDeskTickets calls
 */
export const useMultipleDeskCounts = ({
  deskKeys,
  accessToken,
  userInfo
}: UseMultipleDeskCountsProps): UseMultipleDeskCountsReturn => {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = async () => {
    if (!accessToken || !userInfo || !deskKeys.length) {
      setCounts({})
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(`[useMultipleDeskCounts] Fetching counts for desks:`, deskKeys)

      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
      const newCounts: Record<string, number> = {}

      // Fetch ticket count for each desk
      await Promise.all(
        deskKeys.map(async deskKey => {
          try {
            const tickets = await workflowEngine.getDeskTickets(deskKey as StepReceiver)
            newCounts[deskKey] = tickets?.length || 0
            console.log(`[useMultipleDeskCounts] Desk "${deskKey}": ${newCounts[deskKey]} tickets`)
          } catch (deskError) {
            console.warn(`[useMultipleDeskCounts] Failed to fetch tickets for desk "${deskKey}":`, deskError)
            newCounts[deskKey] = 0 // Default to 0 on error
          }
        })
      )

      setCounts(newCounts)
      console.log(`[useMultipleDeskCounts] Final counts:`, newCounts)
    } catch (err) {
      console.error('[useMultipleDeskCounts] Error fetching desk counts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch desk counts')
      setCounts({})
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [accessToken, userInfo, JSON.stringify(deskKeys)]) // Use JSON.stringify for array comparison

  return {
    counts,
    isLoading,
    error,
    refetch: fetchCounts
  }
}
