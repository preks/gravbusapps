import React, { useEffect, useState, useCallback, useMemo } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout } from '@newwork/nw-design-system'
import { GaugeIcon, PathIcon, HandCoinsIcon, MoneyIcon, CalendarBlankIcon, WalletIcon } from '@phosphor-icons/react'
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

const MANAGER_VIEW_KEYS = ['tabs', 'approvals', 'reports', 'analytics'] as const
type ManagerView = (typeof MANAGER_VIEW_KEYS)[number]
const isValidView = (value?: string | null): value is ManagerView =>
  Boolean(value && (MANAGER_VIEW_KEYS as readonly string[]).includes(value))

const MANAGER_TAB_KEYS = [
  'dashboard',
  'expense-plans',
  'advance-payments',
  'expense-requests',
  'expense-calendar'
] as const
type ManagerTabKey = (typeof MANAGER_TAB_KEYS)[number]
const isValidTab = (value?: string | null): value is ManagerTabKey =>
  Boolean(value && (MANAGER_TAB_KEYS as readonly string[]).includes(value))

const getViewFromUrl = (): ManagerView => {
  if (typeof window === 'undefined') {
    return 'tabs'
  }
  const params = new URLSearchParams(window.location.search)
  const viewFromUrl = params.get('view')
  return isValidView(viewFromUrl) && viewFromUrl !== 'tabs' ? viewFromUrl : 'tabs'
}

const getTabFromUrl = (): ManagerTabKey => {
  if (typeof window === 'undefined') {
    return MANAGER_TAB_KEYS[0]
  }
  const params = new URLSearchParams(window.location.search)
  const tabFromUrl = params.get('tab')
  return isValidTab(tabFromUrl) ? tabFromUrl : MANAGER_TAB_KEYS[0]
}

export type ManagerExpensesProps = BusinessAppContextProps

const ManagerExpenses: React.FC<ManagerExpensesProps> = props => {
  const viewOptions = useMemo(
    () => [
      {
        key: 'dashboard',
        icon: GaugeIcon,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.dashboard_btn',
          'Dashboard'
        )
      },
      {
        key: 'expense-plans',
        icon: PathIcon,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
          'Expense Plans'
        )
      },
      {
        key: 'advance-payments',
        icon: HandCoinsIcon,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expense_landing_page.advance_title',
          'Advance Payments'
        )
      },
      {
        key: 'expense-requests',
        icon: MoneyIcon,
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')
      },
      {
        key: 'expense-calendar',
        icon: CalendarBlankIcon,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.expense_calendar',
          'Expense Calendar'
        )
      }
    ],
    []
  )

  const hostViewParam = typeof props.additionalData?.view === 'string' ? props.additionalData.view : undefined
  const contextView = isValidView(hostViewParam) ? hostViewParam : null
  const hostTabParam = typeof props.additionalData?.tab === 'string' ? props.additionalData.tab : undefined
  const contextTab = isValidTab(hostTabParam) ? hostTabParam : null

  const getInitialTab = () => {
    if (contextView && contextView !== 'tabs') {
      return MANAGER_TAB_KEYS[0]
    }
    if (contextTab) {
      return contextTab
    }
    const viewFromUrl = getViewFromUrl()
    if (viewFromUrl !== 'tabs') {
      return MANAGER_TAB_KEYS[0]
    }
    const urlTab = getTabFromUrl()
    if (urlTab) {
      return urlTab
    }
    return MANAGER_TAB_KEYS[0]
  }

  // State for current view/page
  const [currentView, setCurrentView] = useState<ManagerView>(() => contextView ?? getViewFromUrl())

  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState<ManagerTabKey>(getInitialTab)

  const updateUrl = useCallback((view: ManagerView, tab?: ManagerTabKey, mode: 'push' | 'replace' = 'replace') => {
    if (typeof window === 'undefined') {
      return
    }
    const url = new URL(window.location.href)
    const currentViewParam = url.searchParams.get('view')
    const currentTabParam = url.searchParams.get('tab')
    let changed = false

    if (view === 'tabs') {
      if (currentViewParam) {
        url.searchParams.delete('view')
        changed = true
      }
      if (tab) {
        if (currentTabParam !== tab) {
          url.searchParams.set('tab', tab)
          changed = true
        }
      } else if (currentTabParam) {
        url.searchParams.delete('tab')
        changed = true
      }
    } else {
      if (currentViewParam !== view) {
        url.searchParams.set('view', view)
        changed = true
      }
      if (currentTabParam) {
        url.searchParams.delete('tab')
        changed = true
      }
    }

    if (!changed) {
      return
    }

    const historyMethod = mode === 'push' ? window.history.pushState : window.history.replaceState
    historyMethod.call(window.history, {}, '', url.toString())
  }, [])

  // Navigation handlers
  const handleNavigateToApprovals = useCallback(() => {
    setCurrentView('approvals')
    updateUrl('approvals', undefined, 'push')
  }, [updateUrl])

  const handleNavigateToReports = useCallback(() => {
    setCurrentView('reports')
    updateUrl('reports', undefined, 'push')
  }, [updateUrl])

  const handleNavigateToAnalytics = useCallback(() => {
    setCurrentView('analytics')
    updateUrl('analytics', undefined, 'push')
  }, [updateUrl])

  const handleNavigateBackToDashboard = useCallback(() => {
    setCurrentView('tabs')
    setActiveTab('dashboard')
    updateUrl('tabs', 'dashboard', 'push')
  }, [updateUrl])

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!isValidTab(tab) || tab === activeTab) {
        return
      }
      setActiveTab(tab)
      setCurrentView('tabs')
      updateUrl('tabs', tab as ManagerTabKey, 'push')
    },
    [activeTab, updateUrl]
  )

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const nextView = getViewFromUrl()
      setCurrentView(nextView)
      if (nextView === 'tabs') {
        setActiveTab(getTabFromUrl())
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Keep URL synchronized with current state
  useEffect(() => {
    if (currentView === 'tabs') {
      updateUrl('tabs', activeTab, 'replace')
    } else {
      updateUrl(currentView, undefined, 'replace')
    }
  }, [currentView, activeTab, updateUrl])

  // React to external view changes
  useEffect(() => {
    if (!contextView) {
      return
    }

    if (contextView === 'tabs') {
      setCurrentView('tabs')
      setActiveTab(previous => {
        const nextTab = contextTab && contextTab !== previous ? contextTab : previous
        updateUrl('tabs', nextTab)
        return nextTab
      })
    } else {
      setCurrentView(contextView)
      updateUrl(contextView)
    }
  }, [contextView, contextTab, updateUrl])

  // React to external tab changes when host only controls tabs
  useEffect(() => {
    if (!contextTab || contextView) {
      return
    }
    setActiveTab(previous => {
      if (previous === contextTab) {
        return previous
      }
      updateUrl('tabs', contextTab)
      return contextTab
    })
  }, [contextTab, contextView, updateUrl])

  // Memoize tab props so tab children don't re-render when parent re-renders with unchanged props
  const tabProps = useMemo(
    () => ({
      ...props,
      onNavigateToApprovals: handleNavigateToApprovals,
      onNavigateToReports: handleNavigateToReports,
      onNavigateToAnalytics: handleNavigateToAnalytics
    }),
    [props, handleNavigateToApprovals, handleNavigateToReports, handleNavigateToAnalytics]
  )

  // Memoize tab content by activeTab and tabProps to avoid unstable JSX on each render
  const tabContent = useMemo(() => {
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
  }, [activeTab, tabProps, handleNavigateToApprovals, handleNavigateToReports, handleNavigateToAnalytics])

  const headerSubViewItems = useMemo(
    () => viewOptions.map(option => ({ value: option.key, label: option.label })),
    [viewOptions]
  )

  const headerSubViews = useMemo(
    () => ({
      value: activeTab,
      onValueChange: handleTabChange,
      items: headerSubViewItems
    }),
    [activeTab, handleTabChange, headerSubViewItems]
  )

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
        headerIcon={WalletIcon as any}
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.team_expenses_title',
          'Team Expenses'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.team_expenses_subheader',
          'Manage team expenses, track expense plans, advance payments, and expense requests'
        )}
        headerSubViews={headerSubViews}
        className="gba:min-h-screen"
      >
        {tabContent}
      </PageLayout>
    </div>
  )
}

export default ManagerExpenses
