import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ChartLineIcon, ChartBarIcon, UsersThreeIcon, UserIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { OverviewView, TeamsView, EmployeesView } from './views'
import { useCurrencies } from './hooks'
import { AnalyticsView } from '@/business-apps/crm/core/apps/customer-relations/views/analytics-view/AnalyticsView'

type SalesPerformanceProps = BusinessAppContextProps

type TabKey = 'overview' | 'teams' | 'employees' | 'analytics'

const DATA_TEST_ID_PREFIX = 'sales-performance'
const VALID_TABS: TabKey[] = ['overview', 'teams', 'employees', 'analytics']

const getInitialView = (): TabKey => {
  const urlParams = new URLSearchParams(window.location.search)
  const viewFromUrl = urlParams.get('view')

  if (viewFromUrl && VALID_TABS.includes(viewFromUrl as TabKey)) {
    return viewFromUrl as TabKey
  }

  return 'overview'
}

const getInitialEmployeeId = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('employeeId')
}

/**
 * Sales Performance App
 * Provides sales performance analytics with views for:
 * - Overview: KPIs, Revenue Trends, Top Performers, Top Teams
 * - Teams: Team comparison and all-teams list with drill-down
 * - Employees: Employee comparison and employee insights list with drill-down
 */
export const SalesPerformance: React.FC<SalesPerformanceProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialView)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(getInitialEmployeeId)

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [activeTeamIds, setActiveTeamIds] = useState<Set<string>>(new Set())
  const [selectedComparisonEmployeeIds, setSelectedComparisonEmployeeIds] = useState<string[]>([])
  const [activeComparisonEmployeeIds, setActiveComparisonEmployeeIds] = useState<Set<string>>(new Set())

  const userTeamId = userInfo?.employeeDetails?.organizationalUnit?.id

  // Opportunity currencies are global (same across every tab), so fetch them once here
  // and pass them down. This avoids re-running GetOpportunityCurrencies on each tab switch.
  const { currencies, isLoading: currenciesLoading } = useCurrencies(accessToken)

  const updateUrl = useCallback((view: TabKey, employeeId?: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)

    urlParams.set('view', view)

    if (view === 'employees' && employeeId) {
      urlParams.set('employeeId', employeeId)
    } else if (urlParams.has('employeeId')) {
      urlParams.delete('employeeId')
    }

    if (view !== 'teams') {
      urlParams.delete('teamId')
      urlParams.delete('teamsTab')
      urlParams.delete('teamView')
    }

    if (view !== 'employees') {
      urlParams.delete('employeesTab')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as TabKey
      if (!newTab || newTab === activeTab) {
        return
      }

      setActiveTab(newTab)

      if (newTab !== 'employees') {
        setSelectedEmployeeId(null)
      }

      updateUrl(newTab, newTab === 'employees' ? selectedEmployeeId : null)
    },
    [activeTab, selectedEmployeeId, updateUrl]
  )

  const handleEmployeeSelect = useCallback(
    (employeeId: string | null) => {
      setSelectedEmployeeId(employeeId)
      updateUrl('employees', employeeId)
    },
    [updateUrl]
  )

  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)

      if (newView === 'employees') {
        setSelectedEmployeeId(getInitialEmployeeId())
      } else {
        setSelectedEmployeeId(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab, activeTab === 'employees' ? selectedEmployeeId : null)
    }
  }, [activeTab, selectedEmployeeId, updateUrl])

  const viewOptions = useMemo(
    () => [
      {
        key: 'overview',
        label: 'Overview',
        icon: <ChartBarIcon />
      },
      {
        key: 'teams',
        label: 'Teams',
        icon: <UsersThreeIcon />
      },
      {
        key: 'employees',
        label: 'Employees',
        icon: <UserIcon />
      },
      {
        key: 'analytics',
        label: 'Analytics',
        icon: <ChartLineIcon />
      }
    ],
    []
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-overview-content`}>
            <OverviewView
              accessToken={accessToken}
              userInfo={userInfo}
              currencies={currencies}
              currenciesLoading={currenciesLoading}
            />
          </div>
        )
      case 'teams':
        return (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-teams-content`}>
            <TeamsView
              accessToken={accessToken}
              userInfo={userInfo}
              currencies={currencies}
              currenciesLoading={currenciesLoading}
              selectedTeamIds={selectedTeamIds}
              onTeamSelectionChange={setSelectedTeamIds}
              activeTeamIds={activeTeamIds}
              onActiveTeamIdsChange={setActiveTeamIds}
              userTeamId={userTeamId}
            />
          </div>
        )
      case 'employees':
        return (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-employees-content`}>
            <EmployeesView
              accessToken={accessToken}
              userInfo={userInfo}
              currencies={currencies}
              currenciesLoading={currenciesLoading}
              selectedEmployeeId={selectedEmployeeId}
              onEmployeeSelect={handleEmployeeSelect}
              selectedComparisonEmployeeIds={selectedComparisonEmployeeIds}
              onComparisonEmployeeSelectionChange={setSelectedComparisonEmployeeIds}
              activeComparisonEmployeeIds={activeComparisonEmployeeIds}
              onActiveComparisonEmployeeIdsChange={setActiveComparisonEmployeeIds}
            />
          </div>
        )
      case 'analytics':
        return (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-analytics-content`}>
            <AnalyticsView accessToken={accessToken} userInfo={userInfo} moduleColor="crm" />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid={DATA_TEST_ID_PREFIX}>
      <PageLayout
        headerIcon={ChartLineIcon}
        headerTitle="Sales Performance"
        headerDescription="Analyze sales performance, revenue trends, and top performers"
        // Disable the default header back arrow (PageLayout falls back to window.history.back()).
        onBack={null as unknown as (() => void) | undefined}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={MODULE_COLORS.CRM}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default SalesPerformance
