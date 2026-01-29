import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, useTranslation, Icon } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import SalaryForecasting from './components/tabs/SalaryForecasting'
import WorkforceForecasting from './components/tabs/WorkforceForecasting'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { CurrencyDollarIcon, UsersIcon } from '@phosphor-icons/react'

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

  return (
    <div data-testid={prefixDataTestId} className="gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:leading-9 gba:text-foreground gba:m-0">
            {t('hr-analytics-forecasting-analysis')}
          </h2>
        </div>
      </div>

      {/* Description (match Workforce spacing) */}
      <div className="gba:mb-6">
        <p className="gba:text-muted-foreground">{t('hr-analytics-forecasting-description')}</p>
      </div>

      {/* Tabs Content */}
      <div data-testid="forecasting-tabs-container" className="gba:flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full" data-testid="forecasting-tabs">
          <TabsList className="gba:mb-4">
            <TabsTrigger
              value="salary"
              data-testid="salary-forecasting-tab"
              className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:gap-2"
              title={t('hr-analytics-salary-forecasting')}
            >
              <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
                <Icon icon={CurrencyDollarIcon} size="sm" decorative />
                {t('hr-analytics-salary-forecasting')}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="workforce"
              data-testid="workforce-forecasting-tab"
              className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:gap-2"
              title={t('hr-analytics-workforce-forecasting')}
            >
              <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
                <Icon icon={UsersIcon} size="sm" decorative />
                {t('hr-analytics-workforce-forecasting')}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="salary" className="gba:mt-6">
            <SalaryForecasting {...props} prefixDataTestId="SalaryForecasting" />
          </TabsContent>

          <TabsContent value="workforce" className="gba:mt-6">
            <WorkforceForecasting {...props} prefixDataTestId="WorkforceForecasting" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Forecasting
