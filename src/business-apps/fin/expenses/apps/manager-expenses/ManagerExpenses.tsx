import React, { useEffect, useState, useCallback } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout } from '@newwork/nw-design-system'
import { PiGauge, PiPath, PiHandCoins, PiMoney, PiCalendarBlank, PiWalletDuotone } from 'react-icons/pi'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Import tab components
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab'
import ExpensePlansTab from './components/tabs/expense-plans-tab'
import AdvancePaymentsTab from './components/tabs/advance-payments-tab'
import ExpenseCalendarTab from './components/tabs/expense-calendar-tab'
import ExpenseRequestsTab from './components/tabs/expense-requests-tab'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Import page components
import { ApprovalsPage, ExpenseReportsPage } from './components/pages'
import TeamSpendingAnalyticsPage from './components/pages/TeamSpendingAnalyticsPage'

export interface ManagerExpensesProps extends BusinessAppContextProps {}

const ManagerExpenses: React.FC<ManagerExpensesProps> = props => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: PiGauge,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard')
    },
    {
      key: 'expense-plans',
      icon: PiPath,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
        'Expense Plans'
      )
    },
    {
      key: 'advance-payments',
      icon: PiHandCoins,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:backoffice_expense_landing_page.advance_title',
        'Advance Payments'
      )
    },
    {
      key: 'expense-requests',
      icon: PiMoney,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')
    },
    {
      key: 'expense-calendar',
      icon: PiCalendarBlank,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_calendar',
        'Expense Calendar'
      )
    }
  ]

  // State for current view/page
  const [currentView, setCurrentView] = useState<'tabs' | 'approvals' | 'reports' | 'analytics'>(() => {
    const urlParams = new URLSearchParams(globalThis.location?.search || '')
    const viewFromUrl = urlParams.get('view')
    const validViews = ['approvals', 'reports', 'analytics']

    if (validViews.includes(viewFromUrl ?? '')) {
      return viewFromUrl as 'approvals' | 'reports' | 'analytics'
    }
    return 'tabs'
  })

  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlParams = new URLSearchParams(globalThis.location?.search || '')
    const viewFromUrl = urlParams.get('view')

    // If we're on a different view (not tabs), don't touch the URL
    if (viewFromUrl && ['approvals', 'reports', 'analytics'].includes(viewFromUrl)) {
      return viewOptions[0].key // Return default without modifying URL
    }

    const tabFromUrl = urlParams.get('tab')
    const validTabs = viewOptions.map(item => item.key)

    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!
    }

    // Only set default tab in URL if we're in tabs view (no view parameter)
    const defaultTab = viewOptions[0].key
    if (!viewFromUrl) {
      const url = new URL(globalThis.location?.href || 'http://localhost')
      url.searchParams.set('tab', defaultTab)
      globalThis.history?.replaceState?.({}, '', url.toString())
    }
    return defaultTab
  })

  // Navigation handlers
  const handleNavigateToApprovals = useCallback(() => {
    setCurrentView('approvals')
    const url = new URL(globalThis.location?.href || 'http://localhost')
    url.searchParams.set('view', 'approvals')
    url.searchParams.delete('tab')
    globalThis.history?.pushState?.({}, '', url.toString())
  }, [])

  const handleNavigateToReports = useCallback(() => {
    setCurrentView('reports')
    const url = new URL(globalThis.location?.href || 'http://localhost')
    url.searchParams.set('view', 'reports')
    url.searchParams.delete('tab')
    globalThis.history?.pushState?.({}, '', url.toString())
  }, [])

  const handleNavigateToAnalytics = useCallback(() => {
    setCurrentView('analytics')
    const url = new URL(globalThis.location?.href || 'http://localhost')
    url.searchParams.set('view', 'analytics')
    url.searchParams.delete('tab')
    globalThis.history?.pushState?.({}, '', url.toString())
  }, [])

  const handleNavigateBackToDashboard = useCallback(() => {
    setCurrentView('tabs')
    setActiveTab('dashboard')
    const url = new URL(globalThis.location?.href || 'http://localhost')
    url.searchParams.delete('view')
    url.searchParams.set('tab', 'dashboard')
    globalThis.history?.pushState?.({}, '', url.toString())
  }, [])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    const url = new URL(globalThis.location?.href || 'http://localhost')
    url.searchParams.set('tab', tab)
    globalThis.history?.pushState?.({}, '', url.toString())
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.location?.search || '')

      // Check for view parameter
      const viewFromUrl = urlParams.get('view')
      const validViews = ['approvals', 'reports', 'analytics']
      if (validViews.includes(viewFromUrl ?? '')) {
        setCurrentView(viewFromUrl as 'approvals' | 'reports' | 'analytics')
      } else {
        setCurrentView('tabs')

        // If in tabs view, check for tab parameter
        const tabFromUrl = urlParams.get('tab')
        const validTabs = viewOptions.map(item => item.key)
        const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : viewOptions[0].key
        setActiveTab(newTab)
      }
    }

    globalThis.addEventListener?.('popstate', handlePopState)
    return () => globalThis.removeEventListener?.('popstate', handlePopState)
  }, [])

  // Create tab props for passing to tab components
  const tabProps = {
    ...props,
    onNavigateToApprovals: handleNavigateToApprovals,
    onNavigateToReports: handleNavigateToReports,
    onNavigateToAnalytics: handleNavigateToAnalytics
    // Currency is now managed globally via the store, no need to pass it explicitly
  }

  // Lazy-mount only the active tab to avoid duplicate data fetching
  const renderActiveTabOnly = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ExpenseDashboardTab
            {...tabProps}
            onNavigateToApprovals={handleNavigateToApprovals}
            onNavigateToReports={handleNavigateToReports}
            onNavigateToAnalytics={handleNavigateToAnalytics}
          />
        )
      case 'expense-plans':
        return <ExpensePlansTab {...tabProps} />
      case 'advance-payments':
        return <AdvancePaymentsTab {...tabProps} />
      case 'expense-requests':
        return <ExpenseRequestsTab {...tabProps} />
      case 'expense-calendar':
        return <ExpenseCalendarTab {...tabProps} />
      default:
        return <ExpenseDashboardTab {...tabProps} />
    }
  }

  // Render based on current view
  if (currentView === 'approvals') {
    return <ApprovalsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />
  }

  if (currentView === 'reports') {
    return <ExpenseReportsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />
  }

  if (currentView === 'analytics') {
    return <TeamSpendingAnalyticsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />
  }

  // Default tabs view
  return (
    <div data-testid="manager-expenses-container">
      <PageLayout
        headerIcon={PiWalletDuotone}
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.team_expenses_title',
          'Team Expenses'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.team_expenses_subheader',
          'Manage team expenses, track expense plans, advance payments, and expense requests'
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label
          }))
        }}
        className="gba:min-h-screen"
      >
        {renderActiveTabOnly()}
      </PageLayout>
    </div>
  )
}

export default ManagerExpenses
