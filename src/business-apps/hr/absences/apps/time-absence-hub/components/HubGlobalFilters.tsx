import React, { useMemo } from 'react'
import {
  Button,
  Combobox,
  ComboboxOption,
  DebouncedInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { FunnelIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TimeScope, TIME_SCOPES } from '../constants/routes'
import { HubGlobalFilters as HubGlobalFiltersState } from '../hooks/useHubGlobalFilters'
import { HubFilterOption, HubManagerOption } from '../queries/HubFilterQueries'

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

interface HubGlobalFiltersProps {
  filters: HubGlobalFiltersState
  options: {
    departments: HubFilterOption[]
    locations: HubFilterOption[]
    legalEntities: HubFilterOption[]
    managers: HubManagerOption[]
    isLoading: boolean
    error: string | null
  }
  onTimeScopeChange: (scope: TimeScope) => void
  onDateRangeChange: (from?: string, to?: string) => void
  onDepartmentsChange: (ids: string[]) => void
  onLocationsChange: (ids: string[]) => void
  onLegalEntitiesChange: (ids: string[]) => void
  onManagersChange: (ids: string[]) => void
  onEmployeeQueryChange: (query: string) => void
  onReset: () => void
}

export const HubGlobalFilters: React.FC<HubGlobalFiltersProps> = ({
  filters,
  options,
  onTimeScopeChange,
  onDateRangeChange,
  onDepartmentsChange,
  onLocationsChange,
  onLegalEntitiesChange,
  onManagersChange,
  onEmployeeQueryChange,
  onReset
}) => {
  const isCustom = filters.timeScope === 'custom'

  const departmentOptions = useMemo<ComboboxOption[]>(
    () => options.departments.map(item => ({ value: item.id, label: item.name })),
    [options.departments]
  )
  const locationOptions = useMemo<ComboboxOption[]>(
    () => options.locations.map(item => ({ value: item.id, label: item.name })),
    [options.locations]
  )
  const legalEntityOptions = useMemo<ComboboxOption[]>(
    () => options.legalEntities.map(item => ({ value: item.id, label: item.name })),
    [options.legalEntities]
  )
  const managerOptions = useMemo<ComboboxOption[]>(
    () =>
      options.managers.map(manager => ({
        value: manager.id,
        label: `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() || manager.id
      })),
    [options.managers]
  )

  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-3"
      data-testid="time-absence-hub-global-filters"
    >
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-muted-foreground">
        <FunnelIcon size={16} />
        <span className="gba:text-sm gba:font-medium">{tt('filters.label', 'Filters')}</span>
      </div>

      <div className="gba:relative gba:min-w-[220px]">
        <MagnifyingGlassIcon
          size={16}
          className="gba:pointer-events-none gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
        />
        <DebouncedInput
          value={filters.employeeQuery}
          onChange={(val: string | number) => onEmployeeQueryChange(String(val))}
          placeholder={tt('filters.search_employee_placeholder', 'Search employee...')}
          className="gba:!pl-10"
          data-testid="time-absence-hub-employee-search"
        />
      </div>

      <FilterFieldGroup label={tt('filters.time_label', 'Time')}>
        <div className="gba:min-w-[160px]">
          <Select value={filters.timeScope} onValueChange={value => onTimeScopeChange(value as TimeScope)}>
            <SelectTrigger data-testid="time-absence-hub-timescope-select">
              <SelectValue placeholder={tt('filters.time_label', 'Time')} />
            </SelectTrigger>
            <SelectContent>
              {TIME_SCOPES.map(scope => (
                <SelectItem key={scope} value={scope}>
                  {buildTimeScopeLabel(scope)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterFieldGroup>

      {isCustom && (
        <CustomDateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateRangeChange={onDateRangeChange}
        />
      )}

      <FilterFieldGroup label={tt('filters.department_label', 'Department')}>
        <div className="gba:min-w-[200px]">
          <Combobox
            mode="multiple"
            options={departmentOptions}
            value={filters.departmentIds}
            onValueChange={onDepartmentsChange}
            placeholder={tt('filters.department_placeholder', 'All departments')}
            searchPlaceholder={tt('filters.department_search', 'Search departments...')}
            emptyText={tt('filters.no_options', 'No options')}
            disabled={options.isLoading || departmentOptions.length === 0}
            data-testid="time-absence-hub-department-select"
          />
        </div>
      </FilterFieldGroup>

      <FilterFieldGroup label={tt('filters.location_label', 'Location')}>
        <div className="gba:min-w-[200px]">
          <Combobox
            mode="multiple"
            options={locationOptions}
            value={filters.locationIds}
            onValueChange={onLocationsChange}
            placeholder={tt('filters.location_placeholder', 'All locations')}
            searchPlaceholder={tt('filters.location_search', 'Search locations...')}
            emptyText={tt('filters.no_options', 'No options')}
            disabled={options.isLoading || locationOptions.length === 0}
            data-testid="time-absence-hub-location-select"
          />
        </div>
      </FilterFieldGroup>

      <FilterFieldGroup label={tt('filters.legal_entity_label', 'Legal entity')}>
        <div className="gba:min-w-[200px]">
          <Combobox
            mode="multiple"
            options={legalEntityOptions}
            value={filters.legalEntityIds}
            onValueChange={onLegalEntitiesChange}
            placeholder={tt('filters.legal_entity_placeholder', 'All entities')}
            searchPlaceholder={tt('filters.legal_entity_search', 'Search entities...')}
            emptyText={tt('filters.no_options', 'No options')}
            disabled={options.isLoading || legalEntityOptions.length === 0}
            data-testid="time-absence-hub-legal-entity-select"
          />
        </div>
      </FilterFieldGroup>

      <FilterFieldGroup label={tt('filters.manager_label', 'Manager')}>
        <div className="gba:min-w-[200px]">
          <Combobox
            mode="multiple"
            options={managerOptions}
            value={filters.managerIds}
            onValueChange={onManagersChange}
            placeholder={tt('filters.manager_placeholder', 'All managers')}
            searchPlaceholder={tt('filters.manager_search', 'Search managers...')}
            emptyText={tt('filters.no_options', 'No options')}
            disabled={options.isLoading || managerOptions.length === 0}
            data-testid="time-absence-hub-manager-select"
          />
        </div>
      </FilterFieldGroup>

      <Button variant="outline" size="sm" onClick={onReset} data-testid="time-absence-hub-reset-filters">
        <XIcon size={14} />
        {tt('filters.reset', 'Reset')}
      </Button>

      {options.error && (
        <span className="gba:text-xs gba:text-destructive" role="alert">
          {tt('filters.options_error', 'Filter options failed to load')}
        </span>
      )}
    </div>
  )
}

interface FilterFieldGroupProps {
  label: string
  children: React.ReactNode
}

const FilterFieldGroup: React.FC<FilterFieldGroupProps> = ({ label, children }) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">{label}</span>
    {children}
  </div>
)

interface CustomDateRangePickerProps {
  dateFrom?: string
  dateTo?: string
  onDateRangeChange: (from?: string, to?: string) => void
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ dateFrom, dateTo, onDateRangeChange }) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <input
      type="date"
      value={dateFrom ?? ''}
      onChange={event => onDateRangeChange(event.target.value || undefined, dateTo)}
      className="gba:rounded gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-sm"
      data-testid="time-absence-hub-date-from"
    />
    <span className="gba:text-sm gba:text-muted-foreground">{tt('filters.date_range_to', 'to')}</span>
    <input
      type="date"
      value={dateTo ?? ''}
      onChange={event => onDateRangeChange(dateFrom, event.target.value || undefined)}
      className="gba:rounded gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-sm"
      data-testid="time-absence-hub-date-to"
    />
  </div>
)

export default HubGlobalFilters
