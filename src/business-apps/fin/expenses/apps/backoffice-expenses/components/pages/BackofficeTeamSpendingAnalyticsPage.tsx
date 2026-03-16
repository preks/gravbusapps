import React, { useMemo, useState, useEffect } from 'react'
import {
  Alert,
  AlertDescription,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCurrencyStore } from '../../../manager-expenses/store/useCurrencyStore'
import { standardizeCurrencyRef, formatCurrency } from '../../utils/currencyUtils'
import { extractCurrencyCode } from '../../utils/sharedUtils'
import { useBackofficeTeamSpendingAnalytics, DateRangeOption } from '../../hooks/useBackofficeTeamSpendingAnalytics'
import { useFilterData } from '../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../utils/departmentOptions'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import translations from '../../_i18n'
import AnalyticsFilterPanel from './analytics/AnalyticsFilterPanel'
import AnalyticsTabContent from './analytics/AnalyticsTabContent'

const TAB_DEFINITIONS = [
  {
    value: 'expense-items',
    triggerTestId: 'backoffice-analytics-tab-expense-items',
    contentTestId: 'backoffice-analytics-tab-content-expense-items',
    ftlKey: 'tab-expense-items'
  },
  {
    value: 'expense-requests',
    triggerTestId: 'backoffice-analytics-tab-expense-requests',
    contentTestId: 'backoffice-analytics-tab-content-expense-requests',
    ftlKey: 'tab-expense-requests'
  },
  {
    value: 'expense-plans',
    triggerTestId: 'backoffice-analytics-tab-expense-plans',
    contentTestId: 'backoffice-analytics-tab-content-expense-plans',
    ftlKey: 'tab-expense-plans'
  },
  {
    value: 'advance-payments',
    triggerTestId: 'backoffice-analytics-tab-advance-payments',
    contentTestId: 'backoffice-analytics-tab-content-advance-payments',
    ftlKey: 'tab-advance-payments'
  }
]

const BackofficeTeamSpendingAnalyticsPage: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
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
      const key = entry.name || t('common-not-available')
      aggregated.set(key, (aggregated.get(key) || 0) + Number(entry.value ?? 0))
    })
    return Array.from(aggregated.entries()).map(([name, value]) => ({ name, value }))
  }, [data?.expenseItemsByCategory, t])

  const travelByDestinationPointChartData = useMemo(() => {
    const aggregated = new Map<string, number>()
    ;(data?.travelByDestinationPoint || []).forEach(entry => {
      const key = entry.location || t('common-not-available')
      aggregated.set(key, (aggregated.get(key) || 0) + Number(entry.amount ?? 0))
    })
    return Array.from(aggregated.entries()).map(([name, value]) => ({ name, value }))
  }, [data?.travelByDestinationPoint, t])

  const kpiCurrencyCode = extractCurrencyCode(currencyFilter || primaryCurrency)
  const formatKpiAmount = (amount: number | null | undefined): string =>
    formatCurrency(Number(amount ?? 0), kpiCurrencyCode, 2)
  const hiddenTrendPlaceholder = { hideBadge: true, value: '', description: '\u200B' } as const

  const widgets: WidgetItem[] = [
    {
      key: 'total-expense-items',
      title: t('kpi-total-expense-items'),
      value: formatKpiAmount(data?.totalExpenseAmount),
      color: 'var(--nw-primary)',
      valueIsString: true,
      footer: t('kpi-total-expense-items-footer'),
      trend: hiddenTrendPlaceholder
    },
    {
      key: 'total-expense-requests',
      title: t('kpi-total-expense-requests'),
      value: formatKpiAmount(data?.totalRequestAmount),
      color: 'var(--nw-success)',
      valueIsString: true,
      footer: t('kpi-total-expense-requests-footer'),
      trend: hiddenTrendPlaceholder
    },
    {
      key: 'total-expense-plans',
      title: t('kpi-total-expense-plans'),
      value: formatKpiAmount(data?.totalPlanAmount),
      color: 'var(--nw-accent)',
      valueIsString: true,
      footer: t('kpi-total-expense-plans-footer'),
      trend: hiddenTrendPlaceholder
    },
    {
      key: 'total-advance-payments',
      title: t('kpi-total-advance-payments'),
      value: formatKpiAmount(data?.totalAdvanceAmount),
      color: 'var(--nw-warning)',
      valueIsString: true,
      footer: t('kpi-total-advance-payments-footer'),
      trend: hiddenTrendPlaceholder
    }
  ]

  const activeTabDef = TAB_DEFINITIONS.find(tab => tab.value === activeTab)

  return (
    <div data-testid="backoffice-team-spending-analytics-page-container">
      <PageLayout
        headerTitle={t('spending-analysis-title')}
        headerDescription={t('spending-analysis-description')}
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
              emptyText={t('analytics-no-data')}
              data-testid="backoffice-team-spending-analytics-statistics"
            />
            <div
              className="gba:mt-2 gba:text-sm gba:text-muted-foreground"
              data-testid="backoffice-analytics-bucketing-note"
            >
              {t('analytics-bucketing-note')}
            </div>

            {error ? (
              <Alert data-testid="backoffice-team-spending-analytics-error-alert">
                <AlertDescription>
                  <strong>{t('common-error')}</strong> {error}
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
                      {t(tab.ftlKey)}
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
