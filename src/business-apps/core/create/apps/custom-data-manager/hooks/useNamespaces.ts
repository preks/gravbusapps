import { useCallback, useEffect, useState } from 'react'
import { useCustomDataClient } from './useCustomDataClient'
import type { CreateNamespaceDto, CustomDataNamespace } from '../types'

interface UseNamespacesResult {
  namespaces: CustomDataNamespace[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createNamespace: (dto: CreateNamespaceDto) => Promise<CustomDataNamespace>
}

export const useNamespaces = (accessToken: string): UseNamespacesResult => {
  const client = useCustomDataClient(accessToken)
  const [namespaces, setNamespaces] = useState<CustomDataNamespace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNamespaces = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await client.listNamespaces()
      setNamespaces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load namespaces')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client])

  useEffect(() => {
    fetchNamespaces()
  }, [fetchNamespaces])

  const createNamespace = useCallback(
    async (dto: CreateNamespaceDto): Promise<CustomDataNamespace> => {
      const created = await client.createNamespace(dto)
      // keep list sorted
      setNamespaces(prev => [...prev, created].sort((a, b) => String(a.namespace).localeCompare(String(b.namespace))))
      return created
    },
    [client]
  )

  return {
    namespaces,
    isLoading,
    error,
    refetch: fetchNamespaces,
    createNamespace
  }
}
