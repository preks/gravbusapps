import React, { useState, useCallback, useEffect } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { GaugeIcon, ClockIcon, LightbulbIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DashboardTab } from './components/tabs/DashboardTab'
import { AttendanceTab } from './components/tabs/AttendanceTab'
import { InsightsTab } from './components/tabs/InsightsTab'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const VALID_TABS = ['dashboard', 'attendance', 'insights'] as const
type TabKey = (typeof VALID_TABS)[number]

const MyTeamTime: React.FC<BusinessAppContextProps> = props => {
  const viewOptions = [
    {
      key: 'dashboard' as TabKey,
      icon: <GaugeIcon className="gba:h-5 gba:w-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.dashboard', 'Dashboard')
    },
    {
      key: 'attendance' as TabKey,
      icon: <ClockIcon className="gba:h-5 gba:w-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.attendance', 'Attendance')
    },
    {
      key: 'insights' as TabKey,
      icon: <LightbulbIcon className="gba:h-5 gba:w-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.insights', 'Insights')
    }
  ]

  const getInitialTab = (): TabKey => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const tabFromUrl = urlParams.get('tab')
    if (VALID_TABS.includes(tabFromUrl as TabKey)) {
      return tabFromUrl as TabKey
    }
    const defaultTab: TabKey = 'dashboard'
    const url = new URL(globalThis.location.href)
    url.searchParams.set('tab', defaultTab)
    globalThis.history.replaceState({}, '', url.toString())
    return defaultTab
  }

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as TabKey)
    const url = new URL(globalThis.location.href)
    url.searchParams.set('tab', tab)
    globalThis.history.pushState({}, '', url.toString())
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      const tabFromUrl = urlParams.get('tab')
      const newTab = VALID_TABS.includes(tabFromUrl as TabKey) ? (tabFromUrl as TabKey) : 'dashboard'
      setActiveTab(newTab)
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...props} />
      case 'attendance':
        return <AttendanceTab {...props} />
      case 'insights':
        return <InsightsTab {...props} />
      default:
        return null
    }
  }

  return (
    <div data-testid="my-team-time-container">
      <PageLayout
        headerIcon={ClockIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.title', 'My Team Time')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.description',
          'Monitor team availability, manage capacity, and ensure compliance'
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto gba:p-6">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default MyTeamTime
