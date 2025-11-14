import React, { useState, useEffect } from 'react'
import { Tabs, Typography } from 'antd'
import { DollarOutlined, TeamOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import SalaryForecasting from './components/tabs/SalaryForecasting'
import WorkforceForecasting from './components/tabs/WorkforceForecasting'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface ForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Forecasting: React.FC<ForecastingProps> = props => {
  const { prefixDataTestId = 'Forecasting' } = props
  const { t } = useTranslation(hrTranslations)

  // Define valid tabs
  const validTabs = ['salary', 'workforce']
  const defaultTab = 'salary'

  // Get content from URL query parameter or use default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const contentFromUrl = urlParams.get('content')

    if (validTabs.includes(contentFromUrl ?? '')) {
      return contentFromUrl!
    } else {
      // No valid content in URL, set default content in URL
      const url = new URL(window.location.href)
      url.searchParams.set('content', defaultTab)
      window.history.replaceState({}, '', url.toString())
      return defaultTab
    }
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab)

  // Update URL when content changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('content', key)
    window.history.pushState({}, '', url.toString())
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const contentFromUrl = urlParams.get('content')
      const newTab = validTabs.includes(contentFromUrl ?? '') ? contentFromUrl! : defaultTab
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const tabItems = [
    {
      key: 'salary',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <DollarOutlined />
          {t('hr-analytics-salary-forecasting')}
        </div>
      ),
      children: <SalaryForecasting {...props} prefixDataTestId="SalaryForecasting" />
    },
    {
      key: 'workforce',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <TeamOutlined />
          {t('hr-analytics-workforce-forecasting')}
        </div>
      ),
      children: <WorkforceForecasting {...props} prefixDataTestId="WorkforceForecasting" />
    }
  ]

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:flex gba:flex-col gba:gap-6 gba:p-6 gba:bg-muted gba:rounded-lg gba:min-h-full"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={3} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-forecasting-analysis')}
          </Title>
          <Text className="gba:text-muted-foreground">
            {t('hr-analytics-forecasting-description')}
          </Text>
        </div>
      </div>

      {/* Tabs Content */}
      <div data-testid="forecasting-tabs-container" className="gba:flex-1">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          className="gba:h-full"
          data-testid="forecasting-tabs"
        />
      </div>
    </div>
  )
}

export default Forecasting
