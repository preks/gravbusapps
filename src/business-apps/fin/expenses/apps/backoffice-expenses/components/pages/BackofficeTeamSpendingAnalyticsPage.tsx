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
import { getActiveStructureDepartmentOptions } from '../../utils/departmentOptions'

type BackofficeTeamSpendingAnalyticsPageProps = BusinessAppContextProps

const BackofficeTeamSpendingAnalyticsPage: React.FC<BackofficeTeamSpendingAnalyticsPageProps> = ({ accessToken }) => {
  const { primaryCurrency } = useCurrencyStore()
  const [activeTab, setActiveTab] = React.useState<string>('expense-items')
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(primaryCurrency || null)
  const [isChartTabReady, setIsChartTabReady] = useState(false)
  const analyticsContentRef = React.useRef<HTMLDivElement | null>(null)
  const [hasAnalyticsContentSpace, setHasAnalyticsContentSpace] = useState(false)

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
    return getActiveStructureDepartmentOptions(organizationalUnits)
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
  const normalizedLocationSearchTerm = searchTerm ?? ''
  const normalizedDepartmentSearchTerm = departmentSearchTerm ?? ''

  const handleLocationSearchChange = (value: string) => {
    setSearchTerm(value ?? '')
  }

  const handleDepartmentSearchChange = (value: string) => {
    setDepartmentSearchTerm(value ?? '')
  }

  // Use the same currency source as dashboard to keep behavior consistent.
  const currencyOptions = React.useMemo(() => {
    const fromDashboard = Array.from(new Set(dashboardCurrencies.map(currency => currency.code).filter(Boolean)))
    const fallback = Array.from(new Set((availableCurrencies || []).filter(Boolean)))
    return fromDashboard.length > 0 ? fromDashboard : fallback
  }, [dashboardCurrencies, availableCurrencies])

  useEffect(() => {
    if (!currencyFilter && currencyOptions.length > 0 && !isLoading) {
      const fallback = currencyOptions[0]
      setCurrencyFilter(fallback || null)
    }
  }, [currencyOptions, currencyFilter, isLoading])

  useEffect(() => {
    if (isLoading) {
      setIsChartTabReady(false)
      return
    }
    setIsChartTabReady(false)
    let frameB: number | null = null
    const frameA = globalThis.requestAnimationFrame(() => {
      frameB = globalThis.requestAnimationFrame(() => setIsChartTabReady(true))
    })
    return () => {
      globalThis.cancelAnimationFrame(frameA)
      if (frameB !== null) {
        globalThis.cancelAnimationFrame(frameB)
      }
    }
  }, [activeTab, isLoading, dateRange, currencyFilter, normalizedLocationSearchTerm, normalizedDepartmentSearchTerm])

  useEffect(() => {
    const contentWrapper = analyticsContentRef.current
    if (!contentWrapper) return

    const syncContentSpace = () => {
      setHasAnalyticsContentSpace(contentWrapper.clientWidth > 0 && contentWrapper.clientHeight > 0)
    }

    syncContentSpace()
    const observer = new ResizeObserver(syncContentSpace)
    observer.observe(contentWrapper)

    return () => observer.disconnect()
  }, [])

  const expenseItemsByCategoryWithNames = useMemo(() => {
    if (!data?.expenseItemsByCategory) return []
    const aggregatedByCategory = new Map<string, number>()
    ;(data.expenseItemsByCategory as Array<{ name?: string; value?: number }>).forEach(entry => {
      const key = entry.name || getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
      const amount = Number(entry.value ?? 0)
      aggregatedByCategory.set(key, (aggregatedByCategory.get(key) || 0) + amount)
    })
    return Array.from(aggregatedByCategory.entries()).map(([name, value]) => ({ name, value }))
  }, [data?.expenseItemsByCategory])

  const handleDateRangeChange = (value: string) => {
    setDateRange(value as DateRangeOption)
  }

  const travelByDestinationPointChartData = useMemo(() => {
    const aggregatedByLocation = new Map<string, number>()
    ;(data?.travelByDestinationPoint || []).forEach(entry => {
      const key = entry.location || getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
      aggregatedByLocation.set(key, (aggregatedByLocation.get(key) || 0) + Number(entry.amount ?? 0))
    })
    return Array.from(aggregatedByLocation.entries()).map(([name, value]) => ({ name, value }))
  }, [data?.travelByDestinationPoint])

  const kpiCurrencyCode = (currencyFilter || primaryCurrency || 'EUR').split(':').pop() || 'EUR'
  const formatKpiAmount = (amount: number | null | undefined): string => {
    return formatCurrency(Number(amount ?? 0), kpiCurrencyCode, 2)
  }

  const hiddenTrendPlaceholder = { hideBadge: true, value: '', description: '\u200B' } as const

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
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions',
        'Individual expense transactions'
      ),
      trend: hiddenTrendPlaceholder
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
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.submitted_expense_requests',
        'Submitted expense requests'
      ),
      trend: hiddenTrendPlaceholder
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
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.planned_expense_budgets',
        'Planned expense budgets'
      ),
      trend: hiddenTrendPlaceholder
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
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.advance_payments_to_employees',
        'Advance payments to employees'
      ),
      trend: hiddenTrendPlaceholder
    }
  ]

  type SummaryStatisticsCardConfig = {
    cardTestId: string
    countTestId: string
    amountTestId: string
    totalCount: number
    totalAmount: number | null | undefined
    countLabelKey: string
    countLabelFallback: string
    amountClassName: string
  }

  const renderSummaryStatisticsCard = ({
    cardTestId,
    countTestId,
    amountTestId,
    totalCount,
    totalAmount,
    countLabelKey,
    countLabelFallback,
    amountClassName
  }: SummaryStatisticsCardConfig) => (
    <Card data-testid={cardTestId}>
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
            <div className="gba:text-3xl gba:font-bold gba:text-primary" data-testid={countTestId}>
              {totalCount}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(countLabelKey, countLabelFallback)}
            </div>
          </div>
          <Separator />
          <div className="gba:text-center">
            <div className={amountClassName} data-testid={amountTestId}>
              {formatKpiAmount(Number((totalAmount ?? 0).toFixed?.(2) ?? totalAmount ?? 0))}
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
  )

  type AnalyticsChartCardConfig = {
    cardTestId: string
    titleKey: string
    titleFallback: string
    content: React.ReactNode
    headerClassName?: string
  }

  const renderAnalyticsChartCard = ({
    cardTestId,
    titleKey,
    titleFallback,
    content,
    headerClassName
  }: AnalyticsChartCardConfig) => (
    <Card data-testid={cardTestId}>
      <CardHeader className={headerClassName}>
        <CardTitle>{getTranslationFromI18nKeyAndLabel(titleKey, titleFallback)}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
  const pieChartColors = ['var(--nw-chart-1)', 'var(--nw-chart-2)', 'var(--nw-chart-3)', 'var(--nw-chart-4)']

  const buildPieChartCardConfig = (config: {
    cardTestId: string
    titleKey: string
    titleFallback: string
    data: any[]
    dataTestId: string
    headerClassName?: string
  }): AnalyticsChartCardConfig => ({
    cardTestId: config.cardTestId,
    titleKey: config.titleKey,
    titleFallback: config.titleFallback,
    headerClassName: config.headerClassName,
    content: (
      <PieChartComponent
        data={config.data}
        title=""
        currency={currencyFilter || primaryCurrency}
        colors={pieChartColors}
        dataTestId={config.dataTestId}
      />
    )
  })

  type AnalyticsSummaryCardConfig = {
    cardTestId: string
    countTestId: string
    amountTestId: string
    totalCount: number
    totalAmount: number
    countLabelKey: string
    countLabelFallback: string
    amountClassName?: string
  }

  const renderAnalyticsGridTab = (config: {
    columnsClassName: string
    chartCards: AnalyticsChartCardConfig[]
    summaryCard: AnalyticsSummaryCardConfig
  }) => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className={`gba:grid gba:grid-cols-1 ${config.columnsClassName} gba:gap-6`}>
        {config.chartCards.map(chartCard => (
          <React.Fragment key={chartCard.cardTestId}>{renderAnalyticsChartCard(chartCard)}</React.Fragment>
        ))}
        {renderSummaryStatisticsCard(config.summaryCard)}
      </div>
    </div>
  )

  const buildStatusSummaryCard = (config: {
    idPrefix: string
    statuses: Array<{ count: number }>
    totalAmount: number
    countLabelKey: string
    countLabelFallback: string
    amountClassName: string
  }): AnalyticsSummaryCardConfig => ({
    cardTestId: `backoffice-analytics-${config.idPrefix}-summary-card`,
    countTestId: `backoffice-analytics-${config.idPrefix}-total-count`,
    amountTestId: `backoffice-analytics-${config.idPrefix}-total-amount`,
    totalCount: config.statuses.reduce((sum, item) => sum + item.count, 0),
    totalAmount: config.totalAmount,
    countLabelKey: config.countLabelKey,
    countLabelFallback: config.countLabelFallback,
    amountClassName: config.amountClassName
  })

  const renderSingleLineSummaryTab = (config: {
    chartCard: AnalyticsChartCardConfig
    summaryCard: AnalyticsSummaryCardConfig
  }) =>
    renderAnalyticsGridTab({
      columnsClassName: 'lg:gba:grid-cols-2',
      chartCards: [config.chartCard],
      summaryCard: config.summaryCard
    })

  const renderExpenseItemsTab = () =>
    renderAnalyticsGridTab({
      columnsClassName: 'lg:gba:grid-cols-2',
      chartCards: [
        {
          cardTestId: 'backoffice-analytics-expense-items-monthly-chart-card',
          titleKey: 'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_items',
          titleFallback: 'Monthly Expense Items',
          content: (
            <LineChartComponent
              data={data?.expenseItemsByMonth || []}
              title=""
              lineColor="var(--nw-chart-1)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="backoffice-analytics-expense-items-monthly-chart"
            />
          )
        },
        {
          ...buildPieChartCardConfig({
            cardTestId: 'backoffice-analytics-expense-items-category-chart-card',
            titleKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_items_by_category',
            titleFallback: 'Expense Items by Category',
            data: expenseItemsByCategoryWithNames,
            dataTestId: 'backoffice-analytics-expense-items-category-chart'
          })
        }
      ],
      summaryCard: buildStatusSummaryCard({
        idPrefix: 'expense-items',
        statuses: data?.expenseItemsByStatus || [],
        totalAmount: data?.totalExpenseAmount,
        countLabelKey: 'lowcoder:team_expenses_page.dashboard_tab.total_expense_items',
        countLabelFallback: 'Total Items',
        amountClassName: 'gba:text-2xl gba:font-bold gba:text-primary'
      })
    })

  const renderExpenseRequestsTab = () =>
    renderAnalyticsGridTab({
      columnsClassName: 'lg:gba:grid-cols-3',
      chartCards: [
        {
          cardTestId: 'backoffice-analytics-expense-requests-monthly-chart-card',
          titleKey: 'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_requests',
          titleFallback: 'Monthly Expense Requests',
          headerClassName: 'gba:bg-muted',
          content: (
            <LineChartComponent
              data={data?.expenseRequestsByMonth || []}
              title=""
              lineColor="var(--nw-chart-2)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="backoffice-analytics-expense-requests-monthly-chart"
            />
          )
        },
        {
          ...buildPieChartCardConfig({
            cardTestId: 'backoffice-analytics-expense-requests-by-destination-point-chart-card',
            titleKey: 'lowcoder:team_expenses_page.dashboard_tab.destination_spend_distribution',
            titleFallback: 'Destination Spend Distribution',
            data: travelByDestinationPointChartData,
            dataTestId: 'backoffice-analytics-expense-requests-destination-point-chart',
            headerClassName: 'gba:bg-muted'
          })
        }
      ],
      summaryCard: buildStatusSummaryCard({
        idPrefix: 'expense-requests',
        statuses: data?.expenseRequestsByStatus || [],
        totalAmount: data?.totalRequestAmount,
        countLabelKey: 'lowcoder:team_expenses_page.dashboard_tab.total_expense_requests',
        countLabelFallback: 'Total Requests',
        amountClassName: 'gba:text-2xl gba:font-bold gba:text-success'
      })
    })

  const renderExpensePlansTab = () =>
    renderSingleLineSummaryTab({
      chartCard: {
        cardTestId: 'backoffice-analytics-expense-plans-monthly-chart-card',
        titleKey: 'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_plans',
        titleFallback: 'Monthly Expense Plans',
        content: (
          <LineChartComponent
            data={data?.expensePlansByMonth || []}
            title=""
            lineColor="var(--nw-chart-3)"
            currency={currencyFilter || primaryCurrency}
            dataTestId="backoffice-analytics-expense-plans-monthly-chart"
          />
        )
      },
      summaryCard: buildStatusSummaryCard({
        idPrefix: 'expense-plans',
        statuses: data?.expensePlansByStatus || [],
        totalAmount: data?.totalPlanAmount,
        countLabelKey: 'lowcoder:team_expenses_page.dashboard_tab.total_expense_plans',
        countLabelFallback: 'Total Plans',
        amountClassName: 'gba:text-2xl gba:font-bold gba:text-warning'
      })
    })

  const renderAdvancePaymentsTab = () =>
    renderSingleLineSummaryTab({
      chartCard: {
        cardTestId: 'backoffice-analytics-advance-payments-monthly-chart-card',
        titleKey: 'lowcoder:team_expenses_page.dashboard_tab.monthly_advance_payments',
        titleFallback: 'Monthly Advance Payments',
        content: (
          <LineChartComponent
            data={data?.advancePaymentsByMonth || []}
            title=""
            lineColor="var(--nw-chart-5)"
            currency={currencyFilter || primaryCurrency}
            dataTestId="backoffice-analytics-advance-payments-monthly-chart"
          />
        )
      },
      summaryCard: buildStatusSummaryCard({
        idPrefix: 'advance-payments',
        statuses: data?.advancePaymentsByStatus || [],
        totalAmount: data?.totalAdvanceAmount,
        countLabelKey: 'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
        countLabelFallback: 'Total Payments',
        amountClassName: 'gba:text-2xl gba:font-bold gba:text-info'
      })
    })

  type FilterChecklistConfig = {
    label: string
    searchPlaceholder: string
    searchValue: string
    onSearchChange: (value: string) => void
    searchInputTestId: string
    listTestId: string
    emptyTestId: string
    emptyLabel: string
    rows: Array<{ id: string; name: string; selected: boolean }>
    checkboxTestPrefix: string
    onToggle: (id: string) => void
  }
  type FilterChecklistSearchFields = Pick<
    FilterChecklistConfig,
    'searchValue' | 'onSearchChange' | 'searchInputTestId' | 'listTestId' | 'emptyTestId'
  >
  type FilterChecklistRowsConfig = Pick<FilterChecklistConfig, 'rows' | 'checkboxTestPrefix' | 'onToggle'>

  const renderFilterChecklist = ({
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
  }: FilterChecklistConfig) => (
    <div className="gba:space-y-4">
      <Label className="gba:text-sm gba:font-semibold gba:text-foreground">{label}</Label>
      <div className="gba:relative">
        <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
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
  const renderTranslatedFilterChecklist = (
    config: {
      labelKey: string
      labelFallback: string
      searchPlaceholderKey: string
      searchPlaceholderFallback: string
      emptyLabelKey: string
      emptyLabelFallback: string
    } & FilterChecklistSearchFields &
      FilterChecklistRowsConfig
  ) =>
    renderFilterChecklist({
      label: getTranslationFromI18nKeyAndLabel(config.labelKey, config.labelFallback),
      searchPlaceholder: getTranslationFromI18nKeyAndLabel(
        config.searchPlaceholderKey,
        config.searchPlaceholderFallback
      ),
      searchValue: config.searchValue,
      onSearchChange: config.onSearchChange,
      searchInputTestId: config.searchInputTestId,
      listTestId: config.listTestId,
      emptyTestId: config.emptyTestId,
      emptyLabel: getTranslationFromI18nKeyAndLabel(config.emptyLabelKey, config.emptyLabelFallback),
      rows: config.rows,
      checkboxTestPrefix: config.checkboxTestPrefix,
      onToggle: config.onToggle
    })

  const dateRangeOptions = [
    {
      value: DateRangeOption.LAST_30_DAYS,
      id: 'backoffice-last-30-days',
      testId: 'backoffice-analytics-date-range-30-days',
      labelKey: 'lowcoder:team_expenses_page.dashboard_tab.last_30_days',
      fallback: 'Last 30 Days'
    },
    {
      value: DateRangeOption.LAST_90_DAYS,
      id: 'backoffice-last-90-days',
      testId: 'backoffice-analytics-date-range-90-days',
      labelKey: 'lowcoder:team_expenses_page.dashboard_tab.last_90_days',
      fallback: 'Last 90 Days'
    },
    {
      value: DateRangeOption.CURRENT_YEAR,
      id: 'backoffice-current-year',
      testId: 'backoffice-analytics-date-range-current-year',
      labelKey: 'lowcoder:team_expenses_page.dashboard_tab.current_year',
      fallback: 'Current Year'
    }
  ]

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
            {dateRangeOptions.map(option => (
              <div key={option.value} className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
                <RadioGroupItem value={option.value} id={option.id} data-testid={option.testId} />
                <Label htmlFor={option.id} className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                  {getTranslationFromI18nKeyAndLabel(option.labelKey, option.fallback)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator className="gba:my-6" />

        {renderTranslatedFilterChecklist({
          labelKey: 'lowcoder:team_expenses_page.dashboard_tab.location_filters',
          labelFallback: 'Location Filters',
          searchPlaceholderKey: 'lowcoder:team_expenses_page.dashboard_tab.search_locations',
          searchPlaceholderFallback: 'Search locations...',
          searchValue: normalizedLocationSearchTerm,
          onSearchChange: handleLocationSearchChange,
          searchInputTestId: 'backoffice-analytics-location-search-input',
          listTestId: 'backoffice-analytics-location-filters-list',
          emptyTestId: 'backoffice-analytics-location-filters-empty',
          emptyLabelKey: 'lowcoder:team_expenses_page.dashboard_tab.no_locations_available',
          emptyLabelFallback: 'No locations available',
          rows: locationFilters,
          checkboxTestPrefix: 'backoffice-analytics-location-checkbox-',
          onToggle: toggleLocationFilter
        })}

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

        {renderTranslatedFilterChecklist({
          labelKey: 'lowcoder:team_expenses_page.dashboard_tab.department_filters',
          labelFallback: 'Department Filters',
          searchPlaceholderKey: 'lowcoder:team_expenses_page.dashboard_tab.search_departments',
          searchPlaceholderFallback: 'Search departments...',
          searchValue: normalizedDepartmentSearchTerm,
          onSearchChange: handleDepartmentSearchChange,
          searchInputTestId: 'backoffice-analytics-department-search-input',
          listTestId: 'backoffice-analytics-department-filters-list',
          emptyTestId: 'backoffice-analytics-department-filters-empty',
          emptyLabelKey: 'lowcoder:team_expenses_page.dashboard_tab.no_departments_found',
          emptyLabelFallback: 'No departments found',
          rows: departmentFilters,
          checkboxTestPrefix: 'backoffice-analytics-department-checkbox-',
          onToggle: toggleDepartmentFilter
        })}
      </CardContent>
    </Card>
  )

  const tabDefinitions = [
    {
      value: 'expense-items',
      triggerTestId: 'backoffice-analytics-tab-expense-items',
      contentTestId: 'backoffice-analytics-tab-content-expense-items',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items', 'Expense Items'),
      render: renderExpenseItemsTab
    },
    {
      value: 'expense-requests',
      triggerTestId: 'backoffice-analytics-tab-expense-requests',
      contentTestId: 'backoffice-analytics-tab-content-expense-requests',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_list.flows_button.expense_requests',
        'Expense Requests'
      ),
      render: renderExpenseRequestsTab
    },
    {
      value: 'expense-plans',
      triggerTestId: 'backoffice-analytics-tab-expense-plans',
      contentTestId: 'backoffice-analytics-tab-content-expense-plans',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
        'Expense Plans'
      ),
      render: renderExpensePlansTab
    },
    {
      value: 'advance-payments',
      triggerTestId: 'backoffice-analytics-tab-advance-payments',
      contentTestId: 'backoffice-analytics-tab-content-advance-payments',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:backoffice_expense_landing_page.advance_title',
        'Advance Payments'
      ),
      render: renderAdvancePaymentsTab
    }
  ]
  const activeTabDefinition = tabDefinitions.find(tab => tab.value === activeTab)
  const renderTabContent = (tabValue: string, renderTab: () => React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:p-8">
          <Spinner data-testid="backoffice-loading-spinner" />
        </div>
      )
    }
    if (activeTab !== tabValue) {
      return null
    }
    if (!hasAnalyticsContentSpace) {
      return <div className="gba:min-h-[320px]" data-testid="backoffice-analytics-measuring-container" />
    }
    if (!isChartTabReady) {
      return <div className="gba:min-h-[320px]" data-testid="backoffice-analytics-chart-stabilizing" />
    }
    return renderTab()
  }

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

          <div ref={analyticsContentRef} className="gba:flex-1 gba:space-y-6">
            <WidgetGroup
              widgets={widgets}
              isLoading={isLoading}
              error={error || null}
              onRetry={() => globalThis.location?.reload?.()}
              skeletonCount={4}
              useWidgetStructureForLoading
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
                'Data scope: Only finalized expenses (status PAID or CLOSED) are included in analytics calculations.'
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
                  {tabDefinitions.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} data-testid={tab.triggerTestId}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {activeTabDefinition && (
                  <TabsContent
                    key={activeTabDefinition.value}
                    value={activeTabDefinition.value}
                    className="gba:space-y-6 gba:mt-6"
                    data-testid={activeTabDefinition.contentTestId}
                  >
                    {renderTabContent(activeTabDefinition.value, activeTabDefinition.render)}
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default BackofficeTeamSpendingAnalyticsPage
