/**
 * useContentEntries Hook
 * Fetch multiple content entries with filtering and pagination
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentEntry } from '../types/contentEntryTypes'
import type { ContentEntryQueryParams } from '../queries/contentQueries'
import { buildContentEntryFields, type ContentEntryQueryOptions } from '../queries/contentEntryQueryBuilder'

interface UseContentEntriesResult {
  entries: ContentEntry[]
  isLoading: boolean
  isRefetching: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentEntriesResponse {
  ContentEntry: ContentEntry[]
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Build WHERE clause as object for GraphQL
 */
const buildContentEntryWhereClause = (params: ContentEntryQueryParams): Record<string, any> => {
  const conditions: Record<string, any> = {}

  // Basic filters
  if (params.role) {
    conditions.role = { _eq: params.role }
  }

  // Support both single and multiple content groups
  if (params.contentGroupRefs && params.contentGroupRefs.length > 0) {
    conditions.contentGroupRef = { _in: params.contentGroupRefs }
  } else if (params.contentGroupRef) {
    conditions.contentGroupRef = { _eq: params.contentGroupRef }
  }

  if (params.contentTypeRef) {
    conditions.contentTypeRef = { _eq: params.contentTypeRef }
  }

  if (params.creatorEmployeeId) {
    conditions.creatorEmployeeId = { _eq: params.creatorEmployeeId }
  }

  if (params.createdBy) {
    conditions.createdBy = { _eq: params.createdBy }
  }

  if (params.parentContentEntryId !== undefined && params.parentContentEntryId !== null) {
    conditions.parentContentEntryId = { _eq: params.parentContentEntryId }
  }

  // Search across multiple fields
  if (params.search) {
    const searchPattern = `%${params.search}%`
    conditions._or = [
      { title: { _ilike: searchPattern } },
      { preview: { _ilike: searchPattern } },
      { content: { _ilike: searchPattern } }
    ]
  }

  // Category filter (relation)
  if (params.categoryRefs && params.categoryRefs.length > 0) {
    conditions.contentEntryCategories = {
      _or: params.categoryRefs.map(ref => ({ contentCategoryRef: { _eq: ref } }))
    }
  }

  // Tag filter (relation)
  if (params.tagRefs && params.tagRefs.length > 0) {
    conditions.contentEntryTags = {
      _or: params.tagRefs.map(ref => ({ contentTagRef: { _eq: ref } }))
    }
  }

  // Active period filters
  if (params.activeFrom) {
    conditions.activeFrom = { _gte: params.activeFrom }
  }
  if (params.activeTo) {
    conditions.activeTo = { _lte: params.activeTo }
  }

  // Always exclude deleted
  conditions.isDeleted = { _eq: false }

  return conditions
}

/**
 * Hook to fetch content entries with filters
 */
export const useContentEntries = (
  params: ContentEntryQueryParams = {},
  accessToken?: string,
  options?: ContentEntryQueryOptions
): UseContentEntriesResult => {
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const hasLoadedOnce = useRef(false)

  const graphqlClient = useGraphQLClient(accessToken)

  // Serialize params to create stable dependency
  const paramsKey = useMemo(() => JSON.stringify(params), [params])

  const fetchEntries = useCallback(
    async (silent = false) => {
      // If we've loaded before and have data, this is a background refetch
      if (hasLoadedOnce.current && !silent) {
        setIsRefetching(true)
      } else if (!hasLoadedOnce.current) {
        setIsLoading(true)
      }
      setError(null)

      try {
        // Build where clause
        const whereClause = buildContentEntryWhereClause(params)

        // Build order by clause as object
        const sortBy = params.sortBy || 'createdAt'
        const sortOrder = params.sortOrder || 'DESC'
        let orderByClause

        if (sortBy.includes('.')) {
          // Handle aggregate sorting
          const [aggregateName, aggregateField] = sortBy.split('.')
          orderByClause = [
            {
              [aggregateName]: {
                [aggregateField]: sortOrder
              }
            }
          ]
        } else {
          // Regular field sorting
          orderByClause = [
            {
              [sortBy]: sortOrder
            }
          ]
        }

        // Get fields from builder
        const fields = buildContentEntryFields(options || { config: 'list' })

        // Build complete query with variables
        const query = `
          query getContentEntries(
            $where: ContentEntryBoolExp
            $orderBy: [ContentEntryOrderBy!]
            $limit: Int
            $offset: Int
          ) {
            ContentEntry(
              where: $where
              orderBy: $orderBy
              limit: $limit
              offset: $offset
            ) {
              ${fields}
            }
            ContentEntryAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        const variables = {
          where: whereClause,
          orderBy: orderByClause,
          limit: params.limit || 20,
          offset: params.offset || 0
        }

        const response = await graphqlClient.request<ContentEntriesResponse>(query, variables)

        if (response.ContentEntry) {
          setEntries(response.ContentEntry)
          setTotalCount(response.ContentEntryAggregate?.aggregate?.count || response.ContentEntry.length)
        } else {
          setEntries([])
          setTotalCount(0)
        }

        hasLoadedOnce.current = true
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch content entries')
        setError(errorObj)
      } finally {
        setIsLoading(false)
        setIsRefetching(false)
      }
    },
    [paramsKey, accessToken, graphqlClient, options]
  )

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries, paramsKey])

  return {
    entries,
    isLoading,
    isRefetching,
    error,
    totalCount,
    refetch: () => fetchEntries(true)
  }
}
