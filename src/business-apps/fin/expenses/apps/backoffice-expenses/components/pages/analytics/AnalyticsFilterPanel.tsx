import React from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import translations from '../../../_i18n'
import CurrencyFilter from '../../../../manager-expenses/components/currency-filter'
import { DateRangeOption } from '../../../hooks/useBackofficeTeamSpendingAnalytics'

interface FilterChecklistRow {
  id: string
  name: string
  selected: boolean
}

interface AnalyticsFilterPanelProps {
  readonly dateRange: string
  readonly onDateRangeChange: (value: string) => void
  readonly locationFilters: FilterChecklistRow[]
  readonly locationSearchTerm: string
  readonly onLocationSearchChange: (value: string) => void
  readonly onToggleLocation: (id: string) => void
  readonly departmentFilters: FilterChecklistRow[]
  readonly departmentSearchTerm: string
  readonly onDepartmentSearchChange: (value: string) => void
  readonly onToggleDepartment: (id: string) => void
  readonly currencyFilter: string | null
  readonly onCurrencyChange: (value: string | null) => void
  readonly currencyOptions: string[]
  readonly isCurrencyLoading: boolean
}

const DATE_RANGE_OPTIONS = [
  {
    value: DateRangeOption.LAST_30_DAYS,
    id: 'backoffice-last-30-days',
    testId: 'backoffice-analytics-date-range-30-days',
    ftlKey: 'analytics-last-30-days'
  },
  {
    value: DateRangeOption.LAST_90_DAYS,
    id: 'backoffice-last-90-days',
    testId: 'backoffice-analytics-date-range-90-days',
    ftlKey: 'analytics-last-90-days'
  },
  {
    value: DateRangeOption.CURRENT_YEAR,
    id: 'backoffice-current-year',
    testId: 'backoffice-analytics-date-range-current-year',
    ftlKey: 'analytics-current-year'
  }
]

const FilterChecklist: React.FC<{
  readonly label: string
  readonly searchPlaceholder: string
  readonly searchValue: string
  readonly onSearchChange: (value: string) => void
  readonly searchInputTestId: string
  readonly listTestId: string
  readonly emptyTestId: string
  readonly emptyLabel: string
  readonly rows: FilterChecklistRow[]
  readonly checkboxTestPrefix: string
  readonly onToggle: (id: string) => void
}> = ({
  label,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  searchInputTestId,
  listTestId,
  emptyTestId,
  emptyLabel,
  rows,
  checkboxTestPrefix,
  onToggle
}) => (
  <div className="gba:space-y-4">
    <Label className="gba:text-sm gba:font-semibold gba:text-foreground">{label}</Label>
    <div className="gba:relative">
      <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
      <DebouncedInput
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange}
        className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
        data-testid={searchInputTestId}
      />
    </div>
    <div className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2" data-testid={listTestId}>
      {rows.map((row, index) => {
        const rowDomId = `${checkboxTestPrefix}${row.id}-${index}`
        return (
          <div
            key={`${row.id}-${index}`}
            className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
          >
            <Checkbox
              id={rowDomId}
              checked={row.selected}
              onCheckedChange={() => onToggle(row.id)}
              data-testid={`${checkboxTestPrefix}${row.id}`}
            />
            <Label htmlFor={rowDomId} className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1">
              {row.name}
            </Label>
          </div>
        )
      })}
      {rows.length === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2" data-testid={emptyTestId}>
          {emptyLabel}
        </div>
      )}
    </div>
  </div>
)

const AnalyticsFilterPanel: React.FC<AnalyticsFilterPanelProps> = ({
  dateRange,
  onDateRangeChange,
  locationFilters,
  locationSearchTerm,
  onLocationSearchChange,
  onToggleLocation,
  departmentFilters,
  departmentSearchTerm,
  onDepartmentSearchChange,
  onToggleDepartment,
  currencyFilter,
  onCurrencyChange,
  currencyOptions,
  isCurrencyLoading
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card className="gba:sticky gba:top-6" data-testid="backoffice-analytics-filters-card">
      <CardHeader className="gba:pb-4">
        <CardTitle className="gba:text-lg gba:font-semibold">{t('analytics-filters-settings')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">{t('analytics-date-range')}</Label>
          <RadioGroup
            value={dateRange}
            onValueChange={onDateRangeChange}
            className="gba:space-y-3"
            data-testid="backoffice-analytics-date-range-filter"
          >
            {DATE_RANGE_OPTIONS.map(option => (
              <div key={option.value} className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
                <RadioGroupItem value={option.value} id={option.id} data-testid={option.testId} />
                <Label htmlFor={option.id} className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                  {t(option.ftlKey)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator className="gba:my-6" />

        <FilterChecklist
          label={t('analytics-location-filters')}
          searchPlaceholder={t('analytics-search-locations')}
          searchValue={locationSearchTerm}
          onSearchChange={onLocationSearchChange}
          searchInputTestId="backoffice-analytics-location-search-input"
          listTestId="backoffice-analytics-location-filters-list"
          emptyTestId="backoffice-analytics-location-filters-empty"
          emptyLabel={t('analytics-no-locations')}
          rows={locationFilters}
          checkboxTestPrefix="backoffice-analytics-location-checkbox-"
          onToggle={onToggleLocation}
        />

        <Separator className="gba:my-6" />

        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">{t('header-currency')}</Label>
          <CurrencyFilter
            data-testid="backoffice-analytics-currency-filter"
            value={currencyFilter}
            onChange={onCurrencyChange}
            currencies={currencyOptions}
            showAllOption={false}
            placeholder={t('analytics-select-currency')}
            isLoading={isCurrencyLoading}
          />
        </div>

        <Separator className="gba:my-6" />

        <FilterChecklist
          label={t('analytics-department-filters')}
          searchPlaceholder={t('filter-search-departments')}
          searchValue={departmentSearchTerm}
          onSearchChange={onDepartmentSearchChange}
          searchInputTestId="backoffice-analytics-department-search-input"
          listTestId="backoffice-analytics-department-filters-list"
          emptyTestId="backoffice-analytics-department-filters-empty"
          emptyLabel={t('analytics-no-departments')}
          rows={departmentFilters}
          checkboxTestPrefix="backoffice-analytics-department-checkbox-"
          onToggle={onToggleDepartment}
        />
      </CardContent>
    </Card>
  )
}

export default AnalyticsFilterPanel
