import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ChartBarIcon, GaugeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentGroups } from '../investment-view/hooks/useInvestmentGroups'
import { InvestmentPortfolioOverview } from './overview'
import { GenericInvestmentGroupAnalyticsReport } from './group-analytics'

const DEFAULT_ANALYTICS_TAB = 'overview'
const DEFAULT_ANALYTICS_SECTION = 'distribution'
const VALID_ANALYTICS_SECTIONS = new Set(['distribution', 'timeline', 'performance'])

export interface AnalyticsViewProps extends BusinessAppContextProps {
  moduleColor?: string
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = props => {
  const [activeTab, setActiveTab] = useState(DEFAULT_ANALYTICS_TAB)
  const [activeChartTab, setActiveChartTab] = useState(DEFAULT_ANALYTICS_SECTION)
  const { catalogData, investmentGroups, isLoading: groupsLoading } = useInvestmentGroups(props.accessToken || '')

  const validTabIds = useMemo(
    () => new Set([DEFAULT_ANALYTICS_TAB, ...investmentGroups.map(group => group.tabId)]),
    [investmentGroups]
  )

  const normalizeTab = useCallback(
    (value?: string | null) => {
      return value && validTabIds.has(value) ? value : DEFAULT_ANALYTICS_TAB
    },
    [validTabIds]
  )

  const normalizeAnalyticsSection = useCallback((value?: string | null) => {
    return value && VALID_ANALYTICS_SECTIONS.has(value) ? value : DEFAULT_ANALYTICS_SECTION
  }, [])

  const replaceUrlState = useCallback((tab: string, section: string) => {
    try {
      const currentUrl = new URL(globalThis.location.href)
      const params: Record<string, string> = {}

      // Preserve existing query parameters
      for (const [key, value] of currentUrl.searchParams.entries()) {
        params[key] = value
      }

      params.analyticsTab = tab
      params.analyticsSection = section

      const newUrl = buildPlatformUrl(currentUrl.pathname, params)

      globalThis.history?.replaceState?.({}, '', newUrl)
    } catch (error) {
      console.warn('Failed to update URL in analytics view:', error)
    }
  }, [])

  const getUrlState = useCallback(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const rawTab = urlParams.get('analyticsTab')
    const rawSection = urlParams.get('analyticsSection')

    return {
      rawSection,
      rawTab,
      section: normalizeAnalyticsSection(rawSection),
      tab: normalizeTab(rawTab)
    }
  }, [normalizeAnalyticsSection, normalizeTab])

  const handleTabChange = useCallback(
    (value: string) => {
      const normalizedTab = normalizeTab(value)
      const nextSection = normalizedTab === activeTab ? activeChartTab : DEFAULT_ANALYTICS_SECTION

      setActiveTab(normalizedTab)
      setActiveChartTab(nextSection)
      replaceUrlState(normalizedTab, nextSection)
    },
    [activeChartTab, activeTab, normalizeTab, replaceUrlState]
  )

  const handleChartTabChange = useCallback(
    (value: string) => {
      const normalizedSection = normalizeAnalyticsSection(value)
      setActiveChartTab(normalizedSection)
      replaceUrlState(activeTab, normalizedSection)
    },
    [activeTab, normalizeAnalyticsSection, replaceUrlState]
  )

  const hasInvestmentTypesByGroupId = useMemo(
    () =>
      Object.fromEntries(
        investmentGroups.map(group => [
          group.id,
          catalogData.investmentTypes.some(
            type =>
              type.parentEntryId === group.id ||
              type.parentEntry?.id === group.id ||
              Boolean(group.code && type.parentEntry?.code === group.code)
          )
        ])
      ),
    [catalogData.investmentTypes, investmentGroups]
  )

  // Initialize tab and chart section from URL query parameters.
  useEffect(() => {
    if (groupsLoading) return

    const urlState = getUrlState()
    setActiveTab(urlState.tab)
    setActiveChartTab(urlState.section)

    if (
      (urlState.rawTab && urlState.rawTab !== urlState.tab) ||
      (urlState.rawSection && urlState.rawSection !== urlState.section)
    ) {
      replaceUrlState(urlState.tab, urlState.section)
    }
  }, [getUrlState, groupsLoading, replaceUrlState])

  useEffect(() => {
    setActiveTab(tab => normalizeTab(tab))
  }, [normalizeTab])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlState = getUrlState()
      setActiveTab(urlState.tab)
      setActiveChartTab(urlState.section)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [getUrlState])

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
          <TabsList className="gba:flex gba:w-full gba:flex-wrap gba:gap-2 gba:p-1">
            <TabsTrigger
              value="overview"
              startIcon={<GaugeIcon />}
              data-testid={formatDataTestId('AnalyticsView', 'OverviewTab')}
            >
              {getTranslationFromI18nKeyAndLabel('analytics.tabs.overview', 'Overview')}
            </TabsTrigger>
            {investmentGroups.map(group => (
              <TabsTrigger
                key={group.id}
                value={group.tabId}
                startIcon={<ChartBarIcon />}
                data-testid={formatDataTestId('AnalyticsView', `${group.tabId}-Tab`)}
              >
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value="overview"
            className="gba:mt-6"
            data-testid={formatDataTestId('AnalyticsView', 'OverviewContent')}
          >
            <InvestmentPortfolioOverview {...props} prefixDataTestId="AnalyticsView-Overview" />
          </TabsContent>

          {investmentGroups.map(group => (
            <TabsContent
              key={group.id}
              value={group.tabId}
              className="gba:mt-6"
              data-testid={formatDataTestId('AnalyticsView', `${group.tabId}-Content`)}
            >
              {activeTab === group.tabId && (
                <GenericInvestmentGroupAnalyticsReport
                  {...props}
                  group={group}
                  activeChartTab={activeChartTab}
                  hasInvestmentTypes={Boolean(hasInvestmentTypesByGroupId[group.id])}
                  onChartTabChange={handleChartTabChange}
                  prefixDataTestId={`AnalyticsView-${group.tabId}`}
                  isActive
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

export default AnalyticsView
