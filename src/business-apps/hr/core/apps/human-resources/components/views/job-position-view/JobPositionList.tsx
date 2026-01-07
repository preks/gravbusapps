'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { useJobPositionListData, JobPosition } from './hooks/useJobPositionListData'
import { useJobPositionFilters } from './hooks/useJobPositionFilters'
import { useMissingJobProfileCount } from './hooks/useMissingJobProfileCount'
import { JobPositionTable } from './components/JobPositionTable'
import { JobPositionDetails } from './components/JobPositionDetails'
import { VacancyStatusToggle, ExtendedVacancyFilter } from './components/VacancyStatusToggle'
import { PiBriefcase } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PlusSquareIcon } from '@/components/dataController/DataController'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Job Position List page component. Renders the job position list module with a table view.
 * Shows vacant positions by default, with options to filter by vacancy status.
 * @returns {JSX.Element}
 */
export const JobPositionList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props
  const [vacancyFilter, setVacancyFilter] = useState<ExtendedVacancyFilter>('vacant') // Default to vacant positions
  const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [sortField, setSortField] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')
  const initialLoadDone = useRef(false)

  // Use the centralized job position filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters,
    filtersInitialized,
    enableFilters
  } = useJobPositionFilters(accessToken)

  // Get missing job profile count for display in the filter button - ALWAYS LOADED
  const { count: missingJobProfileCount } = useMissingJobProfileCount(accessToken, true)

  // Convert vacancy filter to boolean or missing profile flag for the query
  const getFilterParams = (filter: ExtendedVacancyFilter): { vacant?: boolean; missingJobProfile?: boolean } => {
    switch (filter) {
      case 'vacant':
        return { vacant: true }
      case 'filled':
        return { vacant: false }
      case 'missing-profile':
        return { missingJobProfile: true }
      case 'all':
        return {}
      default:
        return { vacant: true } // Default to vacant
    }
  }

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      // Enable filters when user first interacts with them (lazy loading)
      enableFilters()
      // Use the appropriate function directly
      if (selected) {
        addFilter(filterId)
      } else {
        removeFilter(filterId)
      }
    },
    [addFilter, removeFilter, enableFilters]
  )

  // Get job position data with filters (computed inline to avoid dependency issues)
  const filterParams = getFilterParams(vacancyFilter)
  const currentFilters = getFilters()

  const { jobPositions, total, loading, error, hasMore, loadMore, loadPage, retry } = useJobPositionListData({
    search,
    departments: currentFilters.departments,
    jobProfiles: currentFilters.jobProfiles,
    jobFunctions: currentFilters.jobFunctions,
    ...filterParams, // vacant or missingJobProfile
    accessToken,
    sortField,
    sortOrder
  })

  // Handle page changes
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      const filters = getFilters()
      loadPage(page, pageSize, {
        ...filters,
        ...getFilterParams(vacancyFilter)
      })
    },
    [loadPage, pageSize, getFilters, vacancyFilter]
  )

  // Handle page size changes
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize)
      setCurrentPage(1)
      const filters = getFilters()
      loadPage(1, newPageSize, {
        ...filters,
        ...getFilterParams(vacancyFilter)
      })
    },
    [loadPage, getFilters, vacancyFilter]
  )

  // Handle sorting changes
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    // When order is empty, clear sorting completely
    if (order === '') {
      setSortField('')
      setSortOrder('DESC') // Keep DESC as default for state type, but field will be empty
      setCurrentPage(1)
    } else {
      setSortField(field)
      setSortOrder(order)
      setCurrentPage(1)
    }
    // Note: Data reload happens automatically via useEffect below when sortField/sortOrder change
  }, [])

  // Auto-reload when sorting changes (fixes race condition)
  React.useEffect(() => {
    if ((sortField || sortOrder) && initialLoadDone.current) {
      // Only reload if there's been a sorting change and initial load is done
      const filters = getFilters()
      loadPage(1, pageSize, {
        ...filters,
        ...getFilterParams(vacancyFilter),
        sortField,
        sortOrder
      })
    }
  }, [sortField, sortOrder, vacancyFilter]) // Only depend on primitive values to avoid loops

  // Trigger initial data loading when component mounts - OPTIMIZED: Don't wait for filters
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true
      loadPage(1, pageSize) // Load first page immediately, don't wait for filters
    }
  }, [loadPage, accessToken, pageSize])

  // Trigger search when filters change - reset to page 1
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1)
      const filters = getFilters()
      loadPage(1, pageSize, {
        ...filters,
        ...getFilterParams(vacancyFilter)
      }) // Reset to first page when filters change
    }
  }, [search, selectedFilters, vacancyFilter, pageSize, filtersInitialized])

  // Handle vacancy filter changes
  const handleVacancyFilterChange = useCallback((value: ExtendedVacancyFilter) => {
    setVacancyFilter(value)
  }, [])

  // Handle job position selection
  const handleSelectJobPosition = useCallback((jobPosition: JobPosition) => {
    setSelectedJobPosition(jobPosition)
  }, [])

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedJobPosition(null)
  }, [])

  // Filter groups without vacancy status (handled separately)
  const allFilterGroups = useMemo(() => filterGroups, [filterGroups])

  // Combined filter label map (without vacancy status)
  const allFilterLabelMap = useMemo(() => filterLabelMap, [filterLabelMap])

  // Create filter array for DataController (without vacancy status)
  const activeFilters = useMemo(() => selectedFilters, [selectedFilters])

  return (
    <div data-testid="job-position-list-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: activeFilters,
          setFilter: setSelectedFilters,
          filterLabelMap: allFilterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiBriefcase size={20} />
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.tab_label',
                    'Job Positions'
                  )}
                </span>
                <span className="gba:text-muted-foreground">({total})</span>
              </div>
              <VacancyStatusToggle
                value={vacancyFilter}
                onChange={handleVacancyFilterChange}
                missingJobProfileCount={missingJobProfileCount}
              />
            </div>
          ),
          actions: (
            <AppActionMenu
              contextsArray={[FlowContextName.createJobPosition]}
              accessToken={accessToken}
              data-testid="add-job-position-menu"
              emptyStateBehavior="disable"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="add-job-position-button"
                type="button"
              >
                <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                  <PlusSquareIcon />
                </span>
                <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-foreground gba:flex-none order-1 gba:grow-0">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.add', 'Add')}
                </span>
              </button>
            </AppActionMenu>
          )
        }}
        dataFilterProps={{
          filterGroups: allFilterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="job-position-table-container" className="gba:h-full">
            <JobPositionTable
              jobPositions={jobPositions}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadMore={loadMore}
              loadPage={loadPage}
              retry={retry}
              total={total}
              onSelectJobPosition={handleSelectJobPosition}
              selectedJobPositionId={selectedJobPosition?.id}
              accessToken={accessToken}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortingChange={handleSortingChange}
            />
          </div>
        }
        dataDetails={
          selectedJobPosition
            ? {
                title: selectedJobPosition.name,
                icon: <PiBriefcase size={20} />,
                content: <JobPositionDetails jobPosition={selectedJobPosition} accessToken={accessToken} />,
                onClose: handleCloseDetails
              }
            : undefined
        }
        floatingDetails={true}
      />
    </div>
  )
}

export default JobPositionList
