import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionDTO } from '../types/action.types'

interface UseUpdateActionResult {
  updateAction: (id: string, data: Partial<ActionDTO>) => Promise<ActionDTO | null>
  isLoading: boolean
  error: string | null
}

export const useUpdateAction = (context: BusinessAppContextProps): UseUpdateActionResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const updateAction = useCallback(
    async (id: string, data: Partial<ActionDTO>): Promise<ActionDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      if (!id) {
        setError('Action ID is required')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.updateAction(id, data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update action'
        setError(errorMessage)
        console.error('Error updating action:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    updateAction,
    isLoading,
    error
  }
}
