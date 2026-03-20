import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer'
import { AbsenceTable } from '../AbsenceTable'
import { EnhancedAbsence } from '../../types'
import { useAbsenceFilters } from '../../hooks/useAbsenceFilters'
import { useAbsenceListDataSimple } from '../../hooks/useAbsenceListDataSimple'
import { useAbsenceCatalogs } from '../../hooks/useAbsenceCatalogs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface AbsenceListPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
  preFilter?: {
    type?: 'pending' | 'recent' | 'sick' | 'vacation' | 'team-away' | 'upcoming' | 'top-absentees'
    status?: string[]
    groups?: string[]
    employees?: string[]
    dateRange?: {
      startDate?: string
      endDate?: string
    }
    // Optional direct absence identifier for deep links (e.g., from Rovo)
    absenceId?: string
  }
}

/**
 * Absence List Page component that can be navigated to from dashboard cards
 */
export const AbsenceListPage: React.FC<AbsenceListPageProps> = props => {
  const { accessToken, userInfo, onNavigateBack, preFilter } = props
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
    endDate,
    creationStartDate,
    creationEndDate,
    handleDateRangeChange,
    handleCreationDateRangeChange
  } = useAbsenceFilters(props)

  const { absenceGroups } = useAbsenceCatalogs(props)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null)
  const initialLoadDone = useRef(false)
  const preFiltersApplied = useRef(false)

  useEffect(() => {
    if (preFilter && !preFiltersApplied.current && absenceGroups.length > 0) {
      preFiltersApplied.current = true

      resetFilters()

      if (preFilter.type === 'top-absentees') {
        if (preFilter.employees) {
          preFilter.employees.forEach(employeeId => {
            addFilter(employeeId)
          })
        }

        if (preFilter.status) {
          preFilter.status.forEach(status => {
            addFilter(`status-${status.toLowerCase()}`)
          })
        }

        absenceGroups.forEach(group => {
          if (group.id !== 'AbsenceGroup:v1:WORK') {
            addFilter(group.id)
          }
        })

        handleDateRangeChange(undefined, undefined)
        handleCreationDateRangeChange(undefined, undefined)
      } else if (preFilter.type === 'recent') {
        const now = new Date()
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0))

        handleCreationDateRangeChange(startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0])
        handleDateRangeChange(undefined, undefined)
      } else {
        if (preFilter.status) {
          preFilter.status.forEach(status => {
            addFilter(`status-${status.toLowerCase()}`)
          })
        }

        if (preFilter.groups) {
          preFilter.groups.forEach(group => {
            addFilter(`group-${group}`)
          })
        }

        if (preFilter.employees) {
          preFilter.employees.forEach(employeeId => {
            addFilter(employeeId)
          })
        }

        if (preFilter.dateRange) {
          // Validate dates before setting them
          const startDate = preFilter.dateRange.startDate
          const endDate = preFilter.dateRange.endDate

          // Check if dates are valid (not "Invalid Date" strings)
          const isValidDate = (dateStr?: string) => {
            if (!dateStr) return true // undefined/null is valid (means no filter)
            if (dateStr.includes('Invalid')) return false
            // Try to parse as date to ensure it's valid
            const date = new Date(dateStr)
            return !isNaN(date.getTime())
          }

          if (isValidDate(startDate) && isValidDate(endDate)) {
            handleDateRangeChange(startDate, endDate)
          } else {
            console.warn('Invalid dates in preFilter.dateRange, skipping date filter')
            handleDateRangeChange(undefined, undefined)
          }
        } else {
          handleDateRangeChange(undefined, undefined)
        }
        handleCreationDateRangeChange(undefined, undefined)
      }
    }
  }, [preFilter, addFilter, resetFilters, handleDateRangeChange, handleCreationDateRangeChange, absenceGroups])

  const filters = getFilters()

  const { absences, total, loading, error, hasMore, loadMore, loadPage, retry } = useAbsenceListDataSimple({
    ...filters,
    sortField,
    sortOrder,
    accessToken,
    orgUnitId: supervisorId,
    isTeamAwayFilter: preFilter?.type === 'team-away'
  })

  // When a specific absenceId is provided via preFilter, prefer that absence
  const displayAbsences =
    preFilter?.absenceId && absences.length > 0
      ? absences.filter(absence => absence.id === preFilter.absenceId)
      : absences

  // Auto-select the deep-linked absence when data is loaded
  useEffect(() => {
    if (preFilter?.absenceId && !selectedAbsence && absences.length > 0) {
      const match = absences.find(absence => absence.id === preFilter.absenceId)
      if (match) {
        setSelectedAbsence(match)
      }
    }
  }, [preFilter, absences, selectedAbsence])

  useEffect(() => {
    if (accessToken && supervisorId) {
      if (preFilter && !preFiltersApplied.current) {
        return
      }

      if (!initialLoadDone.current) {
        initialLoadDone.current = true
        loadPage(currentPage, pageSize)
      } else {
        setCurrentPage(1)
        loadPage(1, pageSize)
      }
    }
  }, [
    accessToken,
    supervisorId,
    search,
    JSON.stringify(selectedFilters),
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    pageSize,
    loadPage,
    preFilter,
    preFiltersApplied
  ])

  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [sortField, sortOrder, loadPage, pageSize])

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
        handleCreationDateRangeChange(undefined, undefined)
      } else {
        const removedFilters = selectedFilters.filter(f => !filters.includes(f))
        removedFilters.forEach(filterId => removeFilter(filterId))
      }
      setCurrentPage(1)
    },
    [selectedFilters, removeFilter, resetFilters, handleCreationDateRangeChange]
  )

  const handleSortChange = useCallback((field: string, order: '' | 'ASC' | 'DESC') => {
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

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize)
      setCurrentPage(1)
      loadPage(1, newPageSize)
    },
    [loadPage]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage)
      loadPage(newPage, pageSize)
    },
    [loadPage, pageSize]
  )

  const getPageTitle = () => {
    if (!preFilter) return 'Absence List'

    switch (preFilter.type) {
      case 'pending':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.pending_requests_btn',
          'Pending Requests'
        )
      case 'recent':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.recent_requests_btn',
          'Recent Requests'
        )
      case 'sick':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.sick_leaves_btn',
          'Sick Leaves'
        )
      case 'vacation':
        return 'Vacation Requests'
      case 'team-away':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.team_members_away_btn',
          'Team Members Away'
        )
      case 'upcoming':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.upcoming_absences_btn',
          'Upcoming Absences'
        )
      case 'top-absentees':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.top_absentees_btn',
          'Top Absentees'
        )
      default:
        return 'Absence List'
    }
  }

  const getPageDescription = () => {
    if (!preFilter) return 'View and manage all absence requests'

    switch (preFilter.type) {
      case 'pending':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.review_and_approve_pending_requests',
          'Review and approve pending absence requests'
        )
      case 'recent':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.view_recent_absence_requests_across_all_statuses',
          'View recent absence requests across all statuses'
        )
      case 'sick':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.view_sick_leave_requests_and_patterns',
          'View sick leave requests and patterns'
        )
      case 'vacation':
        return 'Manage vacation and time-off requests'
      case 'team-away':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.see_team_members_away',
          'See team members currently away'
        )
      case 'upcoming':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.view_upcoming_scheduled_absences',
          'View upcoming scheduled absences'
        )
      case 'top-absentees':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.view_absence_requests_most_absence_days',
          'View all absence requests for employees with the most absence days'
        )
      default:
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.dashboard.view_manage_absence_requests',
          'View and manage all absence requests'
        )
    }
  }

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid="absence-list-page">
      {/* Header */}
      <div className="gba:bg-primary-foreground gba:border-b gba:border gba:px-6 gba:py-4">
        <div className="gba:space-y-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onNavigateBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="absence-list-page-back-button"
          >
            <ArrowLeftIcon className="gba:text-lg" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
              'Back to Dashboard'
            )}
          </Button>

          {/* Title and Subtitle */}
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground" data-testid="absence-list-page-title">
              {getPageTitle()}
            </h1>
            <p className="gba:text-muted-foreground gba:mt-1" data-testid="absence-list-page-subtitle">
              {getPageDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:p-6">
        <DataContainer
          dataControllerProps={{
            search: search,
            setSearch: handleSearchChange,
            debounceDelay: 500,
            placeholder: getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_list.employee_report_filter.job_search',
              'Search absences...'
            ),
            filter: selectedFilters,
            setFilter: handleSetFilter,
            filterLabelMap: filterLabelMap,
            hideFilter: false
          }}
          dataFilterProps={{
            filterGroups: filterGroups,
            onFilterChange: handleFilterChange
          }}
          dataBody={
            <AbsenceTable
              {...props}
              absences={displayAbsences}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadMore={loadMore}
              loadPage={loadPage}
              retry={retry}
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectAbsence={setSelectedAbsence}
              onPaginationChange={(page, size) => {
                handlePageChange(page)
                if (size) handlePageSizeChange(size)
              }}
              onSortingChange={handleSortChange}
              selectedAbsenceId={selectedAbsence?.id}
            />
          }
          data-testid="absence-list-page-container"
        />
      </div>
    </div>
  )
}
