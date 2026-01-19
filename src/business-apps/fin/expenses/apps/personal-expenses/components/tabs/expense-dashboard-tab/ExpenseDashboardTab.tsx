import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseDashboard } from '../../../hooks/useGetExpenseDashboard'
import { SpendingOverview, ActionFeed, QuickActionCards, PersonalExpenseFilterBar } from './components'
import SummaryStatistics from './components/SummaryStatistics'
// import { formatNumberFunction } from '@/common/utils/windowUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { PERIOD_TYPE } from '../../../constants/periodTypes'
import { useDebounce } from '@/common/hooks/useDebounce'

const ExpenseDashboardTab: React.FC<BusinessAppContextProps> = props => {
  const [filters, setFilters] = useState<{ currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }>({
    currency: undefined,
    period: 'quarterly'
  })
  const debouncedFilters = useDebounce(filters, 300)
  const { stats, isLoading, error, refetch } = useGetExpenseDashboard(props, debouncedFilters)
  const chartView = useMemo(() => {
    switch (filters.period) {
      case PERIOD_TYPE.YEARLY:
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.yearly', 'Yearly')
      case PERIOD_TYPE.QUARTERLY:
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.quarterly', 'Quarterly')
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.monthly', 'Monthly')
    }
  }, [filters.period])

  const extractCurrencyCode = (currencyRef?: string): string => {
    return currencyRef?.split(':').pop() || 'EUR'
  }
  const selectedCurrencyCode = extractCurrencyCode(filters.currency)

  // Handle widget clicks (navigate to items tab with CREATED filter and hide stats)
  const handleWidgetClick = useCallback((widgetKey: string) => {
    if (widgetKey === 'unallocated-expenses') {
      try {
        // Persist filter for items tab to pick up
        sessionStorage.setItem('expenseItemsFilter', 'created')
      } catch (err) {
        console.warn('Failed to persist expenseItemsFilter to sessionStorage', err)
      }
      const url = buildPlatformUrl('/platform/fin/expenses/unallocated-expense-items', {
        status: 'CREATED'
      })

      navigateTo(url)
      return
    }
  }, [])

  // percent change calc moved to SummaryStatistics

  return (
    <div className="gba:space-y-6 gba:w-full" data-testid="expense-dashboard-content">
      <PersonalExpenseFilterBar
        accessToken={props.accessToken}
        userInfo={props.userInfo}
        onFiltersChange={(f: { currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }) => setFilters(f)}
        currentFilters={filters}
        data-testid="personal-expense-dashboard-filter-bar"
      />
      <SummaryStatistics
        statistics={stats ?? undefined}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        period={filters.period}
        currencyCode={selectedCurrencyCode}
        onRetry={refetch}
        onWidgetClick={handleWidgetClick}
      />

      <div data-testid="quick-action-cards-section">
        <QuickActionCards {...props} />
      </div>

      <div data-testid="spending-overview-section">
        <SpendingOverview
          stats={stats ?? undefined}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          chartView={chartView}
          currencyCode={selectedCurrencyCode}
        />
      </div>

      <div data-testid="action-feed-section">
        <ActionFeed stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
      </div>
    </div>
  )
}

export default ExpenseDashboardTab
