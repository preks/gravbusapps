/**
 * Expense Management Overview Screen
 *
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState, useEffect } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { GaugeIcon, MoneyIcon, HandCoinsIcon, WalletIcon } from '@phosphor-icons/react'
import { PiChartBar } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab/ExpenseDashboardTab'
import ExpenseRequestTab from './components/tabs/expence-requests-tab/ExpenseRequestTab'
import AdvancePaymentTab from './components/tabs/advance-payments-tab/AdvancePaymentTab'
import PlanVsRequestTab from './components/tabs/plan-vs-request-tab/PlanVsRequestTab'

import { MODULE_COLORS } from '@/common/constants/ui'

const moduleColor = MODULE_COLORS.FIN

const BackofficeExpenses: React.FC<BusinessAppContextProps> = props => {
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
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    const validTabs = viewOptions.map(item => item.key)

    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!
    } else {
      const defaultTab = viewOptions[0].key
      const url = new URL(window.location.href)
      url.searchParams.set('tab', defaultTab)
      window.history.replaceState({}, '', url.toString())
      return defaultTab
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // ⚡ PERFORMANCE: Lazy tab mounting - only mount tabs once visited
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set([getInitialTab()]))

  // ⚡ CRITICAL: Don't render until accessToken is valid (prevents 401 errors)
  // Must be AFTER all hooks to comply with Rules of Hooks
  // Dashboard tab is always mounted and calls hooks immediately
  // useGraphqlClient is called on EVERY render and sets token on singleton
  if (!props.accessToken || typeof props.accessToken !== 'string' || props.accessToken.length < 100) {
    return null // Return null to prevent ANY rendering
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    // Mount the new tab if not already mounted
    setMountedTabs(prev => new Set([...prev, key]))
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.pushState({}, '', url.toString())
  }

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabFromUrl = urlParams.get('tab')
      const validTabs = viewOptions.map(item => item.key)
      const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : viewOptions[0].key
      setActiveTab(newTab)
      // Mount the tab if not already mounted (for browser back/forward)
      setMountedTabs(prev => new Set([...prev, newTab]))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
