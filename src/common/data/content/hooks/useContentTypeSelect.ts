import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { resolveContentTypeName } from '../constants/contentConstants'
import type { ContentType } from '../types/contentTypes'
import { buildContentTypesPaginatedQuery } from '../queries/contentQueries'

const PAGE_SIZE = 20
const SELECT_THRESHOLD = 7

export interface ContentTypeSelectOption {
  value: string
  label: string
}

export interface UseContentTypeSelectResult {
  options: ContentTypeSelectOption[]
  total: number
  isLoading: boolean
  isReady: boolean
  search: string
  setSearch: (search: string) => void
  hasMore: boolean
  loadMore: () => void
  component: 'select' | 'combobox'
}

/**
 * Provides paginated, searchable ContentType options.
 *
 * selectedIds - current form-selected type IDs (reactive).
 * The hook fetches any selected IDs not yet in the paged results so labels
 * always resolve correctly in edit mode, even before the first page loads.
 * isReady becomes true once all selected UUIDs have a resolved label.
 */
export const useContentTypeSelect = (
  accessToken?: string,
  contentGroup?: string | null,
  selectedIds?: string[]
): UseContentTypeSelectResult => {
  const [search, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [pagedItems, setPagedItems] = useState<ContentType[]>([])
  const [resolvedItems, setResolvedItems] = useState<ContentType[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const resolvedIdsRef = useRef<Set<string>>(new Set())

  const setSearch = useCallback((s: string) => {
    setSearchTerm(s)
    setOffset(0)
  }, [])

  // Stable key derived from selected IDs to drive the resolve effect
  const selectedIdKey = useMemo(() => (selectedIds || []).filter(Boolean).join(','), [selectedIds])

  // Fetch any selected IDs not yet resolved
  useEffect(() => {
    if (!selectedIdKey) return

    const missingIds = selectedIdKey.split(',').filter(id => id && !resolvedIdsRef.current.has(id))

    if (!missingIds.length) return

    const where: Record<string, unknown> = { id: { _in: missingIds }, isDeleted: { _eq: false } }
    if (contentGroup) where.contentGroup = { _eq: contentGroup }

    graphqlClient
      .request<{ ContentType: ContentType[] }>(buildContentTypesPaginatedQuery(), {
        where,
        limit: missingIds.length + 5,
        offset: 0
      })
      .then(response => {
        const newItems = response.ContentType || []
        newItems.forEach(item => resolvedIdsRef.current.add(item.id))
        setResolvedItems(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          return [...prev, ...newItems.filter(i => !existingIds.has(i.id))]
        })
      })
      .catch(() => {})
  }, [selectedIdKey, graphqlClient, contentGroup])

  // Paginated fetch
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const where: Record<string, unknown> = { isDeleted: { _eq: false } }
    if (contentGroup) where.contentGroup = { _eq: contentGroup }
    if (search) where.name = { _ilike: `%${search}%` }

    graphqlClient
      .request<{
        ContentType: ContentType[]
        ContentTypeAggregate: { aggregate: { count: number } }
      }>(buildContentTypesPaginatedQuery(), { where, limit: PAGE_SIZE, offset })
      .then(response => {
        if (cancelled) return
        const newItems = response.ContentType || []
        const count = response.ContentTypeAggregate?.aggregate?.count ?? 0
        // Track newly paged items in the resolved set
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
  }, [search, offset, contentGroup, graphqlClient, accessToken])

  // Merged options: resolved items first, then paged items not already resolved
  const resolvedSet = useMemo(() => new Set(resolvedItems.map(i => i.id)), [resolvedItems])
  const pagedUnique = pagedItems.filter(i => !resolvedSet.has(i.id))
  const mergedItems = [...resolvedItems, ...pagedUnique]

  const options: ContentTypeSelectOption[] = mergedItems.map(item => ({
    value: item.id,
    label: resolveContentTypeName(item) || item.name || item.id
  }))

  // isReady: all selected IDs are in the resolved set
  const isReady = useMemo(() => {
    const ids = (selectedIds || []).filter(Boolean)
    if (!ids.length) return true
    return ids.every(id => resolvedIdsRef.current.has(id))
  }, [selectedIds, resolvedItems])

  const hasMore = total > pagedItems.length + resolvedItems.filter(i => !pagedItems.some(p => p.id === i.id)).length

  const loadMore = useCallback(() => {
    if (!isLoading) setOffset(prev => prev + PAGE_SIZE)
  }, [isLoading])

  const component: 'select' | 'combobox' = total <= SELECT_THRESHOLD ? 'select' : 'combobox'

  return { options, total, isLoading, isReady, search, setSearch, hasMore, loadMore, component }
}
