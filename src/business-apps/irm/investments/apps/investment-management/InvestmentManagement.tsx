import React, { useState, useEffect } from 'react'
import { PageLayout, Button } from '@newwork/nw-design-system'
import { TrendDownIcon, CurrencyDollarIcon, ChartBarIcon, SquaresFourIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DivestmentView from './views/divestment-view/DivestmentView'
import { InvestmentView } from './views/investment-view'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import DashboardView from './views/dashboard-view/DashboardView'
import { AnalyticsView } from './views/analytics-view'
import { ReportView } from './views/report-view'

export type InvestmentManagementProps = BusinessAppContextProps

const moduleColor = MODULE_COLORS.IRM

export const InvestmentManagement: React.FC<InvestmentManagementProps> = context => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <SquaresFourIcon />,
      label: getTranslationFromI18nKeyAndLabel('portfolio', 'Portfolio')
    },
    {
      key: 'investments',
      icon: <CurrencyDollarIcon />,
      label: getTranslationFromI18nKeyAndLabel('investments', 'Investments')
    },
    {
      key: 'reports',
      icon: <TrendDownIcon />,
      label: getTranslationFromI18nKeyAndLabel('reports', 'Reports')
    },

    {
      key: 'divestments',
      icon: <TrendDownIcon />,
      label: getTranslationFromI18nKeyAndLabel('divestments', 'Divestments')
    },
    {
      key: 'analytics',
      icon: <ChartBarIcon />,
      label: getTranslationFromI18nKeyAndLabel('analytics', 'Analytics')
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }

    return viewOptions[0].key
  }

  const [activeView, setActiveView] = useState<string>(getInitialView())
  const [investmentsSubTab, setInvestmentsSubTab] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('subView') || 'overview'
  })

  const handleNavigateToInvestments = (subTab?: string) => {
    setActiveView('investments')
    const targetSubTab = subTab || investmentsSubTab
    setInvestmentsSubTab(targetSubTab)
    updateUrl('investments', targetSubTab)
  }

  // Update URL when view changes using platform navigation utilities
  const updateUrl = (view: string, subView?: string) => {
    try {
      const currentUrl = new URL(window.location.href)
      const params: Record<string, string> = {}

      // Preserve existing query parameters
      currentUrl.searchParams.forEach((value, key) => {
        params[key] = value
      })

      // Update view and subView parameters
      params.view = view
      if (view === 'investments' && subView) {
        params.subView = subView
      } else if (params.subView) {
        delete params.subView
      }

      // Use platform URL builder for safe navigation
      const newUrl = buildPlatformUrl(currentUrl.pathname, params)

      // Use safe history manipulation
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newUrl)
      }
    } catch (error) {
      console.warn('Failed to update URL:', error)
      // Fallback: just update the state without URL manipulation
    }
  }

  const handleViewChange = (key: string) => {
    if (!key || key === activeView) {
      return
    }
    setActiveView(key)
    if (key === 'investments') {
      updateUrl(key, investmentsSubTab)
    } else {
      updateUrl(key)
    }
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      let subView: string | undefined
      if (activeView === 'investments') {
        subView = investmentsSubTab
      }
      updateUrl(activeView, subView)
    }
  }, [])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveView(newView)
      if (newView === 'investments') {
        const urlParams = new URLSearchParams(window.location.search)
        setInvestmentsSubTab(urlParams.get('subView') || 'overview')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const renderViewContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div data-testid="dashboard-view" className="gba:h-full gba:overflow-auto">
            <DashboardView
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              moduleColor={moduleColor}
              onNavigateToInvestments={handleNavigateToInvestments}
            />
          </div>
        )
      case 'analytics':
        return (
          <div data-testid="analytics-view" className="gba:h-full gba:overflow-auto">
            <AnalyticsView moduleColor={moduleColor} {...context} />
          </div>
        )
      case 'reports':
        return (
          <div data-testid="report-view" className="gba:h-full gba:overflow-auto">
            <ReportView {...context} />
          </div>
        )
      case 'investments':
        return (
          <div data-testid="investments-view" className="gba:h-full gba:overflow-auto">
            <InvestmentView
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              initialSubTab={investmentsSubTab}
              onSubTabChange={subTab => {
                setInvestmentsSubTab(subTab)
                updateUrl('investments', subTab)
              }}
            />
          </div>
        )
      case 'divestments':
        return (
          <div data-testid="divestment-view" className="gba:h-full gba:overflow-auto">
            <DivestmentView
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              additionalData={context.additionalData}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="investment-management-app">
      <PageLayout
        headerIcon={ChartBarIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('investment_management', 'Investment Management')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'investment_management_description',
          'Comprehensive investment portfolio management and analysis tools'
        )}
        headerContent={
          <Button
            variant="default"
            onClick={() => navigateTo('/platform/irm/investment-relations')}
            data-testid="investment-management-navigate-to-relations-button"
          >
            Investment Relations
          </Button>
        }
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {renderViewContent()}
      </PageLayout>
    </div>
  )
}

export default InvestmentManagement
