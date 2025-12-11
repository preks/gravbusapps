import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ContextDTO } from '../types/context.types'

interface UseUpdateContextResult {
  updateContext: (id: string, data: Partial<ContextDTO>) => Promise<ContextDTO | null>
  isLoading: boolean
  error: string | null
}

export const useUpdateContext = (context: BusinessAppContextProps): UseUpdateContextResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const updateContext = useCallback(
    async (id: string, data: Partial<ContextDTO>): Promise<ContextDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.action.updateContext(id, data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update context'
        setError(errorMessage)
        console.error('Error updating context:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    updateContext,
    isLoading,
    error
  }
}
