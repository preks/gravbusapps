import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Contact } from '@/common/data/relations/types/contactTypes'
import { useEmployeeContactsQueries, EmployeeContactsQueryVariables } from '../queries/EmployeeContactsQueries'
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits'

interface UseEmployeeContactsDataProps {
  employeeId: string
  search?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  accessToken: string
}

interface UseEmployeeContactsDataReturn {
  contacts: Contact[]
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  loadPage: (page: number, pageSize?: number, additionalFilters?: any) => Promise<void>
  retry: () => void
}

export const useEmployeeContactsData = ({
  employeeId,
  search = '',
  sortField = 'createdAt',
  sortOrder = 'DESC',
  accessToken
}: UseEmployeeContactsDataProps): UseEmployeeContactsDataReturn => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [hasMore, setHasMore] = useState(true)

  const { fetchEmployeeContacts } = useEmployeeContactsQueries({
    accessToken
  } as BusinessAppContextProps)

  const loadPage = useCallback(
    async (targetPage: number, newPageSize: number = pageSize, additionalFilters: any = {}) => {
      if (!employeeId) {
        setError(new Error('Employee ID is required'))
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(newPageSize)
        const offset = (targetPage - 1) * safePageSize

        // Build where clause for additional filters
        const conditions: any[] = []

        // Add search conditions
        if (search) {
          const searchConditions = [
            { firstName: { _ilike: `%${search}%` } },
            { lastName: { _ilike: `%${search}%` } },
            { email: { _ilike: `%${search}%` } },
            { phone: { _ilike: `%${search}%` } },
            { jobTitle: { _ilike: `%${search}%` } },
            { account: { name: { _ilike: `%${search}%` } } }
          ]
          conditions.push({ _or: searchConditions })
        }

        // Add additional filters
        if (Object.keys(additionalFilters).length > 0) {
          conditions.push(additionalFilters)
        }

        const where =
          conditions.length === 0
            ? undefined
            : {
                _and: conditions
              }
        // Build orderBy based on sortField and sortOrder
        let orderBy: any = {}
        if (sortField && sortField !== '') {
          if (sortField === 'firstName') {
            orderBy = {
              lastName: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST',
              firstName: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (sortField === 'account') {
            orderBy = {
              account: {
                name: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
              }
            }
          } else {
            orderBy[sortField] = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }
        } else {
          // No sorting - use natural order (by ID)
          orderBy.id = 'ASC_NULLS_LAST'
        }

        const variables: EmployeeContactsQueryVariables = {
          employeeId,
          offset,
          limit: safePageSize,
          orderBy: [orderBy],
          where
        }

        const result = await fetchEmployeeContacts(variables)

        setContacts(result.Contact || [])
        setTotal(result.ContactAggregate?.aggregate?.count || 0)
        setCurrentPage(targetPage)
        setPageSize(safePageSize)
        setHasMore((result.Contact || []).length === safePageSize)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load employee contacts'))
        setContacts([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [employeeId, fetchEmployeeContacts, search, pageSize, sortField, sortOrder]
  )

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    loadPage(currentPage + 1)
  }, [hasMore, loading, currentPage, loadPage])

  const retry = useCallback(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage])

  return {
    contacts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  }
}
