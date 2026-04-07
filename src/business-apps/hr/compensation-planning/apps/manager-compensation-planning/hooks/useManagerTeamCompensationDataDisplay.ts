import { useCallback, useMemo } from 'react'
import type { SortingState } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'

import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'

import { useManagerPlanningStore } from './useManagerPlanningStore'
import translations from '../_i18n'

const EMPTY_RANGE_INPUT_PLACEHOLDER = '\u200b'

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

export function useManagerTeamCompensationDataDisplay(teamMembers: TeamMemberCompensationData[]) {
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
    setSortFromTable
  } = useManagerPlanningStore()

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

  return {
    t,
    searchQuery,
    setSearchQuery,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    sorting,
    handleSortingChange,
    sortableColumns
  }
}
