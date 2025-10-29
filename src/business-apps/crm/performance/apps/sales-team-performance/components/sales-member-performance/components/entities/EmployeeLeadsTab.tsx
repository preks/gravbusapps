import React, { useState, useCallback, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { useLeadFilters } from '@/business-apps/crm/core/apps/customer-relations/views/lead-view/hooks/useLeadFilters'
import { useEmployeeLeadsData } from '../../hooks/useEmployeeLeadsData'
import { LeadsTable } from './LeadsTable'

interface EmployeeLeadsTabProps {
  employeeId: string
  accessToken: string
  onTotalChange?: (total: number) => void
}

export const EmployeeLeadsTab: React.FC<EmployeeLeadsTabProps> = ({ employeeId, accessToken, onTotalChange }) => {
  // Filter/search state
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange
  } = useLeadFilters({ accessToken })

  // Table state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  // Map filter state to GraphQL where clause
  // Instead of using getFilters(), we'll build the filters object from the current state
  const filters = useMemo(() => {
    const result: any = {}

    // Parse selected filters to extract filter types and values
    selectedFilters.forEach(filterId => {
      // Lead statuses (direct enum values)
      if (
        ['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS'].includes(
          filterId
        )
      ) {
        if (!result.leadStatuses) result.leadStatuses = []
        result.leadStatuses.push(filterId)
      }
      // Lead ratings (direct enum values)
      else if (['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(filterId)) {
        if (!result.leadRatings) result.leadRatings = []
        result.leadRatings.push(filterId)
      }
      // Other filters with prefixes (from catalog data)
      else if (filterId.startsWith('source-')) {
        if (!result.leadSources) result.leadSources = []
        result.leadSources.push(filterId.replace('source-', ''))
      } else if (filterId.startsWith('industry-')) {
        if (!result.industries) result.industries = []
        result.industries.push(filterId.replace('industry-', ''))
      } else if (filterId.startsWith('size-')) {
        if (!result.companySizes) result.companySizes = []
        result.companySizes.push(filterId.replace('size-', ''))
      } else if (filterId.startsWith('owner-')) {
        if (!result.owners) result.owners = []
        result.owners.push(filterId.replace('owner-', ''))
      }
      // Direct IDs (for backward compatibility)
      else {
        // This handles any remaining filter IDs that don't match the above patterns
        // You might need to adjust this based on your actual filter ID structure
        if (!result.other) result.other = []
        result.other.push(filterId)
      }
    })

    // Add date range filters
    if (createdAfter) {
      result.createdAfter = createdAfter
    }
    if (createdBefore) {
      result.createdBefore = createdBefore
    }

    return result
  }, [selectedFilters, createdAfter, createdBefore])
  const additionalFilters = useMemo(() => {
    const andConditions: any[] = []
    if (filters.leadStatuses && filters.leadStatuses.length > 0) {
      andConditions.push({ leadStatus: { id: { _in: filters.leadStatuses } } })
    }
    if (filters.leadRatings && filters.leadRatings.length > 0) {
      andConditions.push({ leadRating: { id: { _in: filters.leadRatings } } })
    }
    if (filters.leadSources && filters.leadSources.length > 0) {
      andConditions.push({ leadSource: { id: { _in: filters.leadSources } } })
    }
    if (filters.companySizes && filters.companySizes.length > 0) {
      andConditions.push({
        numberOfEmployees: { id: { _in: filters.companySizes } }
      })
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
  const { leads, total, loading, error, hasMore, loadPage } = useEmployeeLeadsData({
    employeeId,
    search,
    sortField,
    sortOrder,
    accessToken,
    additionalFilters
  })

  // Handlers
  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      setCurrentPage(page)
      setPageSize(newPageSize || pageSize)
      loadPage(page, newPageSize || pageSize, additionalFilters)
    },
    [pageSize, loadPage, additionalFilters]
  )

  const handleSortingChange = useCallback(
    (field: string, order: 'ASC' | 'DESC' | '') => {
      setSortField(field)
      setSortOrder(order as 'ASC' | 'DESC')
      loadPage(1, pageSize, additionalFilters)
      setCurrentPage(1)
    },
    [pageSize, loadPage, additionalFilters]
  )

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (selected) {
        addFilter(filterId)
      } else {
        removeFilter(filterId)
      }
      setCurrentPage(1)
    },
    [addFilter, removeFilter]
  )

  const handleSetFilter = useCallback(
    (filters: string[]) => {
      if (filters.length === 0) resetFilters()
      else filters.forEach(f => addFilter(f))
      setCurrentPage(1)
    },
    [resetFilters, addFilter]
  )

  // Ensure data loads on initial mount and whenever filters/search/sort/page change
  React.useEffect(() => {
    loadPage(currentPage, pageSize, additionalFilters)
  }, [employeeId, accessToken, search, sortField, sortOrder, currentPage, pageSize, JSON.stringify(additionalFilters)])

  // Report total count changes to parent
  React.useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total)
    }
  }, [total, onTotalChange])

  return (
    <DataContainer
      className="gba:-ml-4"
      dataControllerProps={{
        search,
        setSearch,
        debounceDelay: 500,
        filter: selectedFilters,
        setFilter: handleSetFilter,
        filterLabelMap,
        dateRange: {
          createdAfter,
          createdBefore,
          onClear: () => handleDateRangeChange(undefined, undefined)
        },
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <span>Leads</span>
            <span className="gba:text-gray-500">({total})</span>
          </div>
        )
      }}
      dataFilterProps={{
        filterGroups,
        onFilterChange: handleFilterChange
      }}
      dataBody={
        <LeadsTable
          leads={leads}
          loading={loading}
          error={error}
          hasMore={hasMore}
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          sortField={sortField}
          sortOrder={sortOrder}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          accessToken={accessToken}
          employeeId={employeeId}
        />
      }
    />
  )
}

export default EmployeeLeadsTab
