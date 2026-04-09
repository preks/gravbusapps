import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { resolveContentTagName } from '../constants/contentConstants'
import type { ContentTag } from '../types/contentTypes'
import { buildContentTagsPaginatedQuery } from '../queries/contentQueries'

const PAGE_SIZE = 20

export interface ContentTagSelectOption {
  value: string
  label: string
}

export interface UseContentTagSelectResult {
  options: ContentTagSelectOption[]
  total: number
  isLoading: boolean
  isReady: boolean
  search: string
  setSearch: (search: string) => void
  hasMore: boolean
  loadMore: () => void
}

/**
 * Provides paginated, searchable ContentTag options.
 *
 * selectedIds - current form-selected tag IDs (reactive).
 * The hook fetches any selected IDs not yet in the paged results so labels
 * always resolve correctly in edit mode.
 * isReady becomes true once all selected UUIDs have a resolved label.
 */
export const useContentTagSelect = (accessToken?: string, selectedIds?: string[]): UseContentTagSelectResult => {
  const [search, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [pagedItems, setPagedItems] = useState<ContentTag[]>([])
  const [resolvedItems, setResolvedItems] = useState<ContentTag[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const resolvedIdsRef = useRef<Set<string>>(new Set())

  const setSearch = useCallback((s: string) => {
    setSearchTerm(s)
    setOffset(0)
  }, [])

  const selectedIdKey = useMemo(() => (selectedIds || []).filter(Boolean).join(','), [selectedIds])

  // Fetch any selected IDs not yet resolved
  useEffect(() => {
    if (!selectedIdKey) return

    const missingIds = selectedIdKey.split(',').filter(id => id && !resolvedIdsRef.current.has(id))

    if (!missingIds.length) return

    graphqlClient
      .request<{ ContentTag: ContentTag[] }>(buildContentTagsPaginatedQuery(), {
        where: { id: { _in: missingIds }, isDeleted: { _eq: false } },
        limit: missingIds.length + 5,
        offset: 0
      })
      .then(response => {
        const newItems = response.ContentTag || []
        newItems.forEach(item => resolvedIdsRef.current.add(item.id))
        setResolvedItems(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          return [...prev, ...newItems.filter(i => !existingIds.has(i.id))]
        })
      })
      .catch(() => {})
  }, [selectedIdKey, graphqlClient])

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
        newItems.forEach(item => resolvedIdsRef.current.add(item.id))
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

  const resolvedSet = useMemo(() => new Set(resolvedItems.map(i => i.id)), [resolvedItems])
  const pagedUnique = pagedItems.filter(i => !resolvedSet.has(i.id))
  const mergedItems = [...resolvedItems, ...pagedUnique]

  const options: ContentTagSelectOption[] = mergedItems.map(item => ({
    value: item.id,
    label: resolveContentTagName(item) || item.name || item.id
  }))

  const isReady = useMemo(() => {
    const ids = (selectedIds || []).filter(Boolean)
    if (!ids.length) return true
    return ids.every(id => resolvedIdsRef.current.has(id))
  }, [selectedIds, resolvedItems])

  const hasMore = total > pagedItems.length

  const loadMore = useCallback(() => {
    if (!isLoading) setOffset(prev => prev + PAGE_SIZE)
  }, [isLoading])

  return { options, total, isLoading, isReady, search, setSearch, hasMore, loadMore }
}
