import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { PageLayout, Spinner } from '@newwork/nw-design-system'
import {
  ListBulletsIcon,
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  TargetIcon,
  HandshakeIcon,
  UserCircleIcon,
  ChartLineUpIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import { ActivityViewProps, ActivityViewFilter, ActivityTabType } from '../../types'
import { Activity360ListTab } from '../tabs/Activity360ListTab'
import { Activity360CalendarTab } from '../tabs/Activity360CalendarTab'
import { Activity360ComparisonTab } from '../tabs/Activity360ComparisonTab'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { MODULE_COLORS } from '@/common/constants/ui'

const DATA_TEST_ID_PREFIX = 'SalesActivity360-View'
const moduleColor = MODULE_COLORS.CRM

// Query to fetch employee data for header (using EmployeePosition like SalesMemberPerformance)
const GET_EMPLOYEE_HEADER = `
  query GetEmployeeHeader($employeeId: uuid!) {
    EmployeePosition(
      where: { 
        employeeId: { _eq: $employeeId }
      }
      limit: 1
    ) {
      id
      supervisor {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
        communication(where: { isDeleted: { _eq: false } }) {
          value
          channel { code value }
          type { value }
        }
      }
      jobPosition { name }
      organizationalUnit { name }
      siteLocation {
        country { value }
      }
    }
  }
`

// Get view config based on filter
const getViewConfig = (filter: ActivityViewFilter) => {
  switch (filter) {
    case 'all':
      return {
        category: 'ALL ACTIVITIES',
        icon: ListBulletsIcon,
        subtitle: 'Complete view of all activities across the organization'
      }
    case 'by-employee':
      return {
        category: 'EMPLOYEE ACTIVITIES',
        icon: UserIcon,
        subtitle: 'Individual employee performance and activities'
      }
    case 'by-account':
      return {
        category: 'ACCOUNT ACTIVITIES',
        icon: BuildingIcon,
        subtitle: 'Activities related to this account'
      }
    case 'by-contact':
      return {
        category: 'CONTACT ACTIVITIES',
        icon: UserCircleIcon,
        subtitle: 'Touchpoints with this contact'
      }
    case 'by-lead':
      return {
        category: 'LEAD ACTIVITIES',
        icon: TargetIcon,
        subtitle: 'Engagement activities for this lead'
      }
    case 'by-opportunity':
      return {
        category: 'OPPORTUNITY ACTIVITIES',
        icon: HandshakeIcon,
        subtitle: 'Opportunity-related activities'
      }
    case 'by-general':
      return {
        category: 'GENERAL ACTIVITIES',
        icon: ListBulletsIcon,
        subtitle: 'Activities not linked to any specific entity'
      }
    default:
      return {
        category: 'ACTIVITIES',
        icon: ChartLineUpIcon,
        subtitle: 'Sales activities'
      }
  }
}

// Employee header data interface
interface EmployeeHeaderData {
  displayName: string
  fullName: string
  jobPosition?: string
  businessUnit?: string
}

export const ActivityView: React.FC<ActivityViewProps> = ({ accessToken, userInfo, filter, entityId, entityName }) => {
  // Get initial tab from URL or default
  // Note: 'comparison' tab is only available for 'all' filter
  const getInitialTab = (): ActivityTabType => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const subViewFromUrl = urlParams.get('tab')
    if (subViewFromUrl === 'list' || subViewFromUrl === 'calendar') {
      return subViewFromUrl
    }
    // Comparison tab only allowed for 'all' filter
    if (subViewFromUrl === 'comparison' && filter === 'all') {
      return 'comparison'
    }
    return 'list'
  }

  const [activeTab, setActiveTab] = useState<ActivityTabType>(getInitialTab())
  const [employeeData, setEmployeeData] = useState<EmployeeHeaderData | null>(null)
  // Start loading true if we're viewing by-employee to prevent flash of no-avatar
  const [employeeLoading, setEmployeeLoading] = useState(filter === 'by-employee' && !!entityId)

  const config = getViewConfig(filter)
  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch employee data for header when viewing by-employee
  useEffect(() => {
    if (filter === 'by-employee' && entityId) {
      setEmployeeLoading(true)
      graphqlClient
        .request<{ EmployeePosition: any[] }>(GET_EMPLOYEE_HEADER, { employeeId: entityId })
        .then(result => {
          const position = result.EmployeePosition?.[0]
          if (position?.employee) {
            const emp = position.employee
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()

            setEmployeeData({
              displayName: emp.displayName || fullName || 'Unknown Employee',
              fullName: fullName || 'Unknown',
              jobPosition: position.jobPosition?.name,
              businessUnit: position.organizationalUnit?.name
            })
          }
        })
        .catch(err => {
          console.error('Failed to load employee data:', err)
        })
        .finally(() => {
          setEmployeeLoading(false)
        })
    } else {
      setEmployeeLoading(false)
    }
  }, [filter, entityId, graphqlClient])

  // Update URL when tab changes
  const updateUrl = useCallback((tab: string) => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    urlParams.set('tab', tab)
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${urlParams.toString()}`)
  }, [])

  // Handle tab change
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab as ActivityTabType)
      updateUrl(newTab)
    },
    [updateUrl]
  )

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab)
    }
  }, [activeTab, updateUrl])

  const headerDescription = useMemo(() => {
    if (filter === 'by-employee' && employeeData) {
      return [employeeData.jobPosition, employeeData.businessUnit].filter(Boolean).join(' • ') || config.subtitle
    }
    return config.subtitle
  }, [filter, employeeData, config])

  // Build tabs array - comparison tab only available for 'all' filter
  const tabItems = useMemo(() => {
    const items = [
      {
        value: 'list',
        label: getTranslationFromI18nKeyAndLabel('crm.salesActivity360.activityList', 'Activity List'),
        icon: <ListBulletsIcon className="gba:mr-2" />,
        content: (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-list-content`}>
            <Activity360ListTab accessToken={accessToken} userInfo={userInfo} filter={filter} entityId={entityId} />
          </div>
        )
      },
      {
        value: 'calendar',
        label: getTranslationFromI18nKeyAndLabel('crm.salesActivity360.activityCalendar', 'Activity Calendar'),
        icon: <CalendarIcon className="gba:mr-2" />,
        content: (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-calendar-content`}>
            <Activity360CalendarTab
              accessToken={accessToken}
              userInfo={userInfo}
              filter={filter}
              entityId={entityId}
              compact
            />
          </div>
        )
      }
    ]

    // Only add comparison tab for 'all' filter
    if (filter === 'all') {
      items.push({
        value: 'comparison',
        label: getTranslationFromI18nKeyAndLabel('crm.salesActivity360.employeeComparison', 'Employee Comparison'),
        icon: <UsersThreeIcon className="gba:mr-2" />,
        content: (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-comparison-content`}>
            <Activity360ComparisonTab accessToken={accessToken} filter={filter} entityId={entityId} />
          </div>
        )
      })
    }

    return items
  }, [accessToken, userInfo, filter, entityId])

  useEffect(() => {
    if (tabItems.some(item => item.value === activeTab)) {
      return
    }

    setActiveTab('list')
    updateUrl('list')
  }, [activeTab, tabItems, updateUrl])

  const activeTabContent = tabItems.find(item => item.value === activeTab)?.content
  const headerSubViews = useMemo(
    () => ({
      value: activeTab,
      onValueChange: handleTabChange,
      items: tabItems.map(({ value, label, icon }) => ({ value, label, icon }))
    }),
    [activeTab, handleTabChange, tabItems]
  )

  // Show loading for employee header fetch
  if (filter === 'by-employee' && employeeLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  const headerTitle =
    filter === 'by-employee' && employeeData ? employeeData.displayName : entityName || 'Sales Activities'

  return (
    <PageLayout
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
      headerIcon={config.icon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      headerSubViews={headerSubViews}
      variant={moduleColor}
      className="gba:min-h-screen"
    >
      <div className="gba:h-full gba:overflow-auto">{activeTabContent}</div>
    </PageLayout>
  )
}

export default ActivityView
