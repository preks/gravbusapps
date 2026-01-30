import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ContextDTO } from '../types/context.types'

interface UseContextResult {
  context: ContextDTO | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useContext = (context: BusinessAppContextProps, id: string): UseContextResult => {
  const [contextData, setContextData] = useState<ContextDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const fetchContext = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    if (!id) {
      setError('Context ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await resourceClient.getContext(id)
      setContextData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch context'
      setError(errorMessage)
      console.error('Error fetching context:', err)
      setContextData(null)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, id])

  useEffect(() => {
    if (context.accessToken && id) {
      fetchContext()
    }
  }, [context.accessToken, id, fetchContext])

  return {
    context: contextData,
    isLoading,
    error,
    refetch: fetchContext
  }
}
