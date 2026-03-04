/**
 * Expense Management Overview Screen
 *
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { GaugeIcon, MoneyIcon, HandCoinsIcon, WalletIcon } from '@phosphor-icons/react'
import { ChartBarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab/ExpenseDashboardTab'
import ExpenseRequestTab from './components/tabs/expence-requests-tab/ExpenseRequestTab'
import AdvancePaymentTab from './components/tabs/advance-payments-tab/AdvancePaymentTab'
import PlanVsRequestTab from './components/tabs/plan-vs-request-tab/PlanVsRequestTab'

import { MODULE_COLORS } from '@/common/constants/ui'

const moduleColor = MODULE_COLORS.FIN
const BACKOFFICE_TAB_KEYS = ['dashboard', 'expense-requests', 'advance-payments', 'plan-vs-request'] as const
type BackofficeTabKey = (typeof BACKOFFICE_TAB_KEYS)[number]

const isValidBackofficeTab = (value?: string | null): value is BackofficeTabKey =>
  Boolean(value && (BACKOFFICE_TAB_KEYS as readonly string[]).includes(value))

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
      icon: <ChartBarIcon className="gba:w-5 gba:h-5" />,
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

  const [activeTab, setActiveTab] = useState<BackofficeTabKey>(initialTabRef.current)

  // ⚡ PERFORMANCE: Lazy tab mounting - only mount tabs once visited
  const [mountedTabs, setMountedTabs] = useState<Set<BackofficeTabKey>>(
    () => new Set<BackofficeTabKey>([initialTabRef.current!])
  )

  const updateUrl = useCallback((tab: BackofficeTabKey, mode: 'push' | 'replace' = 'replace') => {
    if (typeof window === 'undefined') {
      return
    }
    const url = new URL(window.location.href)
    const current = url.searchParams.get('tab')
    if (current === tab) {
      return
    }
    url.searchParams.set('tab', tab)
    const historyMethod = mode === 'push' ? window.history.pushState : window.history.replaceState
    historyMethod.call(window.history, {}, '', url.toString())
  }, [])

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
      updateUrl(key, 'push')
    },
    [activeTab, updateUrl]
  )

  useEffect(() => {
    const handlePopState = () => {
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

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (!params.has('tab')) {
      updateUrl(activeTab, 'replace')
    }
  }, [activeTab, updateUrl])

  useEffect(() => {
    if (!contextTab) {
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
      updateUrl(contextTab)
      return contextTab
    })
  }, [contextTab, updateUrl])

  const tabProps = {
    ...props,
    moduleColor: moduleColor
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
