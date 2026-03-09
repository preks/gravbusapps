import React, { useMemo, useState, useEffect } from 'react'
import {
  Alert,
  AlertDescription,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCurrencyStore } from '../../../manager-expenses/store/useCurrencyStore'
import { standardizeCurrencyRef, formatCurrency } from '../../utils/currencyUtils'
import { extractCurrencyCode } from '../../utils/sharedUtils'
import { useBackofficeTeamSpendingAnalytics, DateRangeOption } from '../../hooks/useBackofficeTeamSpendingAnalytics'
import { useFilterData } from '../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../utils/departmentOptions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import AnalyticsFilterPanel from './analytics/AnalyticsFilterPanel'
import AnalyticsTabContent from './analytics/AnalyticsTabContent'

const TAB_DEFINITIONS = [
  {
    value: 'expense-items',
    triggerTestId: 'backoffice-analytics-tab-expense-items',
    contentTestId: 'backoffice-analytics-tab-content-expense-items',
    labelKey: 'lowcoder:personal_expenses.expense_items',
    labelFallback: 'Expense Items'
  },
  {
    value: 'expense-requests',
    triggerTestId: 'backoffice-analytics-tab-expense-requests',
    contentTestId: 'backoffice-analytics-tab-content-expense-requests',
    labelKey: 'lowcoder:employee_list.flows_button.expense_requests',
    labelFallback: 'Expense Requests'
  },
  {
    value: 'expense-plans',
    triggerTestId: 'backoffice-analytics-tab-expense-plans',
    contentTestId: 'backoffice-analytics-tab-content-expense-plans',
    labelKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
    labelFallback: 'Expense Plans'
  },
  {
    value: 'advance-payments',
    triggerTestId: 'backoffice-analytics-tab-advance-payments',
    contentTestId: 'backoffice-analytics-tab-content-advance-payments',
    labelKey: 'lowcoder:backoffice_expense_landing_page.advance_title',
    labelFallback: 'Advance Payments'
  }
]

const BackofficeTeamSpendingAnalyticsPage: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { primaryCurrency } = useCurrencyStore()
  const [activeTab, setActiveTab] = useState<string>('expense-items')
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(primaryCurrency || null)
  const [isChartTabReady, setIsChartTabReady] = useState(false)
  const analyticsContentRef = React.useRef<HTMLDivElement | null>(null)
  const [hasAnalyticsContentSpace, setHasAnalyticsContentSpace] = useState(false)

  const standardizedCurrencyRef = useMemo(
    () => (currencyFilter ? standardizeCurrencyRef(currencyFilter) : null),
    [currencyFilter]
  )
  const {
    currencies: dashboardCurrencies,
    organizationalUnits,
    loading: dashboardFilterDataLoading
  } = useFilterData({ accessToken })
  const dashboardDepartmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits),
    [organizationalUnits]
  )

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

  const currencyOptions = useMemo(() => {
    const fromDashboard = Array.from(new Set(dashboardCurrencies.map(c => c.code).filter(Boolean)))
    const fallback = Array.from(new Set((availableCurrencies || []).filter(Boolean)))
    return fromDashboard.length > 0 ? fromDashboard : fallback
  }, [dashboardCurrencies, availableCurrencies])

  useEffect(() => {
    if (!currencyFilter && currencyOptions.length > 0 && !isLoading) {
      setCurrencyFilter(currencyOptions[0] || null)
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
      if (frameB !== null) globalThis.cancelAnimationFrame(frameB)
    }
  }, [activeTab, isLoading, dateRange, currencyFilter, normalizedLocationSearchTerm, normalizedDepartmentSearchTerm])

  useEffect(() => {
    const el = analyticsContentRef.current
    if (!el) return
    const sync = () => setHasAnalyticsContentSpace(el.clientWidth > 0 && el.clientHeight > 0)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const expenseItemsByCategoryWithNames = useMemo(() => {
    if (!data?.expenseItemsByCategory) return []
    const aggregated = new Map<string, number>()
    ;(data.expenseItemsByCategory as Array<{ name?: string; value?: number }>).forEach(entry => {
      const key = entry.name || getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
      aggregated.set(key, (aggregated.get(key) || 0) + Number(entry.value ?? 0))
    })
    return Array.from(aggregated.entries()).map(([name, value]) => ({ name, value }))
  }, [data?.expenseItemsByCategory])

  const travelByDestinationPointChartData = useMemo(() => {
    const aggregated = new Map<string, number>()
    ;(data?.travelByDestinationPoint || []).forEach(entry => {
      const key = entry.location || getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
      aggregated.set(key, (aggregated.get(key) || 0) + Number(entry.amount ?? 0))
    })
    return Array.from(aggregated.entries()).map(([name, value]) => ({ name, value }))
  }, [data?.travelByDestinationPoint])

  const kpiCurrencyCode = extractCurrencyCode(currencyFilter || primaryCurrency)
  const formatKpiAmount = (amount: number | null | undefined): string =>
    formatCurrency(Number(amount ?? 0), kpiCurrencyCode, 2)
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

  const activeTabDef = TAB_DEFINITIONS.find(t => t.value === activeTab)

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
          <div className="gba:w-80 gba:flex-shrink-0">
            <AnalyticsFilterPanel
              dateRange={dateRange}
              onDateRangeChange={v => setDateRange(v as DateRangeOption)}
              locationFilters={locationFilters}
              locationSearchTerm={normalizedLocationSearchTerm}
              onLocationSearchChange={v => setSearchTerm(v ?? '')}
              onToggleLocation={toggleLocationFilter}
              departmentFilters={departmentFilters}
              departmentSearchTerm={normalizedDepartmentSearchTerm}
              onDepartmentSearchChange={v => setDepartmentSearchTerm(v ?? '')}
              onToggleDepartment={toggleDepartmentFilter}
              currencyFilter={currencyFilter}
              onCurrencyChange={setCurrencyFilter}
              currencyOptions={currencyOptions}
              isCurrencyLoading={isLoading || dashboardFilterDataLoading}
            />
          </div>

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
                  {TAB_DEFINITIONS.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} data-testid={tab.triggerTestId}>
                      {getTranslationFromI18nKeyAndLabel(tab.labelKey, tab.labelFallback)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {activeTabDef && (
                  <TabsContent
                    key={activeTabDef.value}
                    value={activeTabDef.value}
                    className="gba:space-y-6 gba:mt-6"
                    data-testid={activeTabDef.contentTestId}
                  >
                    <AnalyticsTabContent
                      activeTab={activeTab}
                      data={data}
                      isLoading={isLoading}
                      isChartTabReady={isChartTabReady}
                      hasContentSpace={hasAnalyticsContentSpace}
                      currency={currencyFilter}
                      primaryCurrency={primaryCurrency}
                      kpiCurrencyCode={kpiCurrencyCode}
                      expenseItemsByCategoryWithNames={expenseItemsByCategoryWithNames}
                      travelByDestinationPointChartData={travelByDestinationPointChartData}
                    />
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
