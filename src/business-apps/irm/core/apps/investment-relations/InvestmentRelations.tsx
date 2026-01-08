import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { PageLayout, Button } from '@newwork/nw-design-system'
import {
  TrendUpIcon,
  HouseIcon,
  ListIcon,
  UsersThreeIcon,
  BuildingsIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { LeadView } from './views/lead-view'
import { AccountView } from './views/account-view'
import { ContactView } from './views/contact-view'
import { OpportunityView } from './views/opportunity-view'
import { AnalyticsView } from './views/analytics-view'
import { DashboardView } from './views/dashboard-view'
import { TaskView } from './views/task-view'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useDashboardQueries } from './views/dashboard-view/queries/DashboardQueries'
import { PipelineInfo } from './views/dashboard-view/types/dashboardTypes'

export type InvestmentRelationsProps = BusinessAppContextProps

const moduleColor = MODULE_COLORS.IRM

export const InvestmentRelations: React.FC<InvestmentRelationsProps> = context => {
  const { fetchPipelines } = useDashboardQueries(context)
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([])
  const [dateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const entries = await fetchPipelines()
        if (!mounted) return
        const mapped: PipelineInfo[] = (entries || []).map((e: any) => ({
          id: e.id,
          name: e.value,
          ref: e.id, // prefer id; queries also accept code
          description: e.description
        }))
        setPipelines(mapped)
      } catch {
        // ignore; UI handles empty gracefully
      }
    })()
    return () => {
      mounted = false
    }
  }, [fetchPipelines])
  const viewOptions = useMemo(
    () => [
      {
        key: 'dashboard',
        icon: <HouseIcon />,
        label: 'Dashboard'
      },
      {
        key: 'tasks',
        icon: <ListIcon />,
        label: 'Tasks'
      },
      {
        key: 'leads',
        icon: <UsersThreeIcon />,
        label: 'Leads'
      },
      {
        key: 'accounts',
        icon: <BuildingsIcon />,
        label: 'Accounts'
      },
      {
        key: 'contacts',
        icon: <UsersIcon />,
        label: 'Contacts'
      },
      {
        key: 'opportunities',
        icon: <CurrencyDollarIcon />,
        label: 'Opportunities'
      },
      {
        key: 'analytics',
        icon: <ChartBarIcon />,
        label: 'Analytics'
      }
    ],
    []
  )

  const resolveViewKey = useCallback(
    (candidate?: string | null) => {
      if (!candidate) {
        return null
      }
      return viewOptions.some(option => option.key === candidate) ? candidate : null
    },
    [viewOptions]
  )

  const getUrlView = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return resolveViewKey(urlParams.get('view'))
  }, [resolveViewKey])

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const contextViewValue = context.additionalData?.view
    if (typeof contextViewValue === 'string') {
      const validated = resolveViewKey(contextViewValue)
      if (validated) {
        return validated
      }
    }
    const viewFromUrl = getUrlView()
    if (viewFromUrl) {
      return viewFromUrl
    }
    return viewOptions[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialView())

  // Update URL when view changes
  const updateUrl = useCallback((view: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    const currentView = urlParams.get('view')
    const hasSubView = urlParams.has('subView')
    if (currentView === view && !hasSubView) {
      return
    }

    // Always set the view parameter (including for default)
    urlParams.set('view', view)

    // Clear any subView parameter (no investments subviews here anymore)
    if (urlParams.has('subView')) {
      urlParams.delete('subView')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

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
    }
  }, [activeTab, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getUrlView() ?? viewOptions[0].key
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getUrlView, viewOptions])

  const hostViewParam = typeof context.additionalData?.view === 'string' ? context.additionalData?.view : undefined

  useEffect(() => {
    if (!hostViewParam) {
      return
    }
    const validated = resolveViewKey(hostViewParam)
    if (!validated) {
      return
    }
    setActiveTab(previous => {
      if (previous === validated) {
        return previous
      }
      updateUrl(validated)
      return validated
    })
  }, [hostViewParam, resolveViewKey, updateUrl])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div data-testid="dashboard-tab-content">
            <DashboardView pipelines={pipelines} dateRange={dateRange} moduleColor={moduleColor} {...context} />
          </div>
        )
      case 'tasks':
        return (
          <div data-testid="tasks-tab-content">
            <TaskView {...context} />
          </div>
        )

      case 'leads':
        return (
          <div data-testid="leads-tab-content">
            <LeadView {...context} />
          </div>
        )
      case 'accounts':
        return (
          <div data-testid="accounts-tab-content">
            <AccountView {...context} />
          </div>
        )
      case 'contacts':
        return (
          <div data-testid="contacts-tab-content">
            <ContactView {...context} />
          </div>
        )
      case 'opportunities':
        return (
          <div data-testid="opportunities-tab-content">
            <OpportunityView {...context} />
          </div>
        )
      case 'analytics':
        return (
          <div data-testid="analytics-tab-content">
            <AnalyticsView moduleColor={moduleColor} {...context} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="investment-relations-app">
      <PageLayout
        headerIcon={TrendUpIcon}
        headerTitle="Investment Relations"
        headerDescription="Manage investment portfolios, client relationships, and track investment opportunities across asset classes"
        headerContent={
          <Button
            variant="default"
            onClick={() => navigateTo('/platform/irm/investment-management')}
            data-testid="investment-relations-navigate-to-management-button"
          >
            Investment Management
          </Button>
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
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default InvestmentRelations
