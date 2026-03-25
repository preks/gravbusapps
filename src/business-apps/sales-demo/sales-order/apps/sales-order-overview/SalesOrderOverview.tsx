import React, { useEffect, useState, ReactNode, useCallback } from 'react'
import { Alert } from 'antd'
import { Tabs } from '@newwork/gravity-ui-catalog'
import { ShoppingCartIcon, ChartBarIcon, GaugeIcon, ListBulletsIcon } from '@phosphor-icons/react'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import SalesOrderDetails from '../sales-order-details/SalesOrderDetails'

// Import tab components
import SalesOrderDashboardTab from './components/tabs/sales-order-dashboard-tab'
import SalesOrderListTab from './components/tabs/sales-order-list-tab'
import SalesOrderAnalyticsTab from './components/tabs/sales-order-analytics-tab'
import SalesOrderAi from './components/sales-order-ai'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

// Create a global API for tab navigation
interface TabNavigationState {
  setActiveTab: (tabKey: string) => void
  filter?: string
}

// Declare variable in global window object
declare global {
  interface Window {
    salesOrderTabNavigationAPI?: TabNavigationState
  }
}

export interface SalesOrderOverviewProps extends BusinessAppContextProps {}

const SalesOrderOverview: React.FC<SalesOrderOverviewProps> = props => {
  const { accessToken, userInfo, additionalData, activeStructureId } = props

  // Early return if no accessToken is provided
  if (!accessToken) {
    return (
      <div className="gba:p-6" data-testid="no-access-token">
        <Alert
          message="Access Token Required"
          description="This component requires an access token to function properly."
          type="warning"
          showIcon
        />
      </div>
    )
  }

  // State for navigation and content header
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null)

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GaugeIcon style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
        </div>
      ),
      children: <SalesOrderDashboardTab {...props} />,
      renderContentHeader: () => null
    },
    {
      key: 'orders',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListBulletsIcon style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Orders</span>
        </div>
      ),
      children: (
        <SalesOrderListTab
          {...props}
          onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
          onOrderSelect={(orderId: string) => setSelectedOrderId(orderId)}
        />
      ),
      renderContentHeader: () => contentHeader
    },
    {
      key: 'analytics',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChartBarIcon style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Analytics</span>
        </div>
      ),
      children: <SalesOrderAnalyticsTab {...props} />,
      renderContentHeader: () => null
    }
  ]

  // Get tab from URL query parameter or use first tab as default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    const validTabs = tabItems.map(item => item.key)

    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!
    } else {
      // No valid tab in URL, set default tab in URL
      const defaultTab = tabItems[0].key
      const url = new URL(window.location.href)
      url.searchParams.set('tab', defaultTab)
      window.history.replaceState({}, '', url.toString())
      return defaultTab
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Update URL when tab changes
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.pushState({}, '', url.toString())
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabFromUrl = urlParams.get('tab')
      const validTabs = tabItems.map(item => item.key)
      const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : tabItems[0].key
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [tabItems])

  // Expose the tab navigation API to the global window object
  useEffect(() => {
    window.salesOrderTabNavigationAPI = {
      setActiveTab: (tabKey: string) => {
        console.log('Global API: Switching to tab', tabKey)
        handleTabChange(tabKey)
      },
      filter: undefined
    }

    return () => {
      window.salesOrderTabNavigationAPI = undefined
    }
  }, [handleTabChange])

  // Handle back navigation from details
  const handleBackFromDetails = () => {
    setSelectedOrderId(null)
  }

  const activeTabItem = tabItems.find(item => item.key === activeTab)
  const activeTabContent = activeTabItem?.children
  const activeTabContentHeader = activeTabItem?.renderContentHeader()

  // Conditional rendering for details view
  if (selectedOrderId) {
    return (
      <SalesOrderDetails
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        activeStructureId={activeStructureId}
        orderId={selectedOrderId}
        onBack={handleBackFromDetails}
      />
    )
  }

  return (
    <PageLayout
      headerIcon={<ShoppingCartIcon color="#c92559" />}
      headerLabel="Sales Order Overview"
      pageHeaderCenter={<SalesOrderAi />}
      pageController={
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map(item => ({ key: item.key, label: item.label }))}
          className="w-full"
        />
      }
      contentHeader={activeTabContentHeader}
      contentContainer={activeTabContent}
    />
  )
}

export default SalesOrderOverview
