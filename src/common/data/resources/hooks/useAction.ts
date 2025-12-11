import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionDTO } from '../types/action.types'

interface UseActionResult {
  action: ActionDTO | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useAction = (context: BusinessAppContextProps, id: string): UseActionResult => {
  const [action, setAction] = useState<ActionDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const fetchAction = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    if (!id) {
      setError('Action ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await resourceClient.getAction(id)
      setAction(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch action'
      setError(errorMessage)
      console.error('Error fetching action:', err)
      setAction(null)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, id])

  useEffect(() => {
    if (context.accessToken && id) {
      fetchAction()
    }
  }, [context.accessToken, id, fetchAction])

  return {
    action,
    isLoading,
    error,
    refetch: fetchAction
  }
}
