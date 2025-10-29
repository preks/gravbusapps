import React, { useState, useCallback, useMemo } from 'react'
import { DataContainer } from '../../../../../../../../../components/layout/dataContainer'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale
} from '../../../../../../../../../common/utils/windowUtils'
import { getAllAbsenceStatusConfigs, AbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { DateRangeFilter } from './DateRangeFilter'
import { CreationDateFilter } from './CreationDateFilter'
import { AbsenceListTable } from './AbsenceListTable'
import { EnhancedAbsence, DataFilterGroup } from '../../../../types'
import { useAbsenceFilters, useAbsenceData } from '../../../../hooks'

interface StatusOption {
  id: string
  name: string
}

const ABSENCE_STATUSES: StatusOption[] = getAllAbsenceStatusConfigs().map((config: AbsenceStatusConfig) => ({
  id: config.status,
  name: config.label
}))

interface AbsenceListProps extends BusinessAppContextProps {
  initialFilters?: {
    startDate?: string
    endDate?: string
    status?: string
    department?: string
    departmentId?: string
  }
  preFilteredData?: EnhancedAbsence[]
  onDataChange?: (data: {
    absences: EnhancedAbsence[]
    total: number
    isFiltered: boolean
    appliedFilters: {
      search?: string
      selectedFilters: string[]
      dateRange?: { startDate?: string; endDate?: string }
      creationDateRange?: { startDate?: string; endDate?: string }
    }
  }) => void
}

export const AbsenceList: React.FC<AbsenceListProps> = props => {
  const { accessToken, initialFilters, onDataChange } = props

  const filters = useAbsenceFilters({ accessToken, initialFilters })
  const data = useAbsenceData({
    accessToken,
    filters,
    onDataChange
  })

  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null)

  const formatDateForDisplay = (dateString: string) => {
    const userLocale = getCurrentActiveUserLocale()
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(userLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const dynamicGroups = Object.entries(filters.absenceGroups)
    .filter(([id]) => {
      return id.startsWith('AbsenceGroup:v1:')
    })
    .map(([id, name]) => ({
      id,
      name
    }))

  const filterGroups: DataFilterGroup[] = [
    {
      id: 'absenceDateRange',
      title: `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date')}`,
      customComponent: React.createElement(DateRangeFilter, {
        key: `absenceDateRange-${filters.startDate}-${filters.endDate}`,
        initialStartDate: filters.startDate,
        initialEndDate: filters.endDate,
        onDateRangeChange: filters.handleDateRangeChange
      }),
      hideSearch: true
    },
    {
      id: 'creationDateRange',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_request_list.expense_table.creation_date',
        'Creation Date'
      ),
      customComponent: React.createElement(CreationDateFilter, {
        key: `creationDateRange-${filters.creationStartDate}-${filters.creationEndDate}`,
        initialStartDate: filters.creationStartDate,
        initialEndDate: filters.creationEndDate,
        onCreationDateRangeChange: filters.handleCreationDateRangeChange
      }),
      hideSearch: true
    },
    {
      id: 'employee',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee'),
      backendSearch: filters.getEmployeeFilters
    },
    {
      id: 'department',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_list.department',
        'Department'
      ),
      backendSearch: filters.getDepartmentFilters
    },
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      filters: ABSENCE_STATUSES.map((status: StatusOption) => ({
        id: `status-${status.id}`,
        label: status.name,
        selected: filters.selectedFilters.includes(`status-${status.id}`)
      }))
    },
    {
      id: 'group',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.group', 'Group'),
      filters: dynamicGroups.map(group => ({
        id: `group-${group.id}`,
        label: group.name,
        selected: filters.selectedFilters.includes(`group-${group.id}`)
      }))
    }
  ]

  const selectedEmployees = filters.teamEmployees.filter(e => filters.selectedFilters.includes(e.id))
  const selectedDepartments = filters.organizationalUnits.filter(d =>
    filters.selectedFilters.includes(`department-${d.id}`)
  )

  const selectedDepartmentsWithNoDepOption = [...selectedDepartments]
  if (filters.selectedFilters.includes('department-no-department')) {
    selectedDepartmentsWithNoDepOption.push({
      id: 'no-department',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_list.no_department',
        'No Department'
      )
    } as any)
  }

  const computedSelectedFilters = useMemo(() => {
    const allSelectedFilters = [...filters.selectedFilters]

    if (filters.startDate || filters.endDate) {
      if (!allSelectedFilters.includes('absenceDateRange')) {
        allSelectedFilters.push('absenceDateRange')
      }
    } else {
      const index = allSelectedFilters.indexOf('absenceDateRange')
      if (index > -1) {
        allSelectedFilters.splice(index, 1)
      }
    }

    if (filters.creationStartDate || filters.creationEndDate) {
      if (!allSelectedFilters.includes('creationDateRange')) {
        allSelectedFilters.push('creationDateRange')
      }
    } else {
      const index = allSelectedFilters.indexOf('creationDateRange')
      if (index > -1) {
        allSelectedFilters.splice(index, 1)
      }
    }

    return allSelectedFilters
  }, [filters.selectedFilters, filters.startDate, filters.endDate, filters.creationStartDate, filters.creationEndDate])

  const filterLabelMap = {
    ...Object.fromEntries(
      selectedEmployees.map(e => [
        e.id,
        `${e.firstName || ''} ${e.lastName || ''}`.trim() ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.absence_list.unknown_employee',
            'Unknown Employee'
          )
      ])
    ),
    ...Object.fromEntries(
      selectedDepartmentsWithNoDepOption.map(d => [`department-${d.id}`, d.name || 'Unknown Department'])
    ),
    ...Object.fromEntries(
      ABSENCE_STATUSES.map(s => [
        `status-${s.id}`,
        getTranslationFromI18nKeyAndLabel(`lowcoder:expense_statuses.${s.name.toLowerCase()}`, s.name)
      ])
    ),
    ...Object.fromEntries(dynamicGroups.map(g => [`group-${g.id}`, g.name])),

    absenceDateRange:
      filters.startDate && filters.endDate
        ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}: ${formatDateForDisplay(filters.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to')} ${formatDateForDisplay(filters.endDate)}`
        : filters.startDate
          ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}: ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.from', 'from')} ${formatDateForDisplay(filters.startDate)}`
          : filters.endDate
            ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')} - ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}: Until ${formatDateForDisplay(filters.endDate)}`
            : 'Date Range',
    creationDateRange:
      filters.creationStartDate && filters.creationEndDate
        ? `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')}: ${formatDateForDisplay(filters.creationStartDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to')} ${formatDateForDisplay(filters.creationEndDate)}`
        : filters.creationStartDate
          ? `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')}: ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.from', 'from')} ${formatDateForDisplay(filters.creationStartDate)}`
          : filters.creationEndDate
            ? `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')}: Until ${formatDateForDisplay(filters.creationEndDate)}`
            : 'Creation Date'
  }

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId === 'absenceDateRange') {
        if (!selected) {
          filters.setStartDate(undefined)
          filters.setEndDate(undefined)
        }
      }

      if (filterId === 'creationDateRange') {
        if (!selected) {
          filters.setCreationStartDate(undefined)
          filters.setCreationEndDate(undefined)
        }
      }

      const currentFilters = filters.selectedFilters
      const next = selected
        ? Array.from(new Set([...currentFilters, filterId]))
        : currentFilters.filter((f: string) => f !== filterId)
      filters.setSelectedFilters(next)
    },
    [filters]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      filters.setSearch(value)
    },
    [filters]
  )

  const handleSetFilter = useCallback(
    (newFilters: string[]) => {
      if (!newFilters.includes('absenceDateRange') && (filters.startDate || filters.endDate)) {
        filters.setStartDate(undefined)
        filters.setEndDate(undefined)
      }

      if (!newFilters.includes('creationDateRange') && (filters.creationStartDate || filters.creationEndDate)) {
        filters.setCreationStartDate(undefined)
        filters.setCreationEndDate(undefined)
      }

      const regularFilters = newFilters.filter(f => f !== 'absenceDateRange' && f !== 'creationDateRange')
      filters.setSelectedFilters(regularFilters)
    },
    [filters]
  )

  const handleRowClick = useCallback((record: EnhancedAbsence) => {
    setSelectedAbsence(record)
  }, [])

  const absencesWithUpdatedGroups = useMemo(() => {
    return data.absences.map(absence => ({
      ...absence,
      groupName:
        (absence.type?.parentEntryId && filters.absenceGroups[absence.type.parentEntryId]) ||
        absence.type?.value ||
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_list.unknown_group',
          'Unknown Group'
        )
    }))
  }, [data.absences, filters.absenceGroups])

  return (
    <div data-testid="backoffice-absence-list-modern-content">
      <DataContainer
        dataControllerProps={{
          search: filters.search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: computedSelectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'Absences')}</span>
                <span className="gba:text-muted-foreground">({data.total})</span>
              </div>
            </div>
          )
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <AbsenceListTable
            absences={absencesWithUpdatedGroups}
            loading={data.loading}
            error={data.error}
            total={data.total}
            currentPage={data.currentPage}
            pageSize={data.pageSize}
            sortField={data.sortField}
            sortOrder={data.sortOrder}
            selectedAbsence={selectedAbsence}
            onRowClick={handleRowClick}
            onSort={data.handleSort}
            onPaginationChange={data.handlePaginationChange}
          />
        }
      />
    </div>
  )
}
