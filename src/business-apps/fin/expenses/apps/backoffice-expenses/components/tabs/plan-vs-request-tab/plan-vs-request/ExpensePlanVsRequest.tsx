import React, { useState, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spinner, SectionKpiCards, useTranslation } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { extractCurrencyCode } from '../../../../utils/currencyUtils'
import { useExpenseGroupCatalog } from './hooks/useExpenseGroupCatalog'
import { useCombinedPlanVsRequestData } from './hooks/useCombinedPlanVsRequestData'
import { useFilterData } from '../../../../hooks/useFilterData'
import dayjs from 'dayjs'
import { ExpenseFilterBar, FilterOptions } from '../../../filter-bar'
import { usePlanVsRequestKpiCards, PlanVsRequestChart, PlanVsRequestCategoryTable } from './components'
import { getExpenseGroupPluralName } from './utils/expenseGroupDisplay'
import translations from '../../../../_i18n'

export interface ExpensePlanVsRequestProps extends BusinessAppContextProps {
  isActive?: boolean
}

const ExpensePlanVsRequest: React.FC<ExpensePlanVsRequestProps> = props => {
  const { accessToken, isActive = true } = props
  const { t } = useTranslation(translations)

  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    department: '',
    currency: 'Currency:v1:EUR', // Will be auto-updated with most used currency
    period: 'monthly'
  })
  const [hasUserSelectedCurrency, setHasUserSelectedCurrency] = useState(false)

  const userLocale = getCurrentActiveUserLocale()
  const { options: expenseRequestType, isLoading: loadingCatalogData } = useExpenseGroupCatalog(accessToken)

  // Fetch filter data for dropdowns (organizational units and currencies)
  const filterData = useFilterData({ accessToken })

  const selectedCurrencyCode = extractCurrencyCode(currentFilters.currency || 'Currency:v1:EUR') || 'EUR'

  // Memoize request types
  const memoizedRequestTypes = useMemo(() => expenseRequestType?.map(item => item.id) || [], [expenseRequestType])

  // ⚡ PERFORMANCE: Single combined query replacing 4 separate queries
  // (GetAllCurrencies, GetMonthlyExpenseStatistics, GetOverduePlansCount, GetCategoryStatistics)
  const { data: combinedData, loading: isLoadingCombined } = useCombinedPlanVsRequestData({
    accessToken,
    period: selectedPeriod,
    currencyRef: currentFilters.currency || 'Currency:v1:EUR',
    selectedDepartment: currentFilters.department || '',
    requestTypes: memoizedRequestTypes,
    isActive
  })

  // Auto-update currency to most used (only if user hasn't manually selected one yet)
  useEffect(() => {
    if (combinedData.mostUsedCurrency && !hasUserSelectedCurrency) {
      setCurrentFilters(prev => ({
        ...prev,
        currency: combinedData.mostUsedCurrency || 'Currency:v1:EUR'
      }))
    }
  }, [combinedData.mostUsedCurrency, hasUserSelectedCurrency])

  const isLoading = loadingCatalogData || isLoadingCombined
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setHasLoadedOnce(true)
    }
  }, [isLoading])

  // Extract data from combined result
  const totalExpensePlan = combinedData.periodStats.expensePlanTotal
  const totalExpenseRequest = combinedData.periodStats.expenseRequestTotal
  const periodStats = combinedData.periodStats
  const categoryStats = combinedData.categoryStats
  const overduePlansCount = combinedData.overduePlansCount

  // For compatibility with KPI cards hook
  const loadingOverduePlans = isLoadingCombined
  const loadingCategoryStats = isLoadingCombined

  // Calculate over budget count
  const overBudgetCount = useMemo(() => {
    return categoryStats?.filter(cat => cat.variance > 0).length || 0
  }, [categoryStats])

  // Currency formatter
  const formatCurrency = useMemo(
    () => (amount: number) => {
      return new Intl.NumberFormat(userLocale, {
        style: 'currency',
        currency: selectedCurrencyCode,
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    },
    [userLocale, selectedCurrencyCode]
  )

  // Handle filter changes
  const handleFiltersChange = (filters: FilterOptions) => {
    // Mark that user has manually selected a currency (prevent auto-update)
    if (filters.currency !== currentFilters.currency) {
      setHasUserSelectedCurrency(true)
    }

    setCurrentFilters(filters)
    if (filters.period === 'monthly') {
      setSelectedPeriod('month')
    } else if (filters.period === 'quarterly') {
      setSelectedPeriod('quarter')
    } else if (filters.period === 'yearly') {
      setSelectedPeriod('year')
    } else {
      setSelectedPeriod('month')
    }
  }

  // Get current date information
  const currentDate = useMemo(() => dayjs(), [])
  const currentMonth = useMemo(() => currentDate.format('MMMM'), [currentDate])
  const currentYear = useMemo(() => currentDate.format('YYYY'), [currentDate])
  const currentQuarter = useMemo(
    () => `Q${Math.ceil((currentDate.month() + 1) / 3)} ${currentYear}`,
    [currentDate, currentYear]
  )

  // Get selected department name from ID
  const selectedDepartmentName = useMemo(() => {
    if (!currentFilters.department) {
      return t('pvr-filter-all')
    }
    const dept = filterData.organizationalUnits.find(ou => ou.id === currentFilters.department)
    return dept?.name || currentFilters.department
  }, [currentFilters.department, filterData.organizationalUnits, t])

  // Combine catalog data with financial values
  const categories = useMemo(() => {
    return expenseRequestType?.map(category => {
      const categoryStat = categoryStats?.find(stat => stat.id === category.id)
      const previousPeriodAmount = categoryStat?.previousPeriodAmount || 0
      const currentPeriodAmount = categoryStat?.currentPeriodAmount || 0
      const variance = Number((categoryStat?.variance || 0).toFixed(2))

      const translatedName = getExpenseGroupPluralName(category.code || category.value, t)

      return {
        id: category.id,
        name: translatedName || category.value,
        code: category.code || category.id,
        currentPeriodAmount,
        previousPeriodAmount,
        variance
      }
    })
  }, [expenseRequestType, categoryStats])

  // Calculate breakdown totals
  const breakdownTotals = useMemo(() => {
    const prev = categories?.reduce((sum, cat) => sum + cat.previousPeriodAmount, 0) || 0
    const curr = categories?.reduce((sum, cat) => sum + cat.currentPeriodAmount, 0) || 0
    return { prev, curr }
  }, [categories])

  // Chart data
  const chartData = useMemo(() => {
    if ((selectedPeriod === 'year' || selectedPeriod === 'quarter') && periodStats?.monthlyData) {
      return periodStats.monthlyData.map(item => ({
        month: item.month,
        a_planned: item.expensePlanTotal,
        b_actual: item.expenseRequestTotal
      }))
    } else if (periodStats) {
      return [
        {
          month: dayjs().format('MMM'),
          a_planned: periodStats.expensePlanTotal,
          b_actual: periodStats.expenseRequestTotal
        }
      ]
    }
    return []
  }, [selectedPeriod, periodStats])

  const kpiCardInputs = {
    selectedPeriod,
    currentMonth,
    currentQuarter,
    currentYear,
    selectedCurrencyCode,
    totalExpensePlan,
    totalExpenseRequest,
    overBudgetCount,
    overduePlansCount,
    loadingCategoryStats,
    loadingOverduePlans,
    formatCurrency
  }

  // Generate KPI cards
  const kpiCards = usePlanVsRequestKpiCards(kpiCardInputs)

  if (isLoading && !hasLoadedOnce) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-6 gba:relative" data-testid="expense-plan-vs-request">
      {isLoading && hasLoadedOnce && (
        <div
          className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-background/60"
          data-testid="plan-vs-request-loading-overlay"
        >
          <Spinner size="md" />
        </div>
      )}
      <ExpenseFilterBar
        accessToken={accessToken}
        onFiltersChange={handleFiltersChange}
        currentFilters={currentFilters}
        filterData={filterData}
        data-testid="plan-vs-request-filter-bar"
      />

      <div data-testid="summary-cards">
        <SectionKpiCards cards={kpiCards} />
      </div>

      <div
        className="gba:text-sm gba:text-muted-foreground gba:bg-muted gba:p-3 gba:rounded-md gba:border gba:border-border gba:space-y-1"
        data-testid="plan-vs-request-active-filters"
      >
        <div>
          <span className="gba:font-medium">{t('pvr-period-label')}:</span> {selectedPeriod}
          {' · '}
          <span className="gba:font-medium">{t('header-currency')}:</span> {selectedCurrencyCode}
          {' · '}
          <span className="gba:font-medium">{t('header-department')}:</span> {selectedDepartmentName}
          {' · '}
          <span className="gba:font-medium">{t('pvr-last-updated')}:</span> {dayjs().format('YYYY-MM-DD HH:mm')}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground">{t('pvr-data-scope-note')}</div>
      </div>

      <PlanVsRequestChart chartData={chartData} selectedCurrencyCode={selectedCurrencyCode} />

      <PlanVsRequestCategoryTable
        categories={categories || []}
        breakdownTotals={breakdownTotals}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}

export default ExpensePlanVsRequest
