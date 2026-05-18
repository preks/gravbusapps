import { useCallback, useEffect, useState } from 'react'
import { useCustomDataClient } from './useCustomDataClient'
import type { CreateNamespaceDto, CustomDataNamespace } from '../types'

const NAMESPACE_PAGE_LIMIT = 100
const NAMESPACE_SORT = '+namespace'

interface UseNamespacesResult {
  namespaces: CustomDataNamespace[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasNextPage: boolean
  loadNextPage: () => Promise<void>
  refetch: () => Promise<void>
  createNamespace: (dto: CreateNamespaceDto) => Promise<CustomDataNamespace>
}

export const useNamespaces = (accessToken: string): UseNamespacesResult => {
  const client = useCustomDataClient(accessToken)
  const [namespaces, setNamespaces] = useState<CustomDataNamespace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextOffset, setNextOffset] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)

  const fetchNamespaces = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setIsLoadingMore(false)
    setError(null)
    try {
      const response = await client.listNamespaces({
        offset: 0,
        limit: NAMESPACE_PAGE_LIMIT,
        sort: NAMESPACE_SORT
      })
      setNamespaces(response.data)
      setNextOffset(response.paging.offset + response.data.length)
      setHasNextPage(Boolean(response._links.next))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load namespaces')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client])

  const loadNextPage = useCallback(async () => {
    if (!accessToken || isLoading || isLoadingMore || !hasNextPage) return

    setIsLoadingMore(true)
    setError(null)

    try {
      const response = await client.listNamespaces({
        offset: nextOffset,
        limit: NAMESPACE_PAGE_LIMIT,
        sort: NAMESPACE_SORT
      })
      setNamespaces(prev => [...prev, ...response.data])
      setNextOffset(response.paging.offset + response.data.length)
      setHasNextPage(Boolean(response._links.next))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load namespaces')
    } finally {
      setIsLoadingMore(false)
    }
  }, [accessToken, client, hasNextPage, isLoading, isLoadingMore, nextOffset])

  useEffect(() => {
    fetchNamespaces()
  }, [fetchNamespaces])

  const createNamespace = useCallback(
    async (dto: CreateNamespaceDto): Promise<CustomDataNamespace> => {
      const created = await client.createNamespace(dto)
      setNamespaces(prev => [...prev, created].sort((a, b) => String(a.namespace).localeCompare(String(b.namespace))))
      return created
    },
    [client]
  )

  return {
    namespaces,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadNextPage,
    refetch: fetchNamespaces,
    createNamespace
  }
}
