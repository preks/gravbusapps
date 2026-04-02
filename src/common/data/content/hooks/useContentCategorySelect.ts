import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { resolveContentCategoryName } from '../constants/contentConstants'
import type { ContentCategory } from '../types/contentTypes'
import { buildContentCategoriesPaginatedQuery, buildInsertContentCategoryMutation } from '../queries/contentQueries'

const PAGE_SIZE = 20

export interface ContentCategorySelectOption {
  value: string
  label: string
}

export interface UseContentCategorySelectResult {
  options: ContentCategorySelectOption[]
  total: number
  isLoading: boolean
  search: string
  setSearch: (search: string) => void
  hasMore: boolean
  loadMore: () => void
  createCategory: (name: string) => Promise<string>
}

export const useContentCategorySelect = (
  accessToken?: string,
  requiredIds?: string[]
): UseContentCategorySelectResult => {
  const [search, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [pagedItems, setPagedItems] = useState<ContentCategory[]>([])
  const [requiredItems, setRequiredItems] = useState<ContentCategory[]>([])
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
      .request<{ ContentCategory: ContentCategory[] }>(buildContentCategoriesPaginatedQuery(), {
        where: { id: { _in: ids }, isDeleted: { _eq: false } },
        limit: ids.length + 5,
        offset: 0
      })
      .then(response => setRequiredItems(response.ContentCategory || []))
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
        ContentCategory: ContentCategory[]
        ContentCategoryAggregate: { aggregate: { count: number } }
      }>(buildContentCategoriesPaginatedQuery(), { where, limit: PAGE_SIZE, offset })
      .then(response => {
        if (cancelled) return
        const newItems = response.ContentCategory || []
        const count = response.ContentCategoryAggregate?.aggregate?.count ?? 0
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

  const createCategory = useCallback(
    async (name: string): Promise<string> => {
      const trimmed = name.trim()
      const response = await graphqlClient.request<{
        InsertContentCategoryOne: { id: string; name: string }
      }>(buildInsertContentCategoryMutation(), { name: trimmed })
      const newItem = response.InsertContentCategoryOne
      setPagedItems(prev => [newItem, ...prev])
      return newItem.id
    },
    [graphqlClient]
  )

  const requiredIdsSet = new Set(stableRequiredIds.current || [])
  const pagedWithoutRequired = pagedItems.filter(item => !requiredIdsSet.has(item.id))
  const mergedItems = [...requiredItems, ...pagedWithoutRequired]

  const options: ContentCategorySelectOption[] = mergedItems.map(item => ({
    value: item.id,
    label: resolveContentCategoryName(item) || item.name || item.id
  }))

  const hasMore = total > pagedItems.length

  const loadMore = useCallback(() => {
    if (!isLoading) setOffset(prev => prev + PAGE_SIZE)
  }, [isLoading])

  return { options, total, isLoading, search, setSearch, hasMore, loadMore, createCategory }
}
