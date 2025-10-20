import React, { useState, useEffect, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { useOpportunityFilters } from '@/business-apps/crm/core/apps/customer-relations/views/opportunity-view/opportunity-list/hooks/useOpportunityFilters'
import { useEmployeeOpportunitiesData } from '../../hooks/useEmployeeOpportunitiesData'
import { OpportunitiesTable } from './OpportunitiesTable'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface EmployeeOpportunitiesTabProps extends BusinessAppContextProps {
  employeeId: string
  onTotalChange?: (total: number) => void
}

export const EmployeeOpportunitiesTab: React.FC<EmployeeOpportunitiesTabProps> = ({
  employeeId,
  accessToken,
  onTotalChange
}) => {
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
  } = useOpportunityFilters({ accessToken })

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC')

  // Map filter state to GraphQL where clause
  const filters = getFilters()
  const additionalFilters = useMemo(() => {
    const andConditions: any[] = []
    if (filters.stages && filters.stages.length > 0) {
      // Filter on opportunity.salesPipelineStage?.value
      andConditions.push({
        salesPipelineStage: { value: { _in: filters.stages } }
      })
    }
    if (filters.pipelines && filters.pipelines.length > 0) {
      // Filter on opportunity.salesPipeline?.value
      andConditions.push({
        salesPipeline: { value: { _in: filters.pipelines } }
      })
    }
    if (filters.winningChanceRanges && filters.winningChanceRanges.length > 0) {
      // Build OR for all selected ranges
      const orRanges = filters.winningChanceRanges.map((range: { min: number; max: number }) => ({
        winningChance: { _gte: range.min, _lte: range.max }
      }))
      andConditions.push({ _or: orRanges })
    }
    if (filters.amountRanges && filters.amountRanges.length > 0) {
      // Build OR for all selected ranges
      const orAmounts = filters.amountRanges.map((range: { min?: number; max?: number }) => {
        const cond: any = {}
        if (range.min !== undefined) cond._gte = range.min
        if (range.max !== undefined) cond._lte = range.max
        return { estimatedAmount: cond }
      })
      andConditions.push({ _or: orAmounts })
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
  const { opportunities, total, loading, error, hasMore, loadPage, retry } = useEmployeeOpportunitiesData({
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
  }, [employeeId, accessToken, search, sortField, sortOrder, currentPage, pageSize, JSON.stringify(additionalFilters)])

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
            <span className="gba:text-lg gba:font-semibold">Opportunities</span>
            <span className="gba:text-gray-500">({total})</span>
          </div>
        )
      }}
      dataFilterProps={{
        filterGroups,
        onFilterChange: handleFilterChange
      }}
      dataBody={
        <OpportunitiesTable
          opportunities={opportunities}
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
