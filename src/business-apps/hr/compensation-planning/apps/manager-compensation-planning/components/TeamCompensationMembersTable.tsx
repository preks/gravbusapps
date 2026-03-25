import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import {
  DataDisplay,
  DataTable,
  TooltipProvider,
  useTranslation,
  type FilterConfiguration
} from '@newwork/nw-design-system'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { formatTenureSinceHireDate } from '@/business-apps/hr/core/utils/formatTenureSinceHireDate'
import { useManagerPlanningStore } from '../hooks/useManagerPlanningStore'
import translations from '../_i18n'
import { buildTeamCompensationMembersColumns, type TeamMemberTableRow } from './buildTeamCompensationMembersColumns'

const EMPTY_RANGE_INPUT_PLACEHOLDER = '\u200b'

const VISIBLE_COLUMN_IDS = [
  'displayName',
  'hireDate',
  'currentAnnualSalary',
  'compaRatio',
  'performance',
  'lastRaiseDate',
  'currentBonusTotal'
] as const

function applySalaryRangeFromFilters(
  amt: { min?: number | null; max?: number | null } | undefined,
  setRange: (min: number | null, max: number | null) => void
): void {
  if (!amt || (amt.min === undefined && amt.max === undefined)) {
    setRange(null, null)
    return
  }
  const min = amt.min !== undefined && amt.min !== null && !Number.isNaN(Number(amt.min)) ? Number(amt.min) : null
  const max = amt.max !== undefined && amt.max !== null && !Number.isNaN(Number(amt.max)) ? Number(amt.max) : null
  setRange(min, max)
}

function applyLastRaiseRangeFromFilters(
  value: [string | null, string | null] | null | undefined,
  setRange: (from: string | null, to: string | null) => void
): void {
  if (value == null) {
    setRange(null, null)
    return
  }
  const [from, to] = value
  const fromDay = from?.slice(0, 10) || null
  const toDay = to?.slice(0, 10) || null
  if (!fromDay && !toDay) {
    setRange(null, null)
  } else {
    setRange(fromDay, toDay)
  }
}

export interface TeamCompensationMembersTableProps {
  teamMembers: TeamMemberCompensationData[]
  filteredRows: TeamMemberCompensationData[]
  totalFiltered: number
  loading: boolean
  error: string | null
  companyToolbarEnd: React.ReactNode
}

export const TeamCompensationMembersTable: React.FC<TeamCompensationMembersTableProps> = ({
  teamMembers,
  filteredRows,
  totalFiltered,
  loading,
  error,
  companyToolbarEnd
}) => {
  const { t } = useTranslation(translations)
  const {
    searchQuery,
    setSearchQuery,
    sidebarFilterIds,
    setEmployeeSidebarFilters,
    filterSalaryMin,
    filterSalaryMax,
    filterLastRaiseFrom,
    filterLastRaiseTo,
    setSalaryFilterRange,
    setLastRaiseFilterRange,
    sortField,
    sortDirection,
    setSortFromTable,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  } = useManagerPlanningStore()

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...VISIBLE_COLUMN_IDS])

  const tenure = useCallback(
    (hireDate: string | null): string =>
      formatTenureSinceHireDate(hireDate, {
        year: t('profile-header-year'),
        years: t('profile-header-years'),
        month: t('profile-header-month'),
        months: t('profile-header-months')
      }) ?? '-',
    [t]
  )

  const selectedEmployeeIds = useMemo(
    () => sidebarFilterIds.filter(id => id.startsWith('employee:')).map(id => id.slice('employee:'.length)),
    [sidebarFilterIds]
  )

  const employeeOptions = useMemo(
    () =>
      [...teamMembers]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map(m => ({ id: m.employeeId, label: m.displayName })),
    [teamMembers]
  )

  const numberRangeConfig = useMemo(
    () => ({
      mode: 'range' as const,
      min: 0,
      max: 100_000_000,
      step: 1,
      placeholderMin: EMPTY_RANGE_INPUT_PLACEHOLDER,
      placeholderMax: EMPTY_RANGE_INPUT_PLACEHOLDER
    }),
    []
  )

  const filterConfiguration = useMemo((): FilterConfiguration => {
    return {
      id: 'manager-team-compensation-filters',
      name: t('filter-sheet-title'),
      groups: [
        {
          id: 'employee-filter-group',
          label: t('filter-employee-group'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'employeeIds',
              field: 'employeeIds',
              label: '',
              type: 'multi-select',
              config: { options: employeeOptions }
            }
          ]
        },
        {
          id: 'salary-filter-group',
          label: t('filter-salary-group'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'salaryRange',
              field: 'salaryRange',
              label: '',
              type: 'number',
              config: numberRangeConfig
            }
          ]
        },
        {
          id: 'last-raise-filter-group',
          label: t('filter-last-raise-group'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'lastRaiseDateRange',
              field: 'lastRaiseDateRange',
              label: '',
              type: 'date',
              config: {
                dateType: 'date',
                mode: 'range',
                showClearButton: true
              }
            }
          ]
        }
      ]
    }
  }, [t, employeeOptions, numberRangeConfig])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const emp = (filters.employeeIds as string[] | undefined) ?? []
      setEmployeeSidebarFilters(emp)
      applySalaryRangeFromFilters(
        filters.salaryRange as { min?: number | null; max?: number | null } | undefined,
        setSalaryFilterRange
      )
      applyLastRaiseRangeFromFilters(
        filters.lastRaiseDateRange as [string | null, string | null] | null | undefined,
        setLastRaiseFilterRange
      )
    },
    [setEmployeeSidebarFilters, setSalaryFilterRange, setLastRaiseFilterRange]
  )

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedEmployeeIds.length > 0) {
      obj.employeeIds = selectedEmployeeIds
    }
    if (filterSalaryMin != null || filterSalaryMax != null) {
      obj.salaryRange = { min: filterSalaryMin, max: filterSalaryMax }
    }
    if (filterLastRaiseFrom != null || filterLastRaiseTo != null) {
      obj.lastRaiseDateRange = [filterLastRaiseFrom, filterLastRaiseTo]
    }
    return obj
  }, [selectedEmployeeIds, filterSalaryMin, filterSalaryMax, filterLastRaiseFrom, filterLastRaiseTo])

  const emptyMessage = t('table-empty')

  const sorting = useMemo(
    (): SortingState => [{ id: sortField, desc: sortDirection === 'desc' }],
    [sortField, sortDirection]
  )

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0]
      if (!first) {
        setSortFromTable(sortField, '')
        return
      }
      setSortFromTable(first.id, first.desc ? 'DESC' : 'ASC')
    },
    [sortField, setSortFromTable]
  )

  const data = useMemo((): TeamMemberTableRow[] => filteredRows.map(m => ({ ...m, id: m.employeeId })), [filteredRows])

  const pageIndexZeroBased = Math.max(0, currentPage - 1)
  const pagedData = useMemo(() => {
    const start = pageIndexZeroBased * pageSize
    return data.slice(start, start + pageSize)
  }, [data, pageIndexZeroBased, pageSize])

  const columns = useMemo(() => buildTeamCompensationMembersColumns(t, tenure), [t, tenure])

  const visibleTableColumns = useMemo(
    () => columns.filter(col => visibleColumns.includes(String((col as { id?: string }).id ?? ''))),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'displayName', label: t('col-employee') },
      { id: 'hireDate', label: t('col-tenure') },
      { id: 'currentAnnualSalary', label: t('col-current-salary') },
      { id: 'compaRatio', label: t('col-band-position') },
      { id: 'lastRaiseDate', label: t('col-last-raise') },
      { id: 'currentBonusTotal', label: t('col-bonuses-ytd') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(
    () => [
      { id: 'displayName', label: t('col-employee') },
      { id: 'hireDate', label: t('col-tenure') },
      { id: 'currentAnnualSalary', label: t('col-current-salary') },
      { id: 'compaRatio', label: t('col-band-position') },
      { id: 'performance', label: t('col-performance') },
      { id: 'lastRaiseDate', label: t('col-last-raise') },
      { id: 'currentBonusTotal', label: t('col-bonuses-ytd') }
    ],
    [t]
  )

  const handlePaginationChange = useCallback(
    (next: { pageIndex: number; pageSize: number }) => {
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize)
      }
      setCurrentPage(next.pageIndex + 1)
    },
    [setCurrentPage, setPageSize, pageSize]
  )

  useEffect(() => {
    const safePageSize = Math.max(1, pageSize)
    const maxPage = Math.max(1, Math.ceil(totalFiltered / safePageSize))
    if (currentPage > maxPage) {
      setCurrentPage(1)
    }
  }, [totalFiltered, pageSize, currentPage, setCurrentPage])

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  return (
    <DataDisplay
      data-testid="manager-team-compensation-display"
      titleSections={[
        {
          id: 'team-members',
          label: t('table-section-title'),
          metadata: { count: totalFiltered, isLoading: loading }
        }
      ]}
      currentSection="team-members"
      toolbarDensity="default"
      searchValue={searchQuery}
      searchPlaceholder={t('search-placeholder')}
      onSearchChange={setSearchQuery}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('filter-sheet-title')}
      filterSheetDescription={t('filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={handleSortingChange}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      secondaryActions={companyToolbarEnd}
    >
      <TooltipProvider>
        <DataTable<TeamMemberTableRow>
          data={pagedData}
          columns={visibleTableColumns}
          loading={loading}
          error={error ?? undefined}
          totalCount={totalFiltered}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={emptyMessage}
          data-testid="manager-team-table"
        />
      </TooltipProvider>
    </DataDisplay>
  )
}
