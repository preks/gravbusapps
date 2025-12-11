import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionDTO } from '../types/action.types'

interface UseCreateActionResult {
  createAction: (data: Omit<ActionDTO, 'id'>) => Promise<ActionDTO | null>
  isLoading: boolean
  error: string | null
}

export const useCreateAction = (context: BusinessAppContextProps): UseCreateActionResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const createAction = useCallback(
    async (data: Omit<ActionDTO, 'id'>): Promise<ActionDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.createAction(data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create action'
        setError(errorMessage)
        console.error('Error creating action:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    createAction,
    isLoading,
    error
  }
}
