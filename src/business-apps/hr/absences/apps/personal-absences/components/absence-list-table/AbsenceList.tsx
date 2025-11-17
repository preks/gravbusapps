import React, { useState, useCallback, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { getAllAbsenceStatusConfigs, AbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { DateRangeFilter } from './DateRangeFilter'
import { CreationDateFilter } from './CreationDateFilter'
import { AbsenceListTable } from './AbsenceListTable'
import { EnhancedAbsence } from '../../types/enhancedAbsence'
import { useAbsenceFilters, useAbsenceData } from '../../hooks'

interface StatusOption {
  id: string
  name: string
}

const ABSENCE_STATUSES: StatusOption[] = getAllAbsenceStatusConfigs().map((config: AbsenceStatusConfig) => ({
  id: config.status,
  name: config.label
}))

interface AbsenceListProps extends BusinessAppContextProps {
  employeeId: string
}

export const AbsenceList: React.FC<AbsenceListProps> = props => {
  const { accessToken, employeeId } = props

  const filters = useAbsenceFilters({ accessToken, employeeId })
  const data = useAbsenceData({
    accessToken,
    employeeId,
    filters
  })

  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null)

  const formatDateForDisplay = (dateString: string) => {
    return formatDate(dateString, 'date.short')
  }

  const filterGroups = useMemo(
    () => [
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
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        filters: ABSENCE_STATUSES.map((status: StatusOption) => ({
          id: `status-${status.id}`,
          label: status.name,
          selected: filters.selectedFilters.includes(`status-${status.id}`)
        }))
      },
      {
        id: 'type',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_overview_screen.absence_overview_table.absence_type',
          'Type'
        ),
        filters: filters.absenceTypes.map(type => ({
          id: `type-${type.id}`,
          label: type.translatedName,
          selected: filters.selectedFilters.includes(`type-${type.id}`)
        }))
      }
    ],
    [
      filters.absenceTypes,
      filters.selectedFilters,
      filters.startDate,
      filters.endDate,
      filters.creationStartDate,
      filters.creationEndDate
    ]
  )

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

  const filterLabelMap = useMemo(
    () => ({
      ...Object.fromEntries(
        ABSENCE_STATUSES.map(s => [
          `status-${s.id}`,
          getTranslationFromI18nKeyAndLabel(`lowcoder:expense_statuses.${s.name.toLowerCase()}`, s.name)
        ])
      ),
      ...Object.fromEntries(filters.absenceTypes.map(t => [`type-${t.id}`, t.translatedName])),
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
    }),
    [filters.absenceTypes, filters.startDate, filters.endDate, filters.creationStartDate, filters.creationEndDate]
  )

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

  return (
    <div data-testid="personal-absence-list-modern-content">
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
            absences={data.absences}
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
