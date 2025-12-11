import React, { useState, useEffect } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Spinner,
  Card,
  CardContent,
  useTranslation
} from '@newwork/nw-design-system'
import { PiTrendUp, PiArrowClockwise, PiUsers, PiBriefcase } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import HeadcountTrends from './components/tabs/HeadcountTrends'
import TurnoverRetention from './components/tabs/TurnoverRetention'
import Employment from './components/tabs/Employment'
import { useHeadcountTrendsData } from '../../../hooks/useHeadcountTrendsData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const Workforce: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  // Define valid tabs
  const validTabs = ['headcount-trends', 'turnover-retention', 'employment']
  const defaultTab = 'headcount-trends'

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

  const [activeTab, setActiveTab] = useState(getInitialTab)

  const { statistics, isLoading, error, refetch } = useHeadcountTrendsData(context)

  const prefixDataTestId = 'Workforce'

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

  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-error`}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg"
      >
        <Card className="gba:border-destructive-secondary-foreground gba:bg-destructive-secondary-foreground/25">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-destructive-secondary gba:font-medium gba:mb-2">
                  {t('hr-analytics-failed-to-load-workforce')}
                </h3>
                <p className="gba:text-destructive-secondary">{error}</p>
              </div>
              <Button variant="outline" onClick={refetch} className="gba:flex gba:items-center gba:gap-2">
                <PiArrowClockwise />
                {t('common-retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-loading`}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center gba:flex-col"
      >
        <Spinner className="gba:w-8 gba:h-8" />
        <p className="gba:mt-4 gba:text-muted-foreground">{t('hr-analytics-loading-workforce')}</p>
      </div>
    )
  }

  return (
    <div
      data-testid="workforce-view"
      className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg"
    >
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
          <PiArrowClockwise />
          {t('common-refresh-data')}
        </Button>
      </div>

      {/* Description */}
      <div className="gba:mb-6">
        <p className="gba:text-muted-foreground">{t('hr-analytics-workforce-description')}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="gba:grid gba:w-full gba:max-w-5xl gba:grid-cols-3 gba:items-stretch gba:h-12 gba:gap-2">
          <TabsTrigger
            value="headcount-trends"
            data-testid="headcount-trends-tab"
            className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:h-12 gba:px-4 gba:py-0 gba:leading-none gba:min-w-0 gba:overflow-hidden"
            title={t('hr-analytics-headcount-trends')}
          >
            <span className="gba:shrink-0">
              <PiTrendUp />
            </span>
            <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-ellipsis gba:overflow-hidden">
              {t('hr-analytics-headcount-trends')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="turnover-retention"
            data-testid="turnover-retention-tab"
            className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:h-12 gba:px-4 gba:py-0 gba:leading-none gba:min-w-0 gba:overflow-hidden"
            title={t('hr-analytics-turnover-retention')}
          >
            <span className="gba:shrink-0">
              <PiUsers />
            </span>
            <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-ellipsis gba:overflow-hidden">
              {t('hr-analytics-turnover-retention')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="employment"
            data-testid="employment-tab"
            className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:h-12 gba:px-4 gba:py-0 gba:leading-none gba:min-w-0 gba:overflow-hidden"
            title={t('hr-analytics-employment')}
          >
            <span className="gba:shrink-0">
              <PiBriefcase />
            </span>
            <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-ellipsis gba:overflow-hidden">
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
