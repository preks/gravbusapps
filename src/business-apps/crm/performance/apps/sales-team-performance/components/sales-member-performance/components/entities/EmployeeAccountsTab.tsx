import React, { useState, useEffect, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { useAccountFilters } from '@/business-apps/crm/core/apps/customer-relations/views/account-view/hooks/useAccountFilters'
import { useEmployeeAccountsData } from '../../hooks/useEmployeeAccountsData'
import { AccountsTable } from './AccountsTable'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface EmployeeAccountsTabProps extends BusinessAppContextProps {
  employeeId: string
  onTotalChange?: (total: number) => void
}

export const EmployeeAccountsTab: React.FC<EmployeeAccountsTabProps> = ({ employeeId, accessToken, onTotalChange }) => {
  // Filters and search
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    addFilter,
    removeFilter,
    clearAllFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange
  } = useAccountFilters({ accessToken })

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC')

  // Map filter state to GraphQL where clause
  const filters = getFilters()
  const additionalFilters = useMemo(() => {
    const andConditions: any[] = []
    if (filters.industries && filters.industries.length > 0) {
      andConditions.push({ industry: { value: { _in: filters.industries } } })
    }
    if (filters.createdAfter) {
      andConditions.push({ createdAt: { _gte: filters.createdAfter } })
    }
    if (filters.createdBefore) {
      andConditions.push({ createdAt: { _lte: filters.createdBefore } })
    }
    return andConditions.length > 0 ? { _and: andConditions } : {}
  }, [filters])

  // Data fetching
  const { accounts, total, loading, error, hasMore, loadPage, retry } = useEmployeeAccountsData({
    employeeId,
    search,
    sortField,
    sortOrder: sortOrder as 'ASC' | 'DESC',
    accessToken
  })

  // Initial and reactive data loading
  useEffect(() => {
    loadPage(currentPage, pageSize, additionalFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    employeeId,
    accessToken,
    search,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
    filters.industries && filters.industries.join(','),
    filters.createdAfter,
    filters.createdBefore
  ])

  // Report total to parent
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total)
    }
  }, [total, onTotalChange])

  // Handlers
  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
    }
  }
  const handleSortingChange = (field: string, order: 'ASC' | 'DESC' | '') => {
    setSortField(field)
    setSortOrder(order as 'ASC' | 'DESC')
    setCurrentPage(1)
  }
  const handleSetFilter = (filters: string[]) => {
    clearAllFilters()
    filters.forEach(addFilter)
    setCurrentPage(1)
  }
  const handleFilterChange = (filterId: string, selected: boolean) => {
    if (selected) {
      addFilter(filterId)
    } else {
      removeFilter(filterId)
    }
    setCurrentPage(1)
  }

  return (
    <DataContainer
      className="gba:-ml-4"
      dataControllerProps={{
        search,
        setSearch,
        filter: selectedFilters,
        setFilter: handleSetFilter,
        filterLabelMap,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-lg gba:font-semibold">Accounts</span>
            <span className="gba:text-gray-500">({total})</span>
          </div>
        )
      }}
      dataFilterProps={{
        filterGroups,
        onFilterChange: handleFilterChange
      }}
      dataBody={
        <AccountsTable
          accounts={accounts}
          loading={loading}
          error={error}
          hasMore={hasMore}
          retry={retry}
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          sortField={sortField}
          sortOrder={sortOrder as 'ASC' | 'DESC' | ''}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          accessToken={accessToken}
          employeeId={employeeId}
        />
      }
    />
  )
}
