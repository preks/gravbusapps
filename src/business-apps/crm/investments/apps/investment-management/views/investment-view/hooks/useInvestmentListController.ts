import { useState, useCallback, useEffect, useRef } from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface InvestmentListControllerParams {
  search?: string
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface InvestmentListController {
  // State
  search: string
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  initialLoadDone: React.MutableRefObject<boolean>

  // Setters
  setSearch: (value: string) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setSortField: (field: string) => void
  setSortOrder: (order: 'ASC' | 'DESC') => void

  // Handlers
  handlePaginationChange: (page: number, newPageSize?: number) => void
  handleSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
  updateURLParams: (params: InvestmentListControllerParams) => void
}

/**
 * Shared controller hook for investment lists with URL synchronization
 * Following the pattern from @AccountList.tsx
 */
export const useInvestmentListController = (): InvestmentListController => {
  // Get initial values from URL parameters - ONLY ONCE
  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      search: urlParams.get('search') || '',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: parseInt(urlParams.get('pageSize') || '20', 10),
      sortField: urlParams.get('sortField') || '',
      sortOrder: urlParams.get('sortOrder') || 'DESC'
    }
  })

  // State management
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(initialParams.page)
  const [pageSize, setPageSize] = useState(initialParams.pageSize)
  const [sortField, setSortField] = useState(initialParams.sortField)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialParams.sortOrder as 'ASC' | 'DESC')
  const initialLoadDone = useRef(false)

  // Initialize search from URL if not already set - ONLY ONCE
  useEffect(() => {
    if (initialParams.search && !search) {
      setSearch(initialParams.search)
    }
  }, []) // Remove dependencies to prevent re-running

  // Update URL parameters using standard web APIs
  const updateURLParams = useCallback((params: InvestmentListControllerParams) => {
    const newSearchParams = new URLSearchParams(window.location.search)

    if (params.search !== undefined) {
      if (params.search) {
        newSearchParams.set('search', params.search)
      } else {
        newSearchParams.delete('search')
      }
    }

    if (params.page !== undefined) {
      if (params.page > 1) {
        newSearchParams.set('page', params.page.toString())
      } else {
        newSearchParams.delete('page')
      }
    }

    if (params.pageSize !== undefined) {
      if (params.pageSize !== 20) {
        newSearchParams.set('pageSize', params.pageSize.toString())
      } else {
        newSearchParams.delete('pageSize')
      }
    }

    if (params.sortField !== undefined) {
      if (params.sortField !== 'createdAt' && params.sortField !== '') {
        newSearchParams.set('sortField', params.sortField)
      } else {
        newSearchParams.delete('sortField')
      }
    }

    if (params.sortOrder !== undefined) {
      if (params.sortOrder !== 'DESC') {
        newSearchParams.set('sortOrder', params.sortOrder)
      } else {
        newSearchParams.delete('sortOrder')
      }
    }

    try {
      const params: Record<string, string> = {}
      newSearchParams.forEach((value, key) => {
        params[key] = value
      })

      const newURL = buildPlatformUrl(window.location.pathname, params)

      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newURL)
      }
    } catch (error) {
      console.warn('Failed to update URL in investment list controller:', error)
    }
  }, [])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      const targetPageSize = newPageSize || pageSize
      setCurrentPage(page)
      setPageSize(targetPageSize)
      updateURLParams({ page, pageSize: targetPageSize })
    },
    [pageSize, updateURLParams]
  )

  // Handle sorting change - following AccountList pattern exactly
  const handleSortingChange = useCallback(
    (field: string, order: 'ASC' | 'DESC' | '') => {
      // When order is empty, clear sorting completely
      if (order === '') {
        setSortField('')
        setSortOrder('DESC') // Keep DESC as default for state type, but field will be empty
        setCurrentPage(1)
        updateURLParams({
          sortField: '',
          sortOrder: 'DESC',
          page: 1
        })
      } else {
        setSortField(field)
        setSortOrder(order)
        setCurrentPage(1)
        updateURLParams({
          sortField: field,
          sortOrder: order,
          page: 1
        })
      }
    },
    [updateURLParams]
  )

  return {
    // State
    search,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    initialLoadDone,

    // Setters
    setSearch,
    setCurrentPage,
    setPageSize,
    setSortField,
    setSortOrder,

    // Handlers
    handlePaginationChange,
    handleSortingChange,
    updateURLParams
  }
}
