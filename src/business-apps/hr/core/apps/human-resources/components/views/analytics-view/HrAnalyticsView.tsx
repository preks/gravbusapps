import React, { useState, useEffect } from 'react'
import { Spin, Alert, Button } from 'antd'
import {
  GaugeIcon,
  UserIcon,
  UsersIcon,
  BuildingsIcon,
  CurrencyDollarIcon,
  ChartLineIcon,
  MapPinIcon
} from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import Dashboard from './components/views/dashboard/Dashboard'
import Demographics from './components/views/demographics'
import Workforce from './components/views/workforce'
import StructuralAnalysisReport from './components/views/structural-analysis/StructuralAnalysisReport'
import Compensation from './components/views/compensation'
import Forecasting from './components/views/forecasting'
import OfficeUsage from '@/business-apps/hr/core/apps/office-usage'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const HrAnalyticsView: React.FC<BusinessAppContextProps> = context => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <GaugeIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.dashboard_tab_label',
        'Dashboard'
      )
    },
    {
      key: 'demographics',
      icon: <UserIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.demographics_tab_label',
        'Demographics'
      )
    },
    {
      key: 'workforce',
      icon: <UsersIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.workforce_tab_label',
        'Workforce'
      )
    },
    {
      key: 'compensation',
      icon: <CurrencyDollarIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.compensation_tab_label',
        'Compensation'
      )
    },
    {
      key: 'forecasting',
      icon: <ChartLineIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.forecasting_tab_label',
        'Forecasting'
      )
    },
    {
      key: 'structural-analysis',
      icon: <BuildingsIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.structural_analysis_tab_label',
        'Structural Analysis'
      )
    },
    {
      key: 'office-presence',
      icon: <MapPinIcon />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.office_presence_tab_label',
        'Office Presence'
      )
    }
  ]

  // Get initial tab from URL
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')

    // Validate that the tab exists in our options
    if (tabFromUrl && viewOptions.some(option => option.key === tabFromUrl)) {
      return tabFromUrl
    }

    return viewOptions[0].key
  }

  const [activeSubTab, setActiveSubTab] = useState<string>(getInitialTab())
  const [error, setError] = useState<string | null>(null)
  const [isLoading] = useState<boolean>(false)

  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value)

    // Update URL to reflect the current tab
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('tab', value)

    // Define which tabs have content sections
    const tabsWithContent = ['workforce', 'structural-analysis', 'forecasting']

    // If switching to a tab without content sections, remove the content parameter
    if (!tabsWithContent.includes(value)) {
      urlParams.delete('content')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveSubTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const renderErrorContent = (viewName: string) => {
    if (error) {
      return (
        <div className="gba:p-6">
          <Alert
            message={getTranslationFromI18nKeyAndLabel(
              'lowcoder:human_resources_page.analytics_section.error_loading',
              `Error Loading ${viewName}`
            )}
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => setError(null)} type="primary">
                {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.retry', 'Retry')}
              </Button>
            }
            className="gba:shadow-sm"
          />
        </div>
      )
    }
    return null
  }

  const renderLoadingContent = (viewName: string) => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <div className="gba:text-center">
            <Spin size="large" />
            <div className="gba:mt-4 gba:text-muted-foreground gba:text-lg">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.analytics_section.loading',
                `Loading ${viewName}...`
              )}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const renderTabContent = () => {
    const errorContent = renderErrorContent(
      getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.title', 'HR Analytics')
    )
    if (errorContent) return errorContent

    const loadingContent = renderLoadingContent(
      getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.title', 'HR Analytics')
    )
    if (loadingContent) return loadingContent

    switch (activeSubTab) {
      case 'dashboard':
        return (
          <TabsContent value="dashboard" data-testid="analytics-dashboard-content">
            <Dashboard accessToken={context.accessToken} userInfo={context.userInfo} />
          </TabsContent>
        )
      case 'demographics':
        return (
          <TabsContent value="demographics" data-testid="analytics-demographics-content">
            <Demographics {...context} />
          </TabsContent>
        )
      case 'workforce':
        return (
          <TabsContent value="workforce" data-testid="analytics-workforce-content">
            <Workforce {...context} />
          </TabsContent>
        )
      case 'compensation':
        return (
          <TabsContent value="compensation" data-testid="analytics-compensation-content">
            <Compensation {...context} />
          </TabsContent>
        )
      case 'forecasting':
        return (
          <TabsContent value="forecasting" data-testid="analytics-forecasting-content">
            <Forecasting {...context} />
          </TabsContent>
        )
      case 'structural-analysis':
        return (
          <TabsContent value="structural-analysis" data-testid="analytics-structural-analysis-content">
            <StructuralAnalysisReport {...context} />
          </TabsContent>
        )
      case 'office-presence':
        return (
          <TabsContent value="office-presence" data-testid="analytics-office-presence-content">
            <OfficeUsage {...context} />
          </TabsContent>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="hr-analytics-view" className="gba:h-full">
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="gba:h-full">
        <TabsList className="gba:mb-4">
          {viewOptions.map(option => (
            <TabsTrigger
              key={option.key}
              value={option.key}
              data-testid={`analytics-${option.key}-tab`}
              className="gba:flex gba:flex-row gba:items-center gba:gap-2"
            >
              <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
                {option.icon}
                {option.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="gba:flex-1 gba:overflow-auto">{renderTabContent()}</div>
      </Tabs>
    </div>
  )
}

export default HrAnalyticsView
