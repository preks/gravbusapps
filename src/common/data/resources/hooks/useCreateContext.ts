import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ContextDTO } from '../types/context.types'

interface UseCreateContextResult {
  createContext: (data: Omit<ContextDTO, 'id'>) => Promise<ContextDTO | null>
  isLoading: boolean
  error: string | null
}

export const useCreateContext = (context: BusinessAppContextProps): UseCreateContextResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const createContext = useCallback(
    async (data: Omit<ContextDTO, 'id'>): Promise<ContextDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.action.createContext(data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create context'
        setError(errorMessage)
        console.error('Error creating context:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    createContext,
    isLoading,
    error
  }
}
