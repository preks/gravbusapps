import { useState, useEffect, useCallback, useRef } from 'react'
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
  search: string
  setSearch: (search: string) => void
  hasMore: boolean
  loadMore: () => void
  component: 'select' | 'combobox'
}

export const useContentTypeSelect = (
  accessToken?: string,
  contentGroup?: string | null,
  requiredIds?: string[]
): UseContentTypeSelectResult => {
  const [search, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [pagedItems, setPagedItems] = useState<ContentType[]>([])
  const [requiredItems, setRequiredItems] = useState<ContentType[]>([])
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

    const where: Record<string, unknown> = { id: { _in: ids }, isDeleted: { _eq: false } }
    if (contentGroup) {
      where.contentGroup = { _eq: contentGroup }
    }

    graphqlClient
      .request<{ ContentType: ContentType[] }>(buildContentTypesPaginatedQuery(), {
        where,
        limit: ids.length + 5,
        offset: 0
      })
      .then(response => setRequiredItems(response.ContentType || []))
      .catch(() => {})
  }, [graphqlClient, contentGroup])

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

  const requiredIdsSet = new Set(stableRequiredIds.current || [])
  const pagedWithoutRequired = pagedItems.filter(item => !requiredIdsSet.has(item.id))
  const mergedItems = [...requiredItems, ...pagedWithoutRequired]

  const options: ContentTypeSelectOption[] = mergedItems.map(item => ({
    value: item.id,
    label: resolveContentTypeName(item) || item.name || item.id
  }))

  const hasMore =
    pagedItems.length < total && !search ? total > pagedItems.length + requiredItems.length : total > pagedItems.length

  const loadMore = useCallback(() => {
    if (!isLoading) setOffset(prev => prev + PAGE_SIZE)
  }, [isLoading])

  const component: 'select' | 'combobox' = total <= SELECT_THRESHOLD ? 'select' : 'combobox'

  return { options, total, isLoading, search, setSearch, hasMore, loadMore, component }
}
