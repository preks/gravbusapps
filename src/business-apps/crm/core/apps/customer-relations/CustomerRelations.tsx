import React, { useState, useEffect, useCallback } from 'react'
import { Button, Alert, AlertTitle, AlertDescription, Spinner, PageLayout } from '@newwork/nw-design-system'
import {
  HandshakeIcon,
  ChartBar,
  UsersThree,
  Buildings,
  Users,
  CurrencyDollar,
  List,
  Megaphone,
  House
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadView } from './views/lead-view'
import { AccountView } from './views/account-view'
import { ContactView } from './views/contact-view'
import { OpportunityView } from './views/opportunity-view'
import { DashboardView } from './views/dashboard-view'
import { AnalyticsView } from './views/analytics-view'
import { useSalesDashboard } from './views/dashboard-view/hooks/useSalesDashboard'
import { DateRange } from './views/dashboard-view/types/dashboardTypes'
import { CampaignManagement } from '@/business-apps/crm/campaigns/apps/campaign-management'
import { TaskView } from './views/task-view'
import { MODULE_COLORS } from '@/common/constants/ui'

export type CustomerRelationsProps = BusinessAppContextProps

const moduleColor = MODULE_COLORS.CRM
const CUSTOMER_VIEW_KEYS = [
  'dashboard',
  'tasks',
  'leads',
  'accounts',
  'contacts',
  'opportunities',
  'campaigns',
  'analytics'
] as const
type CustomerViewKey = (typeof CUSTOMER_VIEW_KEYS)[number]
const isValidCustomerView = (value?: string | null): value is CustomerViewKey =>
  Boolean(value && (CUSTOMER_VIEW_KEYS as readonly string[]).includes(value))

const getViewFromUrl = (): CustomerViewKey | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const params = new URLSearchParams(window.location.search)
  const viewFromUrl = params.get('view')
  return isValidCustomerView(viewFromUrl) ? viewFromUrl : null
}
export const CustomerRelations: React.FC<CustomerRelationsProps> = context => {
  const hostViewParam = typeof context.additionalData?.view === 'string' ? context.additionalData.view : undefined
  const contextView = isValidCustomerView(hostViewParam) ? hostViewParam : null
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <House />,
      label: 'Dashboard'
    },
    {
      key: 'tasks',
      icon: <List />,
      label: 'Tasks'
    },
    {
      key: 'leads',
      icon: <UsersThree />,
      label: 'Leads'
    },
    {
      key: 'accounts',
      icon: <Buildings />,
      label: 'Accounts'
    },
    {
      key: 'contacts',
      icon: <Users />,
      label: 'Contacts'
    },
    {
      key: 'opportunities',
      icon: <CurrencyDollar />,
      label: 'Opportunities'
    },
    {
      key: 'campaigns',
      icon: <Megaphone />,
      label: 'Campaigns'
    },
    {
      key: 'analytics',
      icon: <ChartBar />,
      label: 'Analytics'
    }
  ]

  // Get initial view from context or URL or default to first view
  const getInitialView = () => {
    if (contextView) {
      return contextView
    }
    const urlView = getViewFromUrl()
    if (urlView) {
      return urlView
    }
    const defaultView = viewOptions[0].key as CustomerViewKey
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (!params.has('view')) {
        params.set('view', defaultView)
        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState({}, '', newUrl)
      }
    }
    return defaultView
  }

  const [activeTab, setActiveTab] = useState<CustomerViewKey>(getInitialView())
  // Sub-view is now handled inside OpportunityView
  const [dateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear() - 2, 0, 1),
    endDate: new Date()
  })
  const { pipelines, isLoading, error, refetch } = useSalesDashboard(context)

  // Update URL when view changes
  const updateUrl = useCallback((view: CustomerViewKey, subView?: string) => {
    if (typeof window === 'undefined') {
      return
    }
    const urlParams = new URLSearchParams(window.location.search)
    const currentView = urlParams.get('view')
    let changed = false

    if (currentView !== view) {
      urlParams.set('view', view)
      changed = true
    }

    if (view === 'opportunities' && subView) {
      const encodedSubView = subView === 'board' ? 'pipeline' : subView
      if (urlParams.get('subView') !== encodedSubView) {
        urlParams.set('subView', encodedSubView)
        changed = true
      }
    } else if (urlParams.has('subView')) {
      urlParams.delete('subView')
      changed = true
    }

    if (view !== 'leads' && urlParams.has('leadStatus')) {
      urlParams.delete('leadStatus')
      changed = true
    }

    if (
      view !== 'campaigns' &&
      (urlParams.has('campaignId') || urlParams.has('mainTab') || urlParams.has('recordTab'))
    ) {
      urlParams.delete('campaignId')
      urlParams.delete('mainTab')
      urlParams.delete('recordTab')
      changed = true
    }

    if (!changed && currentView === view) {
      return
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  const handleTabChange = (key: string) => {
    if (!isValidCustomerView(key) || key === activeTab) {
      return
    }
    setActiveTab(key)
    updateUrl(key)
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    }
  }, [activeTab, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getViewFromUrl() ?? (viewOptions[0].key as CustomerViewKey)
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Sync with external context view updates
  useEffect(() => {
    if (!contextView) {
      return
    }
    setActiveTab(previous => {
      if (previous === contextView) {
        return previous
      }
      updateUrl(contextView)
      return contextView
    })
  }, [contextView, updateUrl])

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <div className="gba:text-center">
            <Spinner size="lg" />
            <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">Loading Customer Relations Dashboard...</div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="gba:p-6">
          <Alert variant="destructive" className="gba:shadow-sm">
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      )
    }

    return <DashboardView pipelines={pipelines} dateRange={dateRange} moduleColor={moduleColor} {...context} />
  }

  const renderAnalyticsContent = () => {
    return (
      <div data-testid="analytics-tab-content">
        <AnalyticsView moduleColor={moduleColor} {...context} />
      </div>
    )
  }

  const renderOpportunitiesContent = () => {
    return <OpportunityView {...context} />
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent()
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
      case 'campaigns':
        return (
          <div data-testid="campaigns-tab-content">
            <CampaignManagement {...context} />
          </div>
        )
      case 'opportunities':
        return renderOpportunitiesContent()
      case 'analytics':
        return renderAnalyticsContent()
      default:
        return null
    }
  }

  return (
    <div data-testid="customer-relations-app">
      <PageLayout
        headerIcon={HandshakeIcon}
        headerTitle="Customer Relations"
        headerDescription="Manage customer relationships, track leads, accounts, contacts, and sales opportunities"
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

export default CustomerRelations
