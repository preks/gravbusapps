'use client'

import useJobPositions from '@/business-apps/hr/core/forms/job-position/hooks/useJobPositions.ts'
import JobPositionForm from '@/business-apps/hr/core/forms/job-position/JobPositionForm.tsx'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PlusSquareIcon } from '@/components/dataController/DataController'
import { DataContainer } from '@/components/layout/dataContainer'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { BriefcaseIcon } from '@phosphor-icons/react'
import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { JobPositionDetails } from './components/JobPositionDetails'
import { JobPositionTable } from './components/JobPositionTable'
import { ExtendedVacancyFilter, VacancyStatusToggle } from './components/VacancyStatusToggle'
import { useJobPositionFilters } from './hooks/useJobPositionFilters'
import { JobPosition, useJobPositionListData } from './hooks/useJobPositionListData'
import { useMissingJobProfileCount } from './hooks/useMissingJobProfileCount'
import { mapJobPositionListRowToFormJobPosition } from './utils/mapJobPositionListRowToFormJobPosition'

/**
 * Job Position List page component. Renders the job position list module with a table view.
 * Shows vacant positions by default, with options to filter by vacancy status.
 * @returns {JSX.Element}
 */
export const JobPositionList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props
  const { deleteJobPosition, mutationLoading: deleteJobPositionLoading } = useJobPositions(props)
  const [vacancyFilter, setVacancyFilter] = useState<ExtendedVacancyFilter>('vacant') // Default to vacant positions
  const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null)
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [editListRow, setEditListRow] = useState<JobPosition | null>(null)
  const [terminateRow, setTerminateRow] = useState<JobPosition | null>(null)
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

  const refreshList = useCallback(() => {
    const filters = getFilters()
    loadPage(currentPage, pageSize, {
      ...filters,
      ...getFilterParams(vacancyFilter),
      sortField,
      sortOrder
    })
  }, [loadPage, currentPage, pageSize, getFilters, vacancyFilter, sortField, sortOrder])

  const setEditModalOpen: Dispatch<SetStateAction<boolean>> = useCallback(updater => {
    setEditFormOpen(prev => {
      const next = typeof updater === 'function' ? (updater as (p: boolean) => boolean)(prev) : updater
      if (!next) {
        setEditListRow(null)
      }
      return next
    })
  }, [])

  const handleOpenEditJobPosition = useCallback((row: JobPosition) => {
    setEditListRow(row)
    setEditFormOpen(true)
  }, [])

  const handleRequestTerminate = useCallback((row: JobPosition) => {
    setTerminateRow(row)
  }, [])

  const handleConfirmTerminate = useCallback(async () => {
    if (!terminateRow) return
    try {
      await deleteJobPosition(terminateRow.id, terminateRow.version ?? undefined)
      if (selectedJobPosition?.id === terminateRow.id) {
        setSelectedJobPosition(null)
      }
      setTerminateRow(null)
      refreshList()
    } catch {
      // Errors and success toasts are handled in useJobPositions.deleteJobPosition
    }
  }, [terminateRow, deleteJobPosition, selectedJobPosition, refreshList])

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
                <BriefcaseIcon size={20} />
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
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
              data-testid="add-job-position-button"
              type="button"
              onClick={() => setCreateFormOpen(true)}
            >
              <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                <PlusSquareIcon />
              </span>
              <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-foreground gba:flex-none order-1 gba:grow-0">
                {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.add', 'Add')}
              </span>
            </button>
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
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortingChange={handleSortingChange}
              onEditJobPosition={handleOpenEditJobPosition}
              onRequestTerminateJobPosition={handleRequestTerminate}
              terminateMutationLoading={deleteJobPositionLoading}
              terminatingJobPositionId={deleteJobPositionLoading && terminateRow ? terminateRow.id : null}
            />
          </div>
        }
      />
      <Sheet open={selectedJobPosition !== null} onOpenChange={open => !open && handleCloseDetails()}>
        <SheetContent
          side="right"
          className="gba:flex gba:flex-col gba:p-0"
          data-testid="job-position-list-details-sheet"
        >
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <SheetTitle className="gba:text-left">
              {selectedJobPosition
                ? selectedJobPosition.name
                : getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.position_details',
                    'Position Details'
                  )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:min-h-0" data-testid="job-position-list-details-content">
            {selectedJobPosition && (
              <JobPositionDetails
                jobPosition={selectedJobPosition}
                accessToken={accessToken}
                onEditJobPosition={handleOpenEditJobPosition}
                onRequestTerminateJobPosition={handleRequestTerminate}
                terminateMutationLoading={deleteJobPositionLoading}
                terminatingJobPositionId={deleteJobPositionLoading && terminateRow ? terminateRow.id : null}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
      {accessToken && createFormOpen ? (
        <JobPositionForm
          {...props}
          open={createFormOpen}
          setOpen={setCreateFormOpen}
          onCancel={() => setCreateFormOpen(false)}
          onMutationSuccess={refreshList}
          prefixDataTestId="job-position-create"
        />
      ) : null}

      {accessToken && editFormOpen && editListRow ? (
        <JobPositionForm
          {...props}
          key={editListRow.id}
          jobPosition={mapJobPositionListRowToFormJobPosition(editListRow)}
          open={editFormOpen}
          setOpen={setEditModalOpen}
          onCancel={() => {
            setEditFormOpen(false)
            setEditListRow(null)
          }}
          onMutationSuccess={refreshList}
          prefixDataTestId="job-position-edit"
        />
      ) : null}

      <Dialog open={Boolean(terminateRow)} onOpenChange={open => !open && setTerminateRow(null)}>
        <DialogContent data-testid="job-position-terminate-confirm-dialog">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.job_positions_section.terminate_position',
                'Terminate job position'
              )}
            </DialogTitle>
          </DialogHeader>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:human_resources_page.job_positions_section.terminate_position_confirm',
              'This will remove the job position. This action cannot be undone.'
            )}
          </p>
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerminateRow(null)}
              data-testid="job-position-terminate-cancel"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteJobPositionLoading}
              onClick={() => void handleConfirmTerminate()}
              data-testid="job-position-terminate-confirm"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.job_positions_section.terminate',
                'Terminate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default JobPositionList
