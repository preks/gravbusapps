/**
 * Expense Management Overview Screen
 *
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { GaugeIcon, MoneyIcon, HandCoinsIcon, WalletIcon } from '@phosphor-icons/react'
import { PiChartBar } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab/ExpenseDashboardTab'
import ExpenseRequestTab from './components/tabs/expence-requests-tab/ExpenseRequestTab'
import AdvancePaymentTab from './components/tabs/advance-payments-tab/AdvancePaymentTab'
import PlanVsRequestTab from './components/tabs/plan-vs-request-tab/PlanVsRequestTab'
import BackofficeExpenseReportsPage from './components/pages/BackofficeExpenseReportsPage'
import BackofficeTeamSpendingAnalyticsPage from './components/pages/BackofficeTeamSpendingAnalyticsPage'

import { MODULE_COLORS } from '@/common/constants/ui'

const moduleColor = MODULE_COLORS.FIN
const BACKOFFICE_VIEW_KEYS = ['tabs', 'reports', 'analytics'] as const
type BackofficeView = (typeof BACKOFFICE_VIEW_KEYS)[number]
const isValidView = (value?: string | null): value is BackofficeView =>
  Boolean(value && (BACKOFFICE_VIEW_KEYS as readonly string[]).includes(value))

const BACKOFFICE_TAB_KEYS = ['dashboard', 'expense-requests', 'advance-payments', 'plan-vs-request'] as const
type BackofficeTabKey = (typeof BACKOFFICE_TAB_KEYS)[number]

const isValidBackofficeTab = (value?: string | null): value is BackofficeTabKey =>
  Boolean(value && (BACKOFFICE_TAB_KEYS as readonly string[]).includes(value))

const getViewFromUrl = (): BackofficeView => {
  if (typeof window === 'undefined') {
    return 'tabs'
  }
  const params = new URLSearchParams(window.location.search)
  const viewFromUrl = params.get('view')
  return isValidView(viewFromUrl) && viewFromUrl !== 'tabs' ? viewFromUrl : 'tabs'
}

const getTabFromUrl = (): BackofficeTabKey | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const params = new URLSearchParams(window.location.search)
  const tabFromUrl = params.get('tab')
  return isValidBackofficeTab(tabFromUrl) ? tabFromUrl : null
}

const BackofficeExpenses: React.FC<BusinessAppContextProps> = props => {
  const hostTabParam = typeof props.additionalData?.tab === 'string' ? props.additionalData.tab : undefined
  const contextTab = isValidBackofficeTab(hostTabParam) ? hostTabParam : null
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <GaugeIcon className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard')
    },
    {
      key: 'expense-requests',
      icon: <MoneyIcon className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')
    },
    {
      key: 'advance-payments',
      icon: <HandCoinsIcon className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:backoffice_expense_landing_page.advance_title',
        'Advance Payments'
      )
    },
    {
      key: 'plan-vs-request',
      icon: <PiChartBar className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.plan_vs_request',
        'Plan vs Request'
      )
    }
  ]

  const getInitialTab = () => {
    if (contextTab) {
      return contextTab
    }
    const tabFromUrl = getTabFromUrl()
    if (tabFromUrl) {
      return tabFromUrl
    }
    const defaultTab = BACKOFFICE_TAB_KEYS[0]
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('tab') !== defaultTab) {
        url.searchParams.set('tab', defaultTab)
        window.history.replaceState({}, '', url.toString())
      }
    }
    return defaultTab
  }

  const initialTabRef = useRef<BackofficeTabKey | null>(null)
  if (initialTabRef.current === null) {
    initialTabRef.current = getInitialTab()
  }

  const [currentView, setCurrentView] = useState<BackofficeView>(() => getViewFromUrl())
  const [activeTab, setActiveTab] = useState<BackofficeTabKey>(initialTabRef.current)

  // ⚡ PERFORMANCE: Lazy tab mounting - only mount tabs once visited
  const [mountedTabs, setMountedTabs] = useState<Set<BackofficeTabKey>>(
    () => new Set<BackofficeTabKey>([initialTabRef.current!])
  )

  const updateUrl = useCallback(
    (view: BackofficeView, tab?: BackofficeTabKey, mode: 'push' | 'replace' = 'replace') => {
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
    },
    []
  )

  // ⚡ CRITICAL: Don't render until accessToken is valid (prevents 401 errors)
  // Must be AFTER all hooks to comply with Rules of Hooks
  // Dashboard tab is always mounted and calls hooks immediately
  // useGraphqlClient is called on EVERY render and sets token on singleton
  if (!props.accessToken || typeof props.accessToken !== 'string' || props.accessToken.length < 100) {
    return null // Return null to prevent ANY rendering
  }

  const handleTabChange = useCallback(
    (key: string) => {
      if (!isValidBackofficeTab(key) || key === activeTab) {
        return
      }
      setActiveTab(key)
      setMountedTabs(prev => {
        if (prev.has(key)) {
          return prev
        }
        const next = new Set(prev)
        next.add(key)
        return next
      })
      setCurrentView('tabs')
      updateUrl('tabs', key, 'push')
    },
    [activeTab, updateUrl]
  )

  useEffect(() => {
    const handlePopState = () => {
      const nextView = getViewFromUrl()
      setCurrentView(nextView)
      if (nextView === 'tabs') {
        const newTab = getTabFromUrl() ?? BACKOFFICE_TAB_KEYS[0]
        setActiveTab(newTab)
        setMountedTabs(prev => {
          if (prev.has(newTab)) {
            return prev
          }
          const next = new Set(prev)
          next.add(newTab)
          return next
        })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (currentView === 'tabs' && !params.has('tab')) {
      updateUrl('tabs', activeTab, 'replace')
    }
    if (currentView !== 'tabs') {
      updateUrl(currentView, undefined, 'replace')
    }
  }, [activeTab, currentView, updateUrl])

  useEffect(() => {
    // Respect explicit deep links like ?view=reports / ?view=analytics.
    // Host-provided context tab should only drive state while we are in tabs view.
    if (!contextTab || currentView !== 'tabs') {
      return
    }
    setActiveTab(previous => {
      if (previous === contextTab) {
        return previous
      }
      setMountedTabs(prev => {
        if (prev.has(contextTab)) {
          return prev
        }
        const next = new Set(prev)
        next.add(contextTab)
        return next
      })
      setCurrentView('tabs')
      updateUrl('tabs', contextTab)
      return contextTab
    })
  }, [contextTab, currentView, updateUrl])

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
    setMountedTabs(prev => {
      if (prev.has('dashboard')) {
        return prev
      }
      const next = new Set(prev)
      next.add('dashboard')
      return next
    })
    updateUrl('tabs', 'dashboard', 'push')
  }, [updateUrl])

  const tabProps = {
    ...props,
    moduleColor: moduleColor,
    onNavigateToReports: handleNavigateToReports,
    onNavigateToAnalytics: handleNavigateToAnalytics
  }

  if (currentView === 'reports') {
    return <BackofficeExpenseReportsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />
  }

  if (currentView === 'analytics') {
    return <BackofficeTeamSpendingAnalyticsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />
  }

  return (
    <div data-testid="backoffice-expenses-container">
      <PageLayout
        headerIcon={WalletIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_table.expense_management_title',
          'Expense Management'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_table.expense_management_subheader',
          'Manage backoffice expenses, track expense requests, and advance payments'
        )}
        headerContent={
          <div
            id="expenses-header-filter"
            className="gba:flex gba:items-center gba:justify-start"
            data-testid="expenses-header-filter-slot"
          />
        }
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {/* ⚡ PERFORMANCE: Lazy mount tabs - only render once visited */}
        <div>
          {mountedTabs.has('dashboard') && (
            <div className={activeTab === 'dashboard' ? '' : 'gba:hidden'} data-testid="tab-panel-dashboard">
              <ExpenseDashboardTab {...tabProps} isActive={activeTab === 'dashboard'} />
            </div>
          )}
          {mountedTabs.has('expense-requests') && (
            <div
              className={activeTab === 'expense-requests' ? '' : 'gba:hidden'}
              data-testid="tab-panel-expense-requests"
            >
              <ExpenseRequestTab {...tabProps} isActive={activeTab === 'expense-requests'} />
            </div>
          )}
          {mountedTabs.has('advance-payments') && (
            <div
              className={activeTab === 'advance-payments' ? '' : 'gba:hidden'}
              data-testid="tab-panel-advance-payments"
            >
              <AdvancePaymentTab {...tabProps} isActive={activeTab === 'advance-payments'} />
            </div>
          )}
          {mountedTabs.has('plan-vs-request') && (
            <div
              className={activeTab === 'plan-vs-request' ? '' : 'gba:hidden'}
              data-testid="tab-panel-plan-vs-request"
            >
              <PlanVsRequestTab {...tabProps} isActive={activeTab === 'plan-vs-request'} />
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  )
}

export default BackofficeExpenses
