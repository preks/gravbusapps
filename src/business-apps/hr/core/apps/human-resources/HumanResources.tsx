import React, { useState, useEffect } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { UsersThreeIcon, BriefcaseIcon, ChartPieIcon, LightbulbIcon } from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EmployeeList } from './components/views/employee-view/EmployeeList'
import { JobPositionList } from './components/views/job-position-view/JobPositionList'
import { HrAnalyticsView } from './components/views/analytics-view/HrAnalyticsView'
import { InsightsView } from './components/views/insights-view/InsightsView'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const moduleColor = MODULE_COLORS.HR

export const HumanResources: React.FC<BusinessAppContextProps> = context => {
  const viewOptions = [
    {
      key: 'employees',
      icon: <UsersThreeIcon />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.employees_section.tab_label',
        'Employees'
      ),
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.employees_section.title',
        'Employee Management'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.employees_section.description',
        'View and manage all employees in your organization, including their profiles, roles, and organizational assignments.'
      )
    },
    {
      key: 'positions',
      icon: <BriefcaseIcon />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.tab_label',
        'Job Positions'
      ),
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.title',
        'Job Position Management'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.description',
        'Manage job positions, departments, profiles, and track employee assignments across your organizational structure.'
      )
    },
    {
      key: 'analytics',
      icon: <ChartPieIcon />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.tab_label',
        'Analytics'
      ),
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.title',
        'HR Analytics & Insights'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.description',
        'Comprehensive workforce insights, analytics, and metrics to drive HR decisions and organizational strategy.'
      )
    },
    {
      key: 'insights',
      icon: <LightbulbIcon />,
      label: 'Insights',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.title', 'HR Insights'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:hr_insights.description',
        'Next 30 days Key employee events and milestones including birthdays, anniversaries, new hires, probation periods, and terminations.'
      )
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    // Validate that the view exists in our options
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }

    // Default to first view
    return viewOptions[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialView())

  // Get active tab information
  const getActiveTabInfo = () => {
    return viewOptions.find(option => option.key === activeTab) || viewOptions[0]
  }

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('view', view)

    // Always clean up all subview parameters first
    urlParams.delete('tab')
    urlParams.delete('content')

    // Set appropriate subview parameters for the target view
    if (view === 'analytics') {
      // For analytics, always set default tab
      urlParams.set('tab', 'dashboard')
      // content will be set by the analytics component if needed
    }
    // For employees and positions, no additional parameters needed

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleTabChange = (key: string) => {
    // Prevent deselection - if key is empty or same as current, ignore the change
    if (!key || key === activeTab) {
      return
    }
    setActiveTab(key)
    updateUrl(key)
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    } else {
      // If view is present, ensure proper tab parameters
      const currentView = urlParams.get('view')
      if (currentView === 'analytics' && !urlParams.has('tab')) {
        urlParams.set('tab', 'dashboard')
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'employees':
        return (
          <div data-testid="employees-tab-content">
            <EmployeeList {...context} />
          </div>
        )
      case 'positions':
        return (
          <div data-testid="positions-tab-content">
            <JobPositionList {...context} />
          </div>
        )
      case 'analytics':
        return (
          <div data-testid="analytics-tab-content">
            <HrAnalyticsView {...context} />
          </div>
        )
      case 'insights':
        return (
          <div data-testid="insights-tab-content">
            <InsightsView {...context} />
          </div>
        )
      default:
        return null
    }
  }

  const activeTabInfo = getActiveTabInfo()

  return (
    <div data-testid="human-resources-app">
      <PageLayout
        headerIcon={UsersThreeIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.title', 'Human Resources')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:human_resources_page.description',
          'Manage employees, job positions, and organizational structure'
        )}
        sectionTitle={activeTabInfo.title}
        sectionDescription={activeTabInfo.description}
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
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default HumanResources
