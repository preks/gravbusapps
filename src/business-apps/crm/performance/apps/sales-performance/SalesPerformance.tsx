import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { PiChartLine } from 'react-icons/pi'
import { BarChartOutlined, TeamOutlined, UserOutlined, LineChartOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { OverviewView, TeamsView, EmployeesView } from './views'
import { AnalyticsView } from '@/business-apps/crm/core/apps/customer-relations/views/analytics-view/AnalyticsView'

type SalesPerformanceProps = BusinessAppContextProps

type TabKey = 'overview' | 'teams' | 'employees' | 'analytics'

const DATA_TEST_ID_PREFIX = 'sales-performance'
const VALID_TABS: TabKey[] = ['overview', 'teams', 'employees', 'analytics']

/**
 * Get the initial view from URL parameters
 */
const getInitialView = (): TabKey => {
  const urlParams = new URLSearchParams(window.location.search)
  const viewFromUrl = urlParams.get('view')

  if (viewFromUrl && VALID_TABS.includes(viewFromUrl as TabKey)) {
    return viewFromUrl as TabKey
  }

  return 'overview'
}

/**
 * Get the initial employee ID from URL parameters (for employees view)
 */
const getInitialEmployeeId = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('employeeId')
}

/**
 * Sales Performance App
 * Provides sales performance analytics with views for:
 * - Overview: KPIs, Revenue Trends, Top Performers, Top Teams
 * - Teams: Team comparison with revenue trends chart
 * - Employees: Employee list with individual performance views
 */
export const SalesPerformance: React.FC<SalesPerformanceProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialView)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(getInitialEmployeeId)

  // Lift team selection state to parent level to persist across tab switches
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [activeTeamIds, setActiveTeamIds] = useState<Set<string>>(new Set())

  // Get user's team ID for auto-selection
  const userTeamId = userInfo?.employeeDetails?.organizationalUnit?.id

  /**
   * Update URL with current view state
   */
  const updateUrl = useCallback((view: TabKey, employeeId?: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)

    // Always set the view parameter
    urlParams.set('view', view)

    // Handle employeeId parameter for employees view
    if (view === 'employees' && employeeId) {
      urlParams.set('employeeId', employeeId)
    } else {
      // Clear employeeId when not viewing an employee
      if (urlParams.has('employeeId')) {
        urlParams.delete('employeeId')
      }
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  /**
   * Handle tab changes and update URL
   */
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as TabKey
      if (!newTab || newTab === activeTab) {
        return
      }

      setActiveTab(newTab)

      // Clear employee selection when switching away from employees tab
      if (newTab !== 'employees') {
        setSelectedEmployeeId(null)
      }

      // Update URL - include employeeId only if switching to employees and one is selected
      updateUrl(newTab, newTab === 'employees' ? selectedEmployeeId : null)
    },
    [activeTab, selectedEmployeeId, updateUrl]
  )

  /**
   * Handle employee selection in the Employees view
   */
  const handleEmployeeSelect = useCallback(
    (employeeId: string | null) => {
      setSelectedEmployeeId(employeeId)
      updateUrl('employees', employeeId)
    },
    [updateUrl]
  )

  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)

      if (newView === 'employees') {
        const newEmployeeId = getInitialEmployeeId()
        setSelectedEmployeeId(newEmployeeId)
      } else {
        setSelectedEmployeeId(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  /**
   * Set initial URL on mount if not present
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab, activeTab === 'employees' ? selectedEmployeeId : null)
    }
  }, [activeTab, selectedEmployeeId, updateUrl])

  const tabs = useMemo(
    () => [
      {
        key: 'overview' as const,
        label: 'Overview',
        icon: <BarChartOutlined className="gba:mr-2" />,
        content: <OverviewView accessToken={accessToken} userInfo={userInfo} />
      },
      {
        key: 'teams' as const,
        label: 'Teams',
        icon: <TeamOutlined className="gba:mr-2" />,
        content: (
          <TeamsView
            accessToken={accessToken}
            userInfo={userInfo}
            selectedTeamIds={selectedTeamIds}
            onTeamSelectionChange={setSelectedTeamIds}
            activeTeamIds={activeTeamIds}
            onActiveTeamIdsChange={setActiveTeamIds}
            userTeamId={userTeamId}
          />
        )
      },
      {
        key: 'employees' as const,
        label: 'Employees',
        icon: <UserOutlined className="gba:mr-2" />,
        content: (
          <EmployeesView
            accessToken={accessToken}
            userInfo={userInfo}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={handleEmployeeSelect}
          />
        )
      },
      {
        key: 'analytics' as const,
        label: 'Analytics',
        icon: <LineChartOutlined className="gba:mr-2" />,
        content: <AnalyticsView accessToken={accessToken} userInfo={userInfo} moduleColor="crm" />
      }
    ],
    [accessToken, userInfo, selectedTeamIds, activeTeamIds, userTeamId, selectedEmployeeId, handleEmployeeSelect]
  )

  return (
    <div data-testid={DATA_TEST_ID_PREFIX}>
      <PageLayout
        headerIcon={PiChartLine}
        headerTitle="Sales Performance"
        headerDescription="Analyze sales performance, revenue trends, and top performers"
        variant={MODULE_COLORS.CRM}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto gba:p-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="gba:h-full"
            data-testid={`${DATA_TEST_ID_PREFIX}-tabs`}
          >
            <TabsList className="gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-tabs-list`}>
              {tabs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} data-testid={`${DATA_TEST_ID_PREFIX}-tab-${tab.key}`}>
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(tab => (
              <TabsContent key={tab.key} value={tab.key} className="gba:h-full gba:overflow-auto">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PageLayout>
    </div>
  )
}

export default SalesPerformance
