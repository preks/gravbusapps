import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ChartBarIcon, DropIcon, HouseIcon, GaugeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

// Import the investment report components
import EquityInvestmentsReport from './equity-analytics/EquityInvestmentsReport'
import LiquidFundInvestmentsReport from './liquid-fund-analytics/LiquidFundInvestmentsReport'
import RealEstateInvestmentsReport from './real-estate-analytics/RealEstateInvestmentsReport'
import { InvestmentPortfolioOverview } from './overview'

export interface AnalyticsViewProps extends BusinessAppContextProps {
  moduleColor?: string
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = props => {
  const [activeTab, setActiveTab] = useState('overview')

  // Get initial tab from URL query parameters
  const getInitialTab = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('analyticsTab')

    // Valid analytics tab values
    if (tabFromUrl && ['overview', 'equity', 'liquid-funds', 'real-estate'].includes(tabFromUrl)) {
      return tabFromUrl
    }

    // Default to overview
    return 'overview'
  }, [])

  // Update URL when tab changes using safe navigation
  const updateUrl = useCallback((tab: string) => {
    try {
      const currentUrl = new URL(window.location.href)
      const params: Record<string, string> = {}

      // Preserve existing query parameters
      for (const [key, value] of currentUrl.searchParams.entries()) {
        params[key] = value
      }

      // Update the analytics tab parameter
      params.analyticsTab = tab

      // Use platform URL builder for safe navigation
      const newUrl = buildPlatformUrl(currentUrl.pathname, params)

      // Use safe history manipulation
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newUrl)
      }
    } catch (error) {
      console.warn('Failed to update URL in analytics view:', error)
    }
  }, [])

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value)
      updateUrl(value)
    },
    [updateUrl]
  )

  // Initialize tab from URL on mount
  useEffect(() => {
    const initialTab = getInitialTab()
    setActiveTab(initialTab)
  }, [getInitialTab])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialTab])

  return (
    <div
      data-testid={formatDataTestId('AnalyticsView', 'Container')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Analytics Tabs */}
      <div className="gba:bg-white gba:rounded-lg gba:shadow-sm">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          data-testid={formatDataTestId('AnalyticsView', 'AnalyticsTabs')}
          className="gba:w-full"
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-4 gba:p-1">
            <TabsTrigger
              value="overview"
              startIcon={<GaugeIcon />}
              data-testid={formatDataTestId('AnalyticsView', 'OverviewTab')}
            >
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger
              value="equity"
              startIcon={<ChartBarIcon />}
              data-testid={formatDataTestId('AnalyticsView', 'EquityTab')}
            >
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.equity', 'Equity Investments')}
            </TabsTrigger>
            <TabsTrigger
              value="liquid-funds"
              startIcon={<DropIcon />}
              data-testid={formatDataTestId('AnalyticsView', 'LiquidFundsTab')}
            >
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.liquidFunds', 'Liquid Funds')}
            </TabsTrigger>
            <TabsTrigger
              value="real-estate"
              startIcon={<HouseIcon />}
              data-testid={formatDataTestId('AnalyticsView', 'RealEstateTab')}
            >
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.realEstate', 'Real Estate')}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'OverviewContent')}
          >
            <InvestmentPortfolioOverview {...props} prefixDataTestId="AnalyticsView-Overview" />
          </TabsContent>

          <TabsContent
            value="equity"
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'EquityContent')}
          >
            <EquityInvestmentsReport {...props} prefixDataTestId="AnalyticsView-Equity" />
          </TabsContent>

          <TabsContent
            value="liquid-funds"
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'LiquidFundsContent')}
          >
            <LiquidFundInvestmentsReport {...props} prefixDataTestId="AnalyticsView-LiquidFunds" />
          </TabsContent>

          <TabsContent
            value="real-estate"
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'RealEstateContent')}
          >
            <RealEstateInvestmentsReport {...props} prefixDataTestId="AnalyticsView-RealEstate" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AnalyticsView
