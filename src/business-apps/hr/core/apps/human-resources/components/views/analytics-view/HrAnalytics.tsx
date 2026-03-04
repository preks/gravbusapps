import React, { useState, useEffect } from 'react'
import { Alert, Button } from 'antd'
import { PageLayout } from '@newwork/nw-design-system'
import {
  GaugeIcon,
  UserIcon,
  UsersIcon,
  BuildingsIcon,
  CurrencyDollarIcon,
  ChartLineIcon,
  ChartPieIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import Dashboard from './components/views/dashboard/Dashboard'
import Demographics from './components/views/demographics'
import Workforce from './components/views/workforce'
import StructuralAnalysisReport from './components/views/structural-analysis/StructuralAnalysisReport'
import Compensation from './components/views/compensation'
import Forecasting from './components/views/forecasting'

export const HrAnalytics: React.FC<BusinessAppContextProps> = context => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <GaugeIcon size={16} />,
      label: 'Dashboard'
    },
    {
      key: 'demographics',
      icon: <UserIcon />,
      label: 'Demographics'
    },
    {
      key: 'workforce',
      icon: <UsersIcon size={16} />,
      label: 'Workforce'
    },
    {
      key: 'compensation',
      icon: <CurrencyDollarIcon size={16} />,
      label: 'Compensation'
    },
    {
      key: 'forecasting',
      icon: <ChartLineIcon size={16} />,
      label: 'Forecasting'
    },
    {
      key: 'structural-analysis',
      icon: <BuildingsIcon size={16} />,
      label: 'Structural Analysis'
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')

    // Validate that the tab exists in our options
    if (tabFromUrl && viewOptions.some(option => option.key === tabFromUrl)) {
      return tabFromUrl
    }

    return viewOptions[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialView())
  const [error, setError] = useState<string | null>(null)

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Update URL to reflect the current tab
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)

    // Define which tabs have content sections
    const tabsWithContent = ['workforce', 'structural-analysis', 'forecasting']

    // If switching to a tab without content sections, remove the content parameter
    if (!tabsWithContent.includes(value)) {
      url.searchParams.delete('content')
    }

    window.history.pushState({}, '', url.toString())
  }

  // Sync tab with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabFromUrl = urlParams.get('tab')

      if (tabFromUrl && viewOptions.some(option => option.key === tabFromUrl)) {
        setActiveTab(tabFromUrl)

        // Define which tabs have sections
        const tabsWithSections = ['workforce', 'structural-analysis', 'forecasting']

        // If navigating to a tab without sections, clean up the section parameter
        if (!tabsWithSections.includes(tabFromUrl) && urlParams.has('section')) {
          const url = new URL(window.location.href)
          url.searchParams.delete('section')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [viewOptions])

  // Debug logging for development
  useEffect(() => {
    console.log(`HR Analytics - Active view: ${activeTab}`)
  }, [activeTab])

  // Clean up section parameter on initial load if current tab doesn't support sections
  useEffect(() => {
    const tabsWithSections = ['workforce', 'structural-analysis', 'forecasting']
    const urlParams = new URLSearchParams(window.location.search)

    if (!tabsWithSections.includes(activeTab) && urlParams.has('section')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('section')
      window.history.replaceState({}, '', url.toString())
    }
  }, []) // Run only on initial mount

  const renderErrorContent = (viewName: string) => {
    if (error) {
      return (
        <div className="gba:p-6">
          <Alert
            message={`Error Loading ${viewName}`}
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => setError(null)} type="primary">
                Retry
              </Button>
            }
            className="gba:shadow-sm"
          />
        </div>
      )
    }
    return null
  }

  const renderLoadingContent = () => {
    // Individual views handle their own loading states
    return null
  }

  const renderTabContent = () => {
    const errorContent = renderErrorContent('HR Analytics')
    if (errorContent) return errorContent

    const loadingContent = renderLoadingContent()
    if (loadingContent) return loadingContent

    switch (activeTab) {
      case 'dashboard':
        return (
          <div data-testid="dashboard-tab-content">
            <Dashboard accessToken={context.accessToken} userInfo={context.userInfo} />
          </div>
        )
      case 'demographics':
        return (
          <div data-testid="demographics-tab-content">
            <Demographics {...context} />
          </div>
        )
      case 'workforce':
        return (
          <div data-testid="workforce-tab-content">
            <Workforce {...context} />
          </div>
        )
      case 'compensation':
        return (
          <div data-testid="compensation-tab-content">
            <Compensation {...context} />
          </div>
        )
      case 'forecasting':
        return (
          <div data-testid="forecasting-tab-content">
            <Forecasting {...context} />
          </div>
        )
      case 'structural-analysis':
        return (
          <div data-testid="structural-analysis-tab-content">
            <StructuralAnalysisReport {...context} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="hr-analytics-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: ChartPieIcon,
          variant: 'default',
          size: 'lg',
          label: 'HR Analytics'
        }}
        headerTitle="HR Analytics"
        headerDescription="Comprehensive workforce insights, analytics, and metrics to drive HR decisions"
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
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default HrAnalytics
