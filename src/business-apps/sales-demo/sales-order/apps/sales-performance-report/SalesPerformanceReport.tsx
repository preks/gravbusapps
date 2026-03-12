import React, { useEffect, useState, ReactNode } from 'react'
import { Alert } from 'antd'
import { Tabs } from '@newwork/gravity-ui-catalog'
import { ChartLineUpIcon, GaugeIcon, FunnelIcon, TruckIcon } from '@phosphor-icons/react'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'

// Import tab components
import SalesPerformanceOverviewTab from './components/tabs/sales-performance-overview-tab'
import SalesOrderPipelineTab from './components/tabs/sales-order-pipeline-tab'
import FulfillmentDeliveryTab from './components/tabs/fulfillment-delivery-tab'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

export interface SalesPerformanceReportProps extends BusinessAppContextProps {}

const SalesPerformanceReport: React.FC<SalesPerformanceReportProps> = props => {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [contentHeader, setContentHeader] = useState<ReactNode>(null)

  // URL query parameter handling for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    if (tabFromUrl && ['overview', 'pipeline', 'fulfillment'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [])

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey)

    // Update URL query parameter
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabKey)
    window.history.replaceState({}, '', url.toString())
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GaugeIcon style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Sales Performance Overview</span>
        </div>
      ),
      children: <SalesPerformanceOverviewTab {...props} />,
      renderContentHeader: () => null
    },
    {
      key: 'pipeline',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FunnelIcon style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Sales Order Pipeline</span>
        </div>
      ),
      children: <SalesOrderPipelineTab {...props} />,
      renderContentHeader: () => null
    },
    {
      key: 'fulfillment',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TruckIcon style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Fulfillment & Delivery Report</span>
        </div>
      ),
      children: <FulfillmentDeliveryTab {...props} />,
      renderContentHeader: () => null
    }
  ]

  // Get active tab content and header
  const activeTabItem = tabItems.find(item => item.key === activeTab)
  const activeTabContent = activeTabItem?.children || null
  const activeTabContentHeader = activeTabItem?.renderContentHeader() || contentHeader

  // Error boundary for tab content
  const renderTabContent = () => {
    try {
      return activeTabContent
    } catch (error) {
      console.error('Error rendering tab content:', error)
      return (
        <div className="gba:p-6" data-testid="sales-performance-report-error">
          <Alert
            message="Error Loading Content"
            description="There was an error loading the tab content. Please try refreshing the page."
            type="error"
            showIcon
          />
        </div>
      )
    }
  }

  return (
    <PageLayout
      headerIcon={<ChartLineUpIcon color="#376399" />}
      headerLabel="Sales Performance Report"
      pageController={
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map(item => ({ key: item.key, label: item.label }))}
          className="w-full"
          data-testid="sales-performance-report-tabs"
        />
      }
      contentHeader={activeTabContentHeader}
      contentContainer={renderTabContent()}
      data-testid="sales-performance-report-page"
    />
  )
}

export default SalesPerformanceReport
