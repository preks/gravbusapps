import React, { useState, useCallback, useEffect, useRef } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AbsenceTable } from '../../AbsenceTable'
import { EnhancedAbsence } from '../../../types'
import { useAbsenceFilters } from '../../../hooks/useAbsenceFilters'
import { useAbsenceListDataSimple } from '../../../hooks/useAbsenceListDataSimple'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const AbsenceListModern: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo } = props
  const supervisorId = userInfo?.employeeDetails?.employeeId

  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    getFilters,
    startDate,
    endDate
  } = useAbsenceFilters(props)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null)
  const initialLoadDone = useRef(false)

  const { absences, total, loading, error, hasMore, loadMore, loadPage, retry } = useAbsenceListDataSimple({
    ...getFilters(),
    sortField,
    sortOrder,
    accessToken,
    orgUnitId: supervisorId
  })

  useEffect(() => {
    if (!initialLoadDone.current && accessToken && supervisorId) {
      initialLoadDone.current = true
      loadPage(currentPage, pageSize)
    }
  }, [accessToken, supervisorId, currentPage, pageSize])

  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [search, pageSize])

  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [JSON.stringify(selectedFilters), startDate, endDate, pageSize, sortField, sortOrder])

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      setCurrentPage(1)
    },
    [setSearch]
  )

  const handleSetFilter = useCallback(
    (filters: string[]) => {
      if (filters.length === 0) {
        resetFilters()
      } else {
        const removedFilters = selectedFilters.filter(f => !filters.includes(f))
        removedFilters.forEach(filterId => removeFilter(filterId))
      }
    },
    [resetFilters, selectedFilters, removeFilter]
  )

  const handleSelectAbsence = useCallback((absence: EnhancedAbsence) => {
    setSelectedAbsence(absence)
  }, [])

  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      const targetPageSize = newPageSize || pageSize
      setCurrentPage(page)
      setPageSize(targetPageSize)
      loadPage(page, targetPageSize)
    },
    [pageSize, loadPage]
  )

  const handleSortingChange = useCallback((field: string, order: '' | 'ASC' | 'DESC') => {
    if (order === '') {
      setSortField('')
      setSortOrder('DESC')
      setCurrentPage(1)
    } else {
      setSortField(field)
      setSortOrder(order)
      setCurrentPage(1)
    }
  }, [])

  return (
    <div data-testid="absence-list-modern-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_manager.absence_list_screen.title',
                    'Absences'
                  )}
                </span>
                <span className="gba:text-muted-foreground">({total})</span>
              </div>
            </div>
          )
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="absence-table-container">
            <AbsenceTable
              {...props}
              absences={absences}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadMore={loadMore}
              loadPage={loadPage}
              retry={retry}
              total={total}
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectAbsence={handleSelectAbsence}
              onPaginationChange={handlePaginationChange}
              onSortingChange={handleSortingChange}
              selectedAbsenceId={selectedAbsence?.id}
            />
          </div>
        }
      />
    </div>
  )
}
