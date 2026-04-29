import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Combobox,
  ComboboxOption,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TimeScope, TIME_SCOPES } from '../constants/routes'
import { HubGlobalFilters as HubGlobalFiltersState } from '../hooks/useHubGlobalFilters'
import { HubEmployeeOption, HubFilterOption, HubManagerOption } from '../queries/HubFilterQueries'

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
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: HubGlobalFiltersState
  options: {
    departments: HubFilterOption[]
    locations: HubFilterOption[]
    legalEntities: HubFilterOption[]
    managers: HubManagerOption[]
    employees: HubEmployeeOption[]
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
  open,
  onOpenChange,
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
  const [draftFilters, setDraftFilters] = useState(filters)

  useEffect(() => {
    if (open) {
      setDraftFilters(filters)
    }
  }, [filters, open])

  const isCustom = draftFilters.timeScope === 'custom'

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
  const employeeOptions = useMemo<ComboboxOption[]>(
    () =>
      options.employees.map(employee => {
        const label =
          employee.displayName || `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.id
        return { value: label, label }
      }),
    [options.employees]
  )
  const filteredEmployeeOptions = useMemo<ComboboxOption[]>(() => {
    const query = draftFilters.employeeQuery.trim().toLowerCase()
    if (!query) {
      return employeeOptions
    }

    return employeeOptions.filter(option => String(option.label).toLowerCase().includes(query))
  }, [draftFilters.employeeQuery, employeeOptions])

  const updateDraft = (next: Partial<HubGlobalFiltersState>) => {
    setDraftFilters(prev => ({ ...prev, ...next }))
  }

  const applyFilters = () => {
    onEmployeeQueryChange(draftFilters.employeeQuery)
    onTimeScopeChange(draftFilters.timeScope)
    if (draftFilters.timeScope === 'custom') {
      onDateRangeChange(draftFilters.dateFrom, draftFilters.dateTo)
    }
    onDepartmentsChange(draftFilters.departmentIds)
    onLocationsChange(draftFilters.locationIds)
    onLegalEntitiesChange(draftFilters.legalEntityIds)
    onManagersChange(draftFilters.managerIds)
    onOpenChange(false)
  }

  const clearFilters = () => {
    onReset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gba:flex gba:w-full gba:flex-col gba:gap-0 gba:overflow-hidden gba:p-0 sm:gba:max-w-md"
        data-testid="time-absence-hub-filter-drawer"
      >
        <SheetHeader className="gba:border-b gba:p-4">
          <SheetTitle>{tt('filters.drawer_title', 'Filter Time & Absence Hub')}</SheetTitle>
          <SheetDescription>
            {tt('filters.drawer_description', 'Narrow hub data by time, organization, manager, and employee.')}
          </SheetDescription>
        </SheetHeader>

        <div className="gba:flex-1 gba:space-y-5 gba:overflow-y-auto gba:p-4">
          <DrawerField label={tt('filters.search_employee_label', 'Employee')}>
            <Combobox
              options={filteredEmployeeOptions}
              value={draftFilters.employeeQuery}
              onValueChange={employeeQuery => updateDraft({ employeeQuery })}
              onSearch={employeeQuery => updateDraft({ employeeQuery })}
              searchDebounce={300}
              placeholder={tt('filters.search_employee_placeholder', 'Search employee...')}
              searchPlaceholder={tt('filters.search_employee_placeholder', 'Search employee...')}
              emptyText={tt('filters.no_employees', 'No employees found')}
              loading={options.isLoading}
              data-testid="time-absence-hub-employee-search"
            />
          </DrawerField>

          <DrawerField label={tt('filters.time_label', 'Time')}>
            <Select
              value={draftFilters.timeScope}
              onValueChange={value => updateDraft({ timeScope: value as TimeScope })}
            >
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
          </DrawerField>

          {isCustom && (
            <CustomDateRangePicker
              dateFrom={draftFilters.dateFrom}
              dateTo={draftFilters.dateTo}
              onDateRangeChange={(from, to) => updateDraft({ dateFrom: from, dateTo: to })}
            />
          )}

          <DrawerField label={tt('filters.department_label', 'Department')}>
            <Combobox
              mode="multiple"
              options={departmentOptions}
              value={draftFilters.departmentIds}
              onValueChange={departmentIds => updateDraft({ departmentIds })}
              placeholder={tt('filters.department_placeholder', 'All departments')}
              searchPlaceholder={tt('filters.department_search', 'Search departments...')}
              emptyText={tt('filters.no_options', 'No options')}
              disabled={options.isLoading || departmentOptions.length === 0}
              data-testid="time-absence-hub-department-select"
            />
          </DrawerField>

          <DrawerField label={tt('filters.location_label', 'Location')}>
            <Combobox
              mode="multiple"
              options={locationOptions}
              value={draftFilters.locationIds}
              onValueChange={locationIds => updateDraft({ locationIds })}
              placeholder={tt('filters.location_placeholder', 'All locations')}
              searchPlaceholder={tt('filters.location_search', 'Search locations...')}
              emptyText={tt('filters.no_options', 'No options')}
              disabled={options.isLoading || locationOptions.length === 0}
              data-testid="time-absence-hub-location-select"
            />
          </DrawerField>

          <DrawerField label={tt('filters.legal_entity_label', 'Legal entity')}>
            <Combobox
              mode="multiple"
              options={legalEntityOptions}
              value={draftFilters.legalEntityIds}
              onValueChange={legalEntityIds => updateDraft({ legalEntityIds })}
              placeholder={tt('filters.legal_entity_placeholder', 'All entities')}
              searchPlaceholder={tt('filters.legal_entity_search', 'Search entities...')}
              emptyText={tt('filters.no_options', 'No options')}
              disabled={options.isLoading || legalEntityOptions.length === 0}
              data-testid="time-absence-hub-legal-entity-select"
            />
          </DrawerField>

          <DrawerField label={tt('filters.manager_label', 'Manager')}>
            <Combobox
              mode="multiple"
              options={managerOptions}
              value={draftFilters.managerIds}
              onValueChange={managerIds => updateDraft({ managerIds })}
              placeholder={tt('filters.manager_placeholder', 'All managers')}
              searchPlaceholder={tt('filters.manager_search', 'Search managers...')}
              emptyText={tt('filters.no_options', 'No options')}
              disabled={options.isLoading || managerOptions.length === 0}
              data-testid="time-absence-hub-manager-select"
            />
          </DrawerField>

          {options.error && (
            <span className="gba:text-xs gba:text-destructive" role="alert">
              {tt('filters.options_error', 'Filter options failed to load')}
            </span>
          )}
        </div>

        <SheetFooter className="gba:border-t gba:p-4">
          <div className="gba:flex gba:w-full gba:items-center gba:justify-between">
            <Button variant="ghost" onClick={clearFilters} data-testid="time-absence-hub-reset-filters">
              {tt('filters.clear_all', 'Clear all')}
            </Button>
            <div className="gba:flex gba:items-center gba:gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tt('filters.cancel', 'Cancel')}
              </Button>
              <Button onClick={applyFilters} data-testid="time-absence-hub-apply-filters">
                {tt('filters.apply', 'Apply filters')}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface DrawerFieldProps {
  label: string
  children: React.ReactNode
}

const DrawerField: React.FC<DrawerFieldProps> = ({ label, children }) => (
  <div className="gba:flex gba:flex-col gba:gap-2">
    <span className="gba:text-sm gba:font-medium gba:text-foreground">{label}</span>
    {children}
  </div>
)

interface CustomDateRangePickerProps {
  dateFrom?: string
  dateTo?: string
  onDateRangeChange: (from?: string, to?: string) => void
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ dateFrom, dateTo, onDateRangeChange }) => (
  <DrawerField label={tt('filters.custom_date_range_label', 'Custom date range')}>
    <div className="gba:grid gba:grid-cols-2 gba:gap-2">
      <input
        type="date"
        value={dateFrom ?? ''}
        onChange={event => onDateRangeChange(event.target.value || undefined, dateTo)}
        className="gba:rounded gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-sm"
        data-testid="time-absence-hub-date-from"
      />
      <input
        type="date"
        value={dateTo ?? ''}
        onChange={event => onDateRangeChange(dateFrom, event.target.value || undefined)}
        className="gba:rounded gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-sm"
        data-testid="time-absence-hub-date-to"
      />
    </div>
  </DrawerField>
)

export default HubGlobalFilters
