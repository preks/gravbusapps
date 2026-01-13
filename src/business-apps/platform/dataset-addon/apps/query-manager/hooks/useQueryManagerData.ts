import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useQueryManagementClient,
  QueryDefinition,
  QueryDefinitionListParams,
  QueryStatus,
  QueryType,
  Services
} from '@/common/network/dataset'

export interface QueryManagerData {
  queries: QueryDefinition[]
  isLoading: boolean
  error: string | null
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  actionError: string | null
  totalQueries: number
  currentPage: number
  pageSize: number
}

export const useQueryManagerData = (context: BusinessAppContextProps, service: Services, queryType: QueryType) => {
  const [queries, setQueries] = useState<QueryDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [totalQueries, setTotalQueries] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const managementClient = useQueryManagementClient(context.accessToken, service)

  const loadQueries = useCallback(
    async (params: QueryDefinitionListParams = {}, page: number = 0, size: number = 20) => {
      if (!context.accessToken) return
      const effectiveType = (params.queryType ?? queryType) as QueryType
      const hasClientFilters =
        (params.search && params.search.trim() !== '') ||
        params.status !== undefined ||
        (params.queryType !== undefined && params.queryType !== queryType)

      setIsLoading(true)
      setError(null)

      try {
        if (hasClientFilters) {
          // Fallback: fetch all (or server-filtered subset) then filter & paginate client-side
          const all = await managementClient.listQueryDefinitions({
            queryType: effectiveType,
            status: params.status,
            // some backends may support 'search'; pass it along but don't rely on it
            ...(params.search ? { search: params.search } : {})
          })
          const searchText = (params.search || '').toLowerCase()
          const filtered = (all || []).filter(q => {
            const matchType = q.queryType === effectiveType
            const matchStatus = params.status ? q.status === params.status : true
            const matchSearch =
              searchText.length === 0
                ? true
                : q.name?.toLowerCase().includes(searchText) || q.description?.toLowerCase().includes(searchText)
            return matchType && matchStatus && matchSearch
          })
          const start = page * size
          const end = start + size
          const pageData = filtered.slice(start, end)
          setQueries(pageData)
          setTotalQueries(filtered.length)
          setCurrentPage(page)
          setPageSize(size)
        } else {
          // Server-side paging without extra filters
          const response = await managementClient.listQueryDefinitionsPaged({
            queryType: effectiveType,
            page,
            size,
            sort: 'name'
          })
          setQueries(response.data || [])
          setTotalQueries(response.paging.totalRecords || 0)
          setCurrentPage(page)
          setPageSize(size)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load query definitions')
      } finally {
        setIsLoading(false)
      }
    },
    [managementClient, context.accessToken, queryType]
  )

  const createQuery = useCallback(
    async (
      queryData: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>,
      validate?: boolean
    ): Promise<boolean> => {
      setIsCreating(true)
      setActionError(null)

      try {
        await managementClient.createQueryDefinition(queryData, validate)
        await loadQueries({}, currentPage, pageSize)
        return true
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to create query')
        return false
      } finally {
        setIsCreating(false)
      }
    },
    [managementClient, loadQueries, currentPage, pageSize]
  )

  const updateQuery = useCallback(
    async (
      id: string,
      queryData: Partial<Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>>,
      validate?: boolean
    ): Promise<boolean> => {
      setIsUpdating(true)
      setActionError(null)

      try {
        await managementClient.updateQueryDefinition(id, queryData, validate)
        await loadQueries({}, currentPage, pageSize)
        return true
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to update query')
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [managementClient, loadQueries, currentPage, pageSize]
  )

  const updateQueryStatus = useCallback(
    async (id: string, status: QueryStatus): Promise<boolean> => {
      setIsUpdating(true)
      setActionError(null)

      try {
        await managementClient.updateQueryStatus(id, status)
        await loadQueries({}, currentPage, pageSize)
        return true
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to update query status')
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [managementClient, loadQueries, currentPage, pageSize]
  )

  const deleteQuery = useCallback(
    async (id: string): Promise<boolean> => {
      setIsDeleting(true)
      setActionError(null)

      try {
        await managementClient.deleteQueryDefinition(id)
        await loadQueries({}, currentPage, pageSize)
        return true
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to delete query')
        return false
      } finally {
        setIsDeleting(false)
      }
    },
    [managementClient, loadQueries, currentPage, pageSize]
  )

  const clearActionError = useCallback(() => {
    setActionError(null)
  }, [])

  useEffect(() => {
    if (context.accessToken) {
      loadQueries()
    }
  }, [context.accessToken, loadQueries, queryType])

  return {
    queries,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    actionError,
    totalQueries,
    currentPage,
    pageSize,
    loadQueries,
    createQuery,
    updateQuery,
    updateQueryStatus,
    deleteQuery,
    clearActionError,
    refetch: () => loadQueries({}, currentPage, pageSize)
  }
}
