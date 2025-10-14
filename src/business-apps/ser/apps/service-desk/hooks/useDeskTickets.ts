import { useState, useEffect } from 'react'
import type { StepReceiver } from '../../../../packages/services-plus-core/src'
import type { StepInstance } from '../../../types'
import { createConductorWorkflowEngine } from '../../../services'

export interface UseDeskTicketsProps {
  deskKey: StepReceiver
  accessToken: string
  userInfo?: any
}

export interface UseDeskTicketsReturn {
  tickets: StepInstance[] | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch tickets for a specific desk
 * Integrates with WorkflowEngine.getDeskTickets()
 */
export const useDeskTickets = ({ deskKey, accessToken, userInfo }: UseDeskTicketsProps): UseDeskTicketsReturn => {
  const [tickets, setTickets] = useState<StepInstance[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log(`[useDeskTickets] Fetching tickets for desk: ${deskKey}`, {
        hasAccessToken: !!accessToken,
        hasUserInfo: !!userInfo
      })

      // Use real workflow engine - requires authentication
      if (!accessToken || !userInfo) {
        throw new Error('Authentication required - no access token or user info provided')
      }

      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
      console.log(`[useDeskTickets] Using ${workflowEngine.constructor.name} for desk: ${deskKey}`)

      // Fetch tickets for this desk using the engine
      const deskTickets = await workflowEngine.getDeskTickets(deskKey)

      console.log(`[useDeskTickets] Retrieved ${deskTickets.length} tickets for desk: ${deskKey}`, deskTickets)
      setTickets(deskTickets)
    } catch (err) {
      console.error(`[useDeskTickets] Error fetching desk tickets for ${deskKey}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken && deskKey) {
      fetchTickets()
    }
  }, [deskKey, accessToken, userInfo])

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets
  }
}
