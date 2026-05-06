import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Button, useTranslation } from '@newwork/nw-design-system'
import { TrendUpIcon, ArrowClockwiseIcon, UsersIcon, BriefcaseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import HeadcountTrends from './components/tabs/HeadcountTrends'
import TurnoverRetention from './components/tabs/TurnoverRetention'
import Employment from './components/tabs/Employment'
import { useHeadcountTrendsData } from '../../../hooks/useHeadcountTrendsData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import AnalyticsTabLoadingState from '../../shared/AnalyticsTabLoadingState'

const WORKFORCE_VALID_TABS = ['headcount-trends', 'turnover-retention', 'employment'] as const
const WORKFORCE_DEFAULT_TAB = 'headcount-trends'

const Workforce: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  const [activeTab, setActiveTab] = useState<string>(WORKFORCE_DEFAULT_TAB)

  const { statistics, isLoading, refetch } = useHeadcountTrendsData(context)

  const prefixDataTestId = 'Workforce'

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
      return WORKFORCE_VALID_TABS.includes(contentFromUrl as (typeof WORKFORCE_VALID_TABS)[number])
        ? contentFromUrl!
        : WORKFORCE_DEFAULT_TAB
    }

    const initialTab = getTabFromUrl()
    setActiveTab(initialTab)

    if (initialTab === WORKFORCE_DEFAULT_TAB) {
      const url = new URL(globalThis.location.href)
      if (url.searchParams.get('content') !== WORKFORCE_DEFAULT_TAB) {
        url.searchParams.set('content', WORKFORCE_DEFAULT_TAB)
        globalThis.history.replaceState({}, '', url.toString())
      }
    }

    const handlePopState = () => {
      setActiveTab(getTabFromUrl())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  if (isLoading) {
    return (
      <AnalyticsTabLoadingState
        dataTestId={`${prefixDataTestId}-loading`}
        message={t('hr-data-filter-loading-data')}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg"
      />
    )
  }

  return (
    <div data-testid="workforce-view" className="gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:m-0">
            {t('hr-analytics-workforce-analytics')}
          </h2>
          <div className="gba:bg-card gba:px-3 gba:py-1 gba:rounded-full gba:border gba:border-border">
            <span className="gba:font-semibold gba:text-info">
              {statistics.totalEmployees} {t('hr-analytics-employees')}
            </span>
          </div>
        </div>
        <Button
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <ArrowClockwiseIcon />
          {t('common-refresh-data')}
        </Button>
      </div>

      {/* Description */}
      <div className="gba:mb-6">
        <p className="gba:text-muted-foreground">{t('hr-analytics-workforce-description')}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full">
        <TabsList className="gba:mb-4">
          <TabsTrigger
            value="headcount-trends"
            data-testid="headcount-trends-tab"
            className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:gap-2"
            title={t('hr-analytics-headcount-trends')}
          >
            <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
              <TrendUpIcon />
              {t('hr-analytics-headcount-trends')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="turnover-retention"
            data-testid="turnover-retention-tab"
            className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:gap-2"
            title={t('hr-analytics-turnover-retention')}
          >
            <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
              <UsersIcon />
              {t('hr-analytics-turnover-retention')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="employment"
            data-testid="employment-tab"
            className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:gap-2"
            title={t('hr-analytics-employment')}
          >
            <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
              <BriefcaseIcon />
              {t('hr-analytics-employment')}
            </span>
          </TabsTrigger>
          {/* Performance tab hidden */}
        </TabsList>

        <TabsContent value="headcount-trends" className="gba:mt-6">
          <HeadcountTrends {...context} />
        </TabsContent>

        <TabsContent value="turnover-retention" className="gba:mt-6">
          <TurnoverRetention {...context} />
        </TabsContent>

        <TabsContent value="employment" className="gba:mt-6">
          <Employment {...context} />
        </TabsContent>

        {/* Performance content hidden */}
      </Tabs>
    </div>
  )
}

export default Workforce
