import React, { useMemo, useState } from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFilterData, type OrganizationalUnit, type Currency } from '../../hooks/useFilterData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getActiveStructureDepartmentOptions } from '../../utils/departmentOptions'
import { filterOptionsByName } from '../../hooks/queryFilterUtils'

export interface FilterOptions {
  department?: string
  currency?: string
  period?: 'monthly' | 'quarterly' | 'yearly'
  additionalFilters?: Record<string, any>
}

interface FilterData {
  organizationalUnits: OrganizationalUnit[]
  currencies: Currency[]
  mostUsedCurrency: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface ExpenseFilterBarProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  onFiltersChange: (filters: FilterOptions) => void
  currentFilters?: FilterOptions // Add controlled filters prop
  filterData?: FilterData // ⚡ PERFORMANCE: Accept shared filter data from parent
  'data-testid'?: string
}

const ExpenseFilterBar: React.FC<ExpenseFilterBarProps> = ({
  accessToken,
  onFiltersChange,
  currentFilters,
  filterData: propsFilterData,
  'data-testid': dataTestId = 'expense-filter-bar'
}) => {
  // ⚡ PERFORMANCE: Use filter data from parent if provided, otherwise fetch locally
  // Parent (Dashboard) now ensures this component only renders with valid accessToken
  const localFilterData = useFilterData({ accessToken: propsFilterData ? null : accessToken })
  const filterData = propsFilterData || localFilterData
  const { organizationalUnits, currencies, loading: filterDataLoading } = filterData

  // Use controlled filters from parent, or fallback to internal state
  const [internalFilters, setInternalFilters] = useState<FilterOptions>({
    department: 'all',
    currency: '', // Will be set by user selection only
    period: 'monthly' as const, // Default to monthly
    additionalFilters: {}
  })

  // Use parent's filters if provided, otherwise use internal state
  const filters = currentFilters || internalFilters
  const [departmentSearch, setDepartmentSearch] = useState('')
  const departmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits),
    [organizationalUnits]
  )
  const filteredOrganizationalUnits = useMemo(
    () => filterOptionsByName(departmentOptions, departmentSearch),
    [departmentOptions, departmentSearch]
  )

  // ⚡ REMOVED: Automatic currency setting to prevent override of user selections
  // The dashboard will handle all currency initialization

  const toParentFilters = (value: FilterOptions): FilterOptions => ({
    ...value,
    department: value.department === 'all' ? '' : value.department,
    currency: value.currency === 'all' ? '' : value.currency
  })

  const applyFilters = (nextFilters: FilterOptions) => {
    if (!currentFilters) {
      setInternalFilters(nextFilters)
    }
    onFiltersChange(toParentFilters(nextFilters))
  }

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value } as FilterOptions
    applyFilters(newFilters)
  }

  const clearFilter = (filterKey: keyof FilterOptions) => {
    const newFilters = { ...filters }

    // Set appropriate default values for each filter type
    switch (filterKey) {
      case 'department':
        newFilters.department = 'all'
        break
      case 'currency':
        newFilters.currency = '' // Let dashboard handle default
        break
      case 'period':
        newFilters.period = 'monthly'
        break
      default:
        delete newFilters[filterKey]
    }

    applyFilters(newFilters)
  }
  const renderClearFilterButton = (config: { shouldShow: boolean; onClick: () => void; testId: string }) => {
    if (!config.shouldShow) return null
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={config.onClick}
        className="gba:ml-1 gba:p-1 gba:h-6 gba:w-6 gba:min-w-0"
        data-testid={config.testId}
      >
        <X className="gba:h-3 gba:w-3" />
      </Button>
    )
  }
  const getSelectPlaceholder = (translationKey: string, fallbackLabel: string) => {
    if (filterDataLoading) {
      return 'Loading...'
    }
    return getTranslationFromI18nKeyAndLabel(translationKey, fallbackLabel)
  }
  const renderSelectFilter = (config: {
    wrapperTestId: string
    value: string
    onValueChange: (value: string) => void
    triggerClassName: string
    selectPlaceholder: string
    content: React.ReactNode
    clearButton: {
      shouldShow: boolean
      onClick: () => void
      testId: string
    }
  }) => (
    <div className="gba:relative gba:flex gba:items-center" data-testid={config.wrapperTestId}>
      <Select
        value={config.value}
        onValueChange={config.onValueChange}
        disabled={filterDataLoading}
        data-testid={config.wrapperTestId.replace('-wrapper', '-select')}
      >
        <SelectTrigger className={config.triggerClassName}>
          <SelectValue placeholder={config.selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>{config.content}</SelectContent>
      </Select>
      {renderClearFilterButton(config.clearButton)}
    </div>
  )
  const createClearButtonConfig = (filterKey: keyof FilterOptions, shouldShow: boolean, testId: string) => ({
    shouldShow,
    onClick: () => clearFilter(filterKey),
    testId
  })

  return (
    <div className="gba:flex gba:items-center gba:gap-4 gba:py-2" data-testid={dataTestId}>
      {/* Filters - Horizontal Layout */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
        {renderSelectFilter({
          wrapperTestId: 'department-filter-wrapper',
          value: filters.department || 'all',
          onValueChange: value => {
            handleFilterChange('department', value)
            setDepartmentSearch('')
          },
          triggerClassName: 'gba:w-[220px] gba:border-border',
          selectPlaceholder: getSelectPlaceholder(
            'lowcoder:expense_request_list.expense_request_filter.expense_department_title',
            'Filter by department'
          ),
          content: (
            <>
              <div className="gba:p-2">
                <input
                  type="text"
                  value={departmentSearch}
                  onChange={event => setDepartmentSearch(event.target.value)}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.search_departments',
                    'Search departments...'
                  )}
                  className="gba:w-full gba:h-8 gba:rounded gba:border gba:border-input gba:px-2 gba:text-sm"
                  data-testid="department-filter-search-input"
                />
              </div>
              <SelectItem value="all" data-testid="department-filter-option-all">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.expense_request_filter.all_departments',
                  'All Departments'
                )}
              </SelectItem>
              {filteredOrganizationalUnits.map(orgUnit => (
                <SelectItem key={orgUnit.id} value={orgUnit.id} data-testid={`department-filter-option-${orgUnit.id}`}>
                  {orgUnit.name}
                </SelectItem>
              ))}
            </>
          ),
          clearButton: {
            shouldShow: Boolean(filters.department && filters.department !== 'all'),
            onClick: () => {
              clearFilter('department')
              setDepartmentSearch('')
            },
            testId: 'clear-department-filter'
          }
        })}

        {renderSelectFilter({
          wrapperTestId: 'currency-filter-wrapper',
          value: filters.currency || '',
          onValueChange: value => handleFilterChange('currency', value),
          triggerClassName: 'gba:w-[140px] gba:border-border',
          selectPlaceholder: getSelectPlaceholder(
            'lowcoder:expense_request_list.expense_request_filter.filter_by_currency',
            'Filter by Currency'
          ),
          content: (
            <>
              {currencies.map(currency => (
                <SelectItem
                  key={currency.currencyRef}
                  value={currency.currencyRef}
                  data-testid={`currency-filter-option-${currency.currencyRef}`}
                >
                  {currency.code}
                </SelectItem>
              ))}
            </>
          ),
          clearButton: createClearButtonConfig(
            'currency',
            Boolean(filters.currency && filters.currency !== ''),
            'clear-currency-filter'
          )
        })}

        {renderSelectFilter({
          wrapperTestId: 'period-filter-wrapper',
          value: filters.period || '',
          onValueChange: value => handleFilterChange('period', value),
          triggerClassName: 'gba:w-[140px] gba:border-border',
          selectPlaceholder: filterDataLoading ? 'Loading...' : 'Filter by period',
          content: (
            <>
              <SelectItem value="monthly" data-testid="period-filter-option-monthly">
                {getTranslationFromI18nKeyAndLabel('lowcoder:cards.monthly', 'Monthly')}
              </SelectItem>
              <SelectItem value="quarterly" data-testid="period-filter-option-quarterly">
                {getTranslationFromI18nKeyAndLabel('lowcoder:cards.quartely', 'Quarterly')}
              </SelectItem>
              <SelectItem value="yearly" data-testid="period-filter-option-yearly">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule_details.mileage_rule_list.mileage_expense_module.rule_period_yearly',
                  'Yearly'
                )}
              </SelectItem>
            </>
          ),
          clearButton: createClearButtonConfig(
            'period',
            Boolean(filters.period && filters.period !== 'monthly'),
            'clear-period-filter'
          )
        })}
      </div>
    </div>
  )
}

export default ExpenseFilterBar
