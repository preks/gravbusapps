import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { resolveContentTagName } from '../constants/contentConstants'
import type { ContentTag } from '../types/contentTypes'
import { buildContentTagsPaginatedQuery, buildInsertContentTagMutation } from '../queries/contentQueries'

const PAGE_SIZE = 20

export interface ContentTagSelectOption {
  value: string
  label: string
}

export interface UseContentTagSelectResult {
  options: ContentTagSelectOption[]
  total: number
  isLoading: boolean
  search: string
  setSearch: (search: string) => void
  hasMore: boolean
  loadMore: () => void
  createTag: (name: string) => Promise<string>
}

export const useContentTagSelect = (accessToken?: string, requiredIds?: string[]): UseContentTagSelectResult => {
  const [search, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [pagedItems, setPagedItems] = useState<ContentTag[]>([])
  const [requiredItems, setRequiredItems] = useState<ContentTag[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const requiredIdsFetched = useRef(false)
  const stableRequiredIds = useRef(requiredIds)

  const setSearch = useCallback((s: string) => {
    setSearchTerm(s)
    setOffset(0)
    setPagedItems([])
  }, [])

  // One-time fetch of required IDs for edit-mode label resolution
  useEffect(() => {
    const ids = stableRequiredIds.current
    if (!ids?.length || requiredIdsFetched.current) return
    requiredIdsFetched.current = true

    graphqlClient
      .request<{ ContentTag: ContentTag[] }>(buildContentTagsPaginatedQuery(), {
        where: { id: { _in: ids }, isDeleted: { _eq: false } },
        limit: ids.length + 5,
        offset: 0
      })
      .then(response => setRequiredItems(response.ContentTag || []))
      .catch(() => {})
  }, [graphqlClient])

  // Paginated fetch
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const where: Record<string, unknown> = { isDeleted: { _eq: false } }
    if (search) where.name = { _ilike: `%${search}%` }

    graphqlClient
      .request<{
        ContentTag: ContentTag[]
        ContentTagAggregate: { aggregate: { count: number } }
      }>(buildContentTagsPaginatedQuery(), { where, limit: PAGE_SIZE, offset })
      .then(response => {
        if (cancelled) return
        const newItems = response.ContentTag || []
        const count = response.ContentTagAggregate?.aggregate?.count ?? 0
        setPagedItems(prev => (offset === 0 ? newItems : [...prev, ...newItems]))
        setTotal(count)
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search, offset, graphqlClient, accessToken])

  const createTag = useCallback(
    async (name: string): Promise<string> => {
      const trimmed = name.trim()
      const response = await graphqlClient.request<{
        InsertContentTagOne: { id: string; name: string }
      }>(buildInsertContentTagMutation(), { name: trimmed })
      const newItem = response.InsertContentTagOne
      setPagedItems(prev => [newItem, ...prev])
      return newItem.id
    },
    [graphqlClient]
  )

  const requiredIdsSet = new Set(stableRequiredIds.current || [])
  const pagedWithoutRequired = pagedItems.filter(item => !requiredIdsSet.has(item.id))
  const mergedItems = [...requiredItems, ...pagedWithoutRequired]

  const options: ContentTagSelectOption[] = mergedItems.map(item => ({
    value: item.id,
    label: resolveContentTagName(item) || item.name || item.id
  }))

  const hasMore = total > pagedItems.length

  const loadMore = useCallback(() => {
    if (!isLoading) setOffset(prev => prev + PAGE_SIZE)
  }, [isLoading])

  return { options, total, isLoading, search, setSearch, hasMore, loadMore, createTag }
}
