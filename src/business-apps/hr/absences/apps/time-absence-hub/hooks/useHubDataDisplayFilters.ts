import { useCallback, useMemo } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TIME_SCOPES, type TimeScope } from '../constants/routes'
import type { HubFilterOptionsState } from './useHubFilterOptions'
import type { HubGlobalFilters } from './useHubGlobalFilters'

interface UseHubDataDisplayFiltersProps {
  filters: HubGlobalFilters
  options: Pick<HubFilterOptionsState, 'departments' | 'locations' | 'legalEntities' | 'absenceTypes' | 'managers'>
  onFiltersChange: (filters: HubGlobalFilters) => void
}

interface UseHubDataDisplayFiltersReturn {
  filterConfiguration: FilterConfiguration
  filterSheetTitle: string
  filterSheetDescription: string
  filtersObject: Record<string, unknown>
  searchValue: string
  onSearchChange: (value: string) => void
  onFilterChange: (filters: Record<string, unknown>) => void
}

const I18N_PREFIX = 'lowcoder:time_absence_hub'

const tt = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(`${I18N_PREFIX}.${key}`, fallback)

const buildTimeScopeLabel = (scope: TimeScope): string => {
  switch (scope) {
    case 'current-year':
      return tt('filters.time_scope.current_year', 'Current year')
    case 'quarter':
      return tt('filters.time_scope.quarter', 'This quarter')
    case 'month':
      return tt('filters.time_scope.month', 'This month')
    case 'everything':
      return tt('filters.time_scope.everything', 'Everything')
    case 'custom':
      return tt('filters.time_scope.custom', 'Custom range')
    default:
      return scope
  }
}

const toMultiSelectOptions = (items: Array<{ id: string; name?: string }>) =>
  items.map(item => ({
    id: item.id,
    label: item.name ?? item.id
  }))

const toManagerOptions = (items: HubFilterOptionsState['managers']) =>
  items.map(item => ({
    id: item.id,
    label: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.id
  }))

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

const toTimeScope = (value: unknown, fallback: TimeScope): TimeScope => {
  const values = toStringArray(value)
  const lastValue = values.length > 0 ? values[values.length - 1] : undefined

  if (
    lastValue === 'current-year' ||
    lastValue === 'quarter' ||
    lastValue === 'month' ||
    lastValue === 'everything' ||
    lastValue === 'custom'
  ) {
    return lastValue
  }

  return fallback
}

const toDateRange = (value: unknown): [string | undefined, string | undefined] => {
  if (!Array.isArray(value)) {
    return [undefined, undefined]
  }

  const [dateFrom, dateTo] = value

  return [
    typeof dateFrom === 'string' && dateFrom.length > 0 ? dateFrom : undefined,
    typeof dateTo === 'string' && dateTo.length > 0 ? dateTo : undefined
  ]
}

export const useHubDataDisplayFilters = ({
  filters,
  options,
  onFiltersChange
}: UseHubDataDisplayFiltersProps): UseHubDataDisplayFiltersReturn => {
  const filterConfiguration = useMemo<FilterConfiguration>(() => {
    const groups: FilterConfiguration['groups'] = [
      {
        id: 'time-scope-group',
        label: tt('filters.time_label', 'Time'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'timeScope',
            field: 'timeScope',
            label: tt('filters.time_label', 'Time'),
            type: 'multi-select',
            config: {
              options: TIME_SCOPES.map(scope => ({ id: scope, label: buildTimeScopeLabel(scope) })),
              showSearch: false,
              showSelectAll: false
            }
          }
        ]
      },
      {
        id: 'department-group',
        label: tt('filters.department_label', 'Department'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'departmentIds',
            field: 'departmentIds',
            label: tt('filters.department_label', 'Department'),
            type: 'multi-select',
            config: {
              options: toMultiSelectOptions(options.departments),
              showSearch: true,
              showSelectAll: false
            }
          }
        ]
      },
      {
        id: 'location-group',
        label: tt('filters.location_label', 'Location'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'locationIds',
            field: 'locationIds',
            label: tt('filters.location_label', 'Location'),
            type: 'multi-select',
            config: {
              options: toMultiSelectOptions(options.locations),
              showSearch: true,
              showSelectAll: false
            }
          }
        ]
      },
      {
        id: 'legal-entity-group',
        label: tt('filters.legal_entity_label', 'Legal entity'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'legalEntityIds',
            field: 'legalEntityIds',
            label: tt('filters.legal_entity_label', 'Legal entity'),
            type: 'multi-select',
            config: {
              options: toMultiSelectOptions(options.legalEntities),
              showSearch: true,
              showSelectAll: false
            }
          }
        ]
      },
      {
        id: 'absence-type-group',
        label: tt('filters.absence_type_label', 'Absence type'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'absenceTypeIds',
            field: 'absenceTypeIds',
            label: tt('filters.absence_type_label', 'Absence type'),
            type: 'multi-select',
            config: {
              options: toMultiSelectOptions(options.absenceTypes),
              showSearch: true,
              showSelectAll: false
            }
          }
        ]
      },
      {
        id: 'manager-group',
        label: tt('filters.manager_label', 'Manager'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'managerIds',
            field: 'managerIds',
            label: tt('filters.manager_label', 'Manager'),
            type: 'multi-select',
            config: {
              options: toManagerOptions(options.managers),
              showSearch: true,
              showSelectAll: false
            }
          }
        ]
      }
    ]

    if (filters.timeScope === 'custom') {
      groups.splice(1, 0, {
        id: 'custom-date-range-group',
        label: tt('filters.custom_date_range_label', 'Custom date range'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'customDateRange',
            field: 'customDateRange',
            label: tt('filters.custom_date_range_label', 'Custom date range'),
            type: 'date',
            config: {
              mode: 'range',
              dateType: 'date',
              placeholder: tt('filters.custom_date_from_placeholder', 'From'),
              placeholderEnd: tt('filters.custom_date_to_placeholder', 'To'),
              showClearButton: true
            }
          }
        ]
      })
    }

    return {
      id: 'time-absence-hub-filters',
      name: tt('filters.drawer_title', 'Filter Time & Absence Hub'),
      groups
    }
  }, [
    filters.timeScope,
    options.absenceTypes,
    options.departments,
    options.legalEntities,
    options.locations,
    options.managers
  ])

  const filtersObject = useMemo<Record<string, unknown>>(
    () => ({
      timeScope: [filters.timeScope],
      customDateRange: filters.timeScope === 'custom' ? [filters.dateFrom ?? null, filters.dateTo ?? null] : undefined,
      departmentIds: filters.departmentIds,
      locationIds: filters.locationIds,
      legalEntityIds: filters.legalEntityIds,
      absenceTypeIds: filters.absenceTypeIds,
      managerIds: filters.managerIds
    }),
    [filters]
  )

  const onSearchChange = useCallback(
    (employeeQuery: string) => {
      onFiltersChange({
        ...filters,
        employeeQuery
      })
    },
    [filters, onFiltersChange]
  )

  const onFilterChange = useCallback(
    (nextFilters: Record<string, unknown>) => {
      const nextTimeScope = toTimeScope(nextFilters.timeScope, filters.timeScope)
      const [dateFrom, dateTo] =
        nextTimeScope === 'custom' ? toDateRange(nextFilters.customDateRange) : [undefined, undefined]

      onFiltersChange({
        ...filters,
        timeScope: nextTimeScope,
        dateFrom,
        dateTo,
        departmentIds: toStringArray(nextFilters.departmentIds),
        locationIds: toStringArray(nextFilters.locationIds),
        legalEntityIds: toStringArray(nextFilters.legalEntityIds),
        absenceTypeIds: toStringArray(nextFilters.absenceTypeIds),
        managerIds: toStringArray(nextFilters.managerIds)
      })
    },
    [filters, onFiltersChange]
  )

  return {
    filterConfiguration,
    filterSheetTitle: tt('filters.drawer_title', 'Filter Time & Absence Hub'),
    filterSheetDescription: tt(
      'filters.drawer_description',
      'Narrow hub data by time, organization, absence type, manager, and employee.'
    ),
    filtersObject,
    searchValue: filters.employeeQuery,
    onSearchChange,
    onFilterChange
  }
}
