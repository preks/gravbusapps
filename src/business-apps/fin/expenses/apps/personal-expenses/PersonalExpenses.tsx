import React, { useState, useEffect, ReactNode, useCallback } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { WalletIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import personalTranslations from './_i18n'

const moduleColor = MODULE_COLORS.FIN
// Create a global API for tab navigation

interface TabNavigationState {
  setActiveTab: (tabKey: string) => void
  filter?: string
}

// Declare variable in global window object
declare global {
  interface Window {
    tabNavigationAPI?: TabNavigationState
  }
}

const PERSONAL_EXPENSE_TAB_KEYS = [
  'dashboard',
  'expense-items',
  'expense-plans',
  'advance-payments',
  'expense-requests',
  'calendar'
] as const

type PersonalExpensesTabKey = (typeof PERSONAL_EXPENSE_TAB_KEYS)[number]

const isValidTab = (value?: string | null): value is PersonalExpensesTabKey => {
  return Boolean(value && (PERSONAL_EXPENSE_TAB_KEYS as readonly string[]).includes(value))
}

const getTabFromUrl = (): PersonalExpensesTabKey | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const urlParams = new URLSearchParams(window.location.search)
  const tabFromUrl = urlParams.get('tab')
  return isValidTab(tabFromUrl) ? tabFromUrl : null
}

// Import tab components (placeholders for now, will be created next)
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab'
import ExpenseItemsTab from './components/tabs/expense-items-tab'
import ExpensePlansTab from './components/tabs/expense-plans-tab'
import AdvancePaymentsTab from './components/tabs/advance-payments-tab'
import ExpenseRequestsTab from './components/tabs/expense-requests-tab'
import ExpenseCalendarTab from './components/tabs/expense-calendar-tab'

export type PersonalExpensesProps = BusinessAppContextProps

const PersonalExpenses: React.FC<PersonalExpensesProps> = props => {
  const { t } = useTranslation(personalTranslations)
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null)
  const hostTabParam = typeof props.additionalData?.tab === 'string' ? props.additionalData.tab : undefined
  const contextTab = isValidTab(hostTabParam) ? hostTabParam : null

  // Get tab from URL query parameter or use first tab as default
  const getInitialTab = () => {
    if (contextTab) {
      return contextTab
    }
    const urlTab = getTabFromUrl()
    if (urlTab) {
      return urlTab
    }
    const defaultTab = PERSONAL_EXPENSE_TAB_KEYS[0]
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('tab') !== defaultTab) {
        url.searchParams.set('tab', defaultTab)
        window.history.replaceState({}, '', url.toString())
      }
    }
    return defaultTab
  }

  const [activeTab, setActiveTab] = useState<PersonalExpensesTabKey>(getInitialTab)

  const updateUrl = useCallback((tab: PersonalExpensesTabKey, mode: 'push' | 'replace' = 'replace') => {
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

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (key: string) => {
      if (!isValidTab(key) || key === activeTab) {
        return
      }
      setActiveTab(key)
      updateUrl(key, 'push')
    },
    [activeTab, updateUrl]
  )

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tabFromUrl = getTabFromUrl()
      setActiveTab(tabFromUrl ?? PERSONAL_EXPENSE_TAB_KEYS[0])
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab, 'replace')
    }
  }, [activeTab, updateUrl])

  // Sync with external context updates
  useEffect(() => {
    if (!contextTab) {
      return
    }
    setActiveTab(previous => {
      if (previous === contextTab) {
        return previous
      }
      updateUrl(contextTab)
      return contextTab
    })
  }, [contextTab, updateUrl])

  // Expose the tab navigation API to the global window object
  useEffect(() => {
    window.tabNavigationAPI = {
      setActiveTab: (tabKey: string) => {
        console.log('Global API: Switching to tab', tabKey)
        handleTabChange(tabKey)
      },
      filter: undefined
    }

    return () => {
      window.tabNavigationAPI = undefined
    }
  }, [handleTabChange])

  // Clear header when switching to tabs that should not display it
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'calendar') {
      if (contentHeader) {
        setContentHeader(null)
      }
    }
  }, [activeTab])

  // no-op removed: onContentHeaderChange is passed only when tab is active

  return (
    <div data-testid="personal-expenses-container">
      <PageLayout
        headerIcon={WalletIcon}
        headerTitle={t('personal-shell-title')}
        headerDescription={t('personal-shell-description')}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: [
            {
              value: 'dashboard',
              label: t('personal-shell-tab-dashboard')
            },
            {
              value: 'expense-items',
              label: t('personal-shell-tab-expense-items')
            },
            {
              value: 'expense-plans',
              label: t('personal-shell-tab-expense-plans')
            },
            {
              value: 'advance-payments',
              label: t('personal-shell-tab-advance-payments')
            },
            {
              value: 'expense-requests',
              label: t('personal-shell-tab-expense-requests')
            },
            { value: 'calendar', label: t('personal-shell-tab-calendar') }
          ]
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {/* Render content header (statistics/widget cards) if available */}
        {contentHeader && (
          <div className="gba:mb-6" data-testid="content-header">
            {contentHeader}
          </div>
        )}

        {/* Render only the active tab to avoid loading all queries at once */}
        <div data-testid="tabs-container">
          {activeTab === 'dashboard' && (
            <div data-testid="tab-dashboard">
              <ExpenseDashboardTab {...props} />
            </div>
          )}

          {activeTab === 'expense-items' && (
            <div data-testid="tab-expense-items">
              <ExpenseItemsTab {...props} onContentHeaderChange={setContentHeader} />
            </div>
          )}

          {activeTab === 'expense-plans' && (
            <div data-testid="tab-expense-plans">
              <ExpensePlansTab {...props} onContentHeaderChange={setContentHeader} />
            </div>
          )}

          {activeTab === 'advance-payments' && (
            <div data-testid="tab-advance-payments">
              <AdvancePaymentsTab {...props} onContentHeaderChange={setContentHeader} />
            </div>
          )}

          {activeTab === 'expense-requests' && (
            <div data-testid="tab-expense-requests">
              <ExpenseRequestsTab {...props} onContentHeaderChange={setContentHeader} />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div data-testid="tab-calendar">
              <ExpenseCalendarTab {...props} />
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  )
}

export default PersonalExpenses
