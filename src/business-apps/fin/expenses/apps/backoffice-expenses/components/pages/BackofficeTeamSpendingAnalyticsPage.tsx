import React, { useMemo, useState, useEffect } from 'react'
import { useCurrencyStore } from '../../../manager-expenses/store/useCurrencyStore'
import { standardizeCurrencyRef, formatCurrency } from '../../utils/currencyUtils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  AlertDescription,
  PageLayout,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  Separator
} from '@newwork/nw-design-system'
import { PiMagnifyingGlass } from 'react-icons/pi'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBackofficeTeamSpendingAnalytics, DateRangeOption } from '../../hooks/useBackofficeTeamSpendingAnalytics'
import { LineChartComponent, PieChartComponent } from '../../../manager-expenses/components/modals/charts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import CurrencyFilter from '../../../manager-expenses/components/currency-filter'
import { useFilterData } from '../../hooks/useFilterData'

type BackofficeTeamSpendingAnalyticsPageProps = BusinessAppContextProps

const BackofficeTeamSpendingAnalyticsPage: React.FC<BackofficeTeamSpendingAnalyticsPageProps> = ({ accessToken }) => {
  const { primaryCurrency } = useCurrencyStore()
  const [activeTab, setActiveTab] = React.useState<string>('expense-items')
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(primaryCurrency || null)

  const standardizedCurrencyRef = useMemo(() => {
    return currencyFilter ? standardizeCurrencyRef(currencyFilter) : null
  }, [currencyFilter])

  const {
    currencies: dashboardCurrencies,
    organizationalUnits,
    loading: dashboardFilterDataLoading
  } = useFilterData({
    accessToken
  })

  const dashboardDepartmentOptions = React.useMemo(() => {
    return organizationalUnits
      .map(organizationalUnit => ({
        id: organizationalUnit.id,
        name: organizationalUnit.displayName || organizationalUnit.name
      }))
      .filter(department => department.id && department.name)
  }, [organizationalUnits])

  const {
    isLoading,
    error,
    data,
    dateRange,
    setDateRange,
    locationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm,
    departmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm,
    availableCurrencies
  } = useBackofficeTeamSpendingAnalytics(accessToken, standardizedCurrencyRef, dashboardDepartmentOptions)

  // Use the same currency source as dashboard to keep behavior consistent.
  const currencyOptions = React.useMemo(() => {
    const fromDashboard = dashboardCurrencies.map(currency => currency.code).filter(Boolean)
    return fromDashboard.length > 0 ? fromDashboard : availableCurrencies
  }, [dashboardCurrencies, availableCurrencies])

  useEffect(() => {
    if (!currencyFilter && currencyOptions.length > 0 && !isLoading) {
      const fallback = currencyOptions[0]
      setCurrencyFilter(fallback || null)
    }
  }, [currencyOptions, currencyFilter, isLoading])

  const expenseItemsByCategoryWithNames = useMemo(() => {
    if (!data?.expenseItemsByCategory) return []
    return data.expenseItemsByCategory as any
  }, [data?.expenseItemsByCategory])

  const handleDateRangeChange = (value: string) => {
    setDateRange(value as DateRangeOption)
  }

  const travelByDestinationPointChartData = useMemo(
    () =>
      (data?.travelByDestinationPoint || []).map(entry => ({
        name: entry.location,
        value: entry.amount
      })),
    [data?.travelByDestinationPoint]
  )

  const kpiCurrencyCode = (currencyFilter || primaryCurrency || 'EUR').split(':').pop() || 'EUR'
  const formatKpiAmount = (amount: number | null | undefined): string => {
    return formatCurrency(Number(amount ?? 0), kpiCurrencyCode, 2)
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-expense-items',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.total_expense_items',
        'Total Expense Items'
      ),
      value: formatKpiAmount(data?.totalExpenseAmount),
      color: 'var(--nw-primary)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions',
        'Individual expense transactions'
      )
    },
    {
      key: 'total-expense-requests',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.total_expense_requests',
        'Total Expense Requests'
      ),
      value: formatKpiAmount(data?.totalRequestAmount),
      color: 'var(--nw-success)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.submitted_expense_requests',
        'Submitted expense requests'
      )
    },
    {
      key: 'total-expense-plans',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.total_expense_plans',
        'Total Expense Plans'
      ),
      value: formatKpiAmount(data?.totalPlanAmount),
      color: 'var(--nw-accent)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.planned_expense_budgets',
        'Planned expense budgets'
      )
    },
    {
      key: 'total-advance-payments',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
        'Total Advance Payments'
      ),
      value: formatKpiAmount(data?.totalAdvanceAmount),
      color: 'var(--nw-warning)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.advance_payments_to_employees',
        'Advance payments to employees'
      )
    }
  ]

  const renderExpenseItemsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="backoffice-analytics-expense-items-monthly-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_items',
                'Monthly Expense Items'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expenseItemsByMonth || []}
              title=""
              lineColor="var(--nw-chart-1)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="backoffice-analytics-expense-items-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="backoffice-analytics-expense-items-category-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_items_by_category',
                'Expense Items by Category'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={expenseItemsByCategoryWithNames}
              title=""
              currency={currencyFilter || primaryCurrency}
              colors={['var(--nw-chart-1)', 'var(--nw-chart-2)', 'var(--nw-chart-3)', 'var(--nw-chart-4)']}
              dataTestId="backoffice-analytics-expense-items-category-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="backoffice-analytics-expense-items-summary-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="backoffice-analytics-expense-items-total-count"
                >
                  {data?.expenseItemsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_expense_items',
                    'Total Items'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-primary"
                  data-testid="backoffice-analytics-expense-items-total-amount"
                >
                  {formatKpiAmount(
                    Number((data?.totalExpenseAmount ?? 0).toFixed?.(2) ?? data?.totalExpenseAmount ?? 0)
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderExpenseRequestsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-3 gba:gap-6">
        <Card data-testid="backoffice-analytics-expense-requests-monthly-chart-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_requests',
                'Monthly Expense Requests'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expenseRequestsByMonth || []}
              title=""
              lineColor="var(--nw-chart-2)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="backoffice-analytics-expense-requests-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="backoffice-analytics-expense-requests-by-destination-point-chart-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.destination_spend_distribution',
                'Destination Spend Distribution'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={travelByDestinationPointChartData}
              title=""
              currency={currencyFilter || primaryCurrency}
              colors={['var(--nw-chart-1)', 'var(--nw-chart-2)', 'var(--nw-chart-3)', 'var(--nw-chart-4)']}
              dataTestId="backoffice-analytics-expense-requests-destination-point-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="backoffice-analytics-expense-requests-summary-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="backoffice-analytics-expense-requests-total-count"
                >
                  {data?.expenseRequestsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_expense_requests',
                    'Total Requests'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-success"
                  data-testid="backoffice-analytics-expense-requests-total-amount"
                >
                  {formatKpiAmount(
                    Number((data?.totalRequestAmount ?? 0).toFixed?.(2) ?? data?.totalRequestAmount ?? 0)
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderExpensePlansTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="backoffice-analytics-expense-plans-monthly-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_plans',
                'Monthly Expense Plans'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expensePlansByMonth || []}
              title=""
              lineColor="var(--nw-chart-3)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="backoffice-analytics-expense-plans-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="backoffice-analytics-expense-plans-summary-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="backoffice-analytics-expense-plans-total-count"
                >
                  {data?.expensePlansByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_expense_plans',
                    'Total Plans'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-warning"
                  data-testid="backoffice-analytics-expense-plans-total-amount"
                >
                  {formatKpiAmount(Number((data?.totalPlanAmount ?? 0).toFixed?.(2) ?? data?.totalPlanAmount ?? 0))}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAdvancePaymentsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="backoffice-analytics-advance-payments-monthly-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_advance_payments',
                'Monthly Advance Payments'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.advancePaymentsByMonth || []}
              title=""
              lineColor="var(--nw-chart-5)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="backoffice-analytics-advance-payments-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="backoffice-analytics-advance-payments-summary-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="backoffice-analytics-advance-payments-total-count"
                >
                  {data?.advancePaymentsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
                    'Total Payments'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-info"
                  data-testid="backoffice-analytics-advance-payments-total-amount"
                >
                  {formatKpiAmount(
                    Number((data?.totalAdvanceAmount ?? 0).toFixed?.(2) ?? data?.totalAdvanceAmount ?? 0)
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderFilters = () => (
    <Card className="gba:sticky gba:top-6" data-testid="backoffice-analytics-filters-card">
      <CardHeader className="gba:pb-4">
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.filters_settings',
            'Filters & Settings'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.date_range', 'Date Range')}
          </Label>
          <RadioGroup
            value={dateRange}
            onValueChange={handleDateRangeChange}
            className="gba:space-y-3"
            data-testid="backoffice-analytics-date-range-filter"
          >
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem
                value={DateRangeOption.LAST_30_DAYS}
                id="backoffice-last-30-days"
                data-testid="backoffice-analytics-date-range-30-days"
              />
              <Label htmlFor="backoffice-last-30-days" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.last_30_days',
                  'Last 30 Days'
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem
                value={DateRangeOption.LAST_90_DAYS}
                id="backoffice-last-90-days"
                data-testid="backoffice-analytics-date-range-90-days"
              />
              <Label htmlFor="backoffice-last-90-days" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.last_90_days',
                  'Last 90 Days'
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem
                value={DateRangeOption.CURRENT_YEAR}
                id="backoffice-current-year"
                data-testid="backoffice-analytics-date-range-current-year"
              />
              <Label htmlFor="backoffice-current-year" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.current_year',
                  'Current Year'
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator className="gba:my-6" />

        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.location_filters',
              'Location Filters'
            )}
          </Label>
          <div className="gba:relative">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
            <DebouncedInput
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.search_locations',
                'Search locations...'
              )}
              value={searchTerm}
              onChange={val => setSearchTerm(val)}
              className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
              data-testid="backoffice-analytics-location-search-input"
            />
          </div>
          <div
            className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2"
            data-testid="backoffice-analytics-location-filters-list"
          >
            {locationFilters.map(location => (
              <div
                key={location.id}
                className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
              >
                <Checkbox
                  id={location.id}
                  checked={location.selected}
                  onCheckedChange={() => toggleLocationFilter(location.id)}
                  data-testid={`backoffice-analytics-location-checkbox-${location.id}`}
                />
                <Label htmlFor={location.id} className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1">
                  {location.name}
                </Label>
              </div>
            ))}
            {locationFilters.length === 0 && (
              <div
                className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2"
                data-testid="backoffice-analytics-location-filters-empty"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.no_locations_available',
                  'No locations available'
                )}
              </div>
            )}
          </div>
        </div>

        <Separator className="gba:my-6" />

        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.currency', 'Currency')}
          </Label>
          <CurrencyFilter
            data-testid="backoffice-analytics-currency-filter"
            value={currencyFilter}
            onChange={setCurrencyFilter}
            currencies={currencyOptions}
            showAllOption={false}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder',
              'Select Currency'
            )}
            isLoading={isLoading || dashboardFilterDataLoading}
          />
        </div>

        <Separator className="gba:my-6" />

        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.department_filters',
              'Department Filters'
            )}
          </Label>
          <div className="gba:relative">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
            <DebouncedInput
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.search_departments',
                'Search departments...'
              )}
              value={departmentSearchTerm}
              onChange={val => setDepartmentSearchTerm(val)}
              className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
              data-testid="backoffice-analytics-department-search-input"
            />
          </div>
          <div
            className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2"
            data-testid="backoffice-analytics-department-filters-list"
          >
            {departmentFilters.map(department => (
              <div
                key={department.id}
                className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
              >
                <Checkbox
                  id={department.id}
                  checked={department.selected}
                  onCheckedChange={() => toggleDepartmentFilter(department.id)}
                  data-testid={`backoffice-analytics-department-checkbox-${department.id}`}
                />
                <Label
                  htmlFor={department.id}
                  className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1"
                >
                  {department.name}
                </Label>
              </div>
            ))}
            {departmentFilters.length === 0 && (
              <div
                className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2"
                data-testid="backoffice-analytics-department-filters-empty"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.no_departments_found',
                  'No departments found'
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div data-testid="backoffice-team-spending-analytics-page-container">
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expenses.analytics.spending_analysis',
          'Spending Analysis'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expenses.analytics.spending_analysis_description',
          'Comprehensive analysis of spending patterns, trends, and budget allocations across all expense categories'
        )}
        className="gba:min-h-screen"
      >
        <div className="gba:flex gba:gap-6">
          <div className="gba:w-80 gba:flex-shrink-0">{renderFilters()}</div>

          <div className="gba:flex-1 gba:space-y-6">
            <WidgetGroup
              widgets={widgets}
              isLoading={isLoading}
              error={error || null}
              onRetry={() => globalThis.location?.reload?.()}
              skeletonCount={4}
              emptyText={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.no_analytics_data',
                'No analytics data available.'
              )}
              data-testid="backoffice-team-spending-analytics-statistics"
            />
            <div
              className="gba:mt-2 gba:text-sm gba:text-muted-foreground"
              data-testid="backoffice-analytics-bucketing-note"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.bucketing_note',
                'Note: Analytics in this view use only status PAID.'
              )}
            </div>

            {error ? (
              <Alert data-testid="backoffice-team-spending-analytics-error-alert">
                <AlertDescription>
                  <strong>{getTranslationFromI18nKeyAndLabel('lowcoder:common.error_title', 'Error')}</strong> {error}
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="gba:w-full"
                data-testid="backoffice-analytics-tabs"
              >
                <TabsList className="gba:grid gba:w-full gba:grid-cols-4" data-testid="backoffice-analytics-tabs-list">
                  <TabsTrigger value="expense-items" data-testid="backoffice-analytics-tab-expense-items">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items', 'Expense Items')}
                  </TabsTrigger>
                  <TabsTrigger value="expense-requests" data-testid="backoffice-analytics-tab-expense-requests">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_list.flows_button.expense_requests',
                      'Expense Requests'
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="expense-plans" data-testid="backoffice-analytics-tab-expense-plans">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
                      'Expense Plans'
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="advance-payments" data-testid="backoffice-analytics-tab-advance-payments">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:backoffice_expense_landing_page.advance_title',
                      'Advance Payments'
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="expense-items"
                  className="gba:space-y-6 gba:mt-6"
                  data-testid="backoffice-analytics-tab-content-expense-items"
                >
                  {isLoading ? (
                    <div className="gba:flex gba:justify-center gba:p-8">
                      <Spinner data-testid="backoffice-loading-spinner" />
                    </div>
                  ) : (
                    renderExpenseItemsTab()
                  )}
                </TabsContent>

                <TabsContent
                  value="expense-requests"
                  className="gba:space-y-6 gba:mt-6"
                  data-testid="backoffice-analytics-tab-content-expense-requests"
                >
                  {isLoading ? (
                    <div className="gba:flex gba:justify-center gba:p-8">
                      <Spinner data-testid="backoffice-loading-spinner" />
                    </div>
                  ) : (
                    renderExpenseRequestsTab()
                  )}
                </TabsContent>

                <TabsContent
                  value="expense-plans"
                  className="gba:space-y-6 gba:mt-6"
                  data-testid="backoffice-analytics-tab-content-expense-plans"
                >
                  {isLoading ? (
                    <div className="gba:flex gba:justify-center gba:p-8">
                      <Spinner data-testid="backoffice-loading-spinner" />
                    </div>
                  ) : (
                    renderExpensePlansTab()
                  )}
                </TabsContent>

                <TabsContent
                  value="advance-payments"
                  className="gba:space-y-6 gba:mt-6"
                  data-testid="backoffice-analytics-tab-content-advance-payments"
                >
                  {isLoading ? (
                    <div className="gba:flex gba:justify-center gba:p-8">
                      <Spinner data-testid="backoffice-loading-spinner" />
                    </div>
                  ) : (
                    renderAdvancePaymentsTab()
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default BackofficeTeamSpendingAnalyticsPage
