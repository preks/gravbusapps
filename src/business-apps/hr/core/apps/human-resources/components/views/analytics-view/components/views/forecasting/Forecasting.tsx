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

const FORECASTING_VALID_TABS = ['salary', 'workforce'] as const
const FORECASTING_DEFAULT_TAB = 'salary'

export const Forecasting: React.FC<ForecastingProps> = props => {
  const { prefixDataTestId = 'Forecasting' } = props
  const { t } = useTranslation(hrTranslations)
  const [activeTab, setActiveTab] = useState<string>(FORECASTING_DEFAULT_TAB)

  // Update URL when content changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    const url = new URL(globalThis.location.href)
    url.searchParams.set('content', key)
    globalThis.history.pushState({}, '', url.toString())
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const getTabFromUrl = () => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      const contentFromUrl = urlParams.get('content')
      return FORECASTING_VALID_TABS.includes(contentFromUrl as (typeof FORECASTING_VALID_TABS)[number])
        ? contentFromUrl!
        : FORECASTING_DEFAULT_TAB
    }

    const initialTab = getTabFromUrl()
    setActiveTab(initialTab)

    if (initialTab === FORECASTING_DEFAULT_TAB) {
      const url = new URL(globalThis.location.href)
      if (url.searchParams.get('content') !== FORECASTING_DEFAULT_TAB) {
        url.searchParams.set('content', FORECASTING_DEFAULT_TAB)
        globalThis.history.replaceState({}, '', url.toString())
      }
    }

    const handlePopState = () => {
      setActiveTab(getTabFromUrl())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
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
