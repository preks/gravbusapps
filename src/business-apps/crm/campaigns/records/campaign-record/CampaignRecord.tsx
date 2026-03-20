import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RecordLayout, Badge, Spinner, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import { MegaphoneIcon, CalendarIcon, TagIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignRecord, useCampaignKPIs, useCampaignAnalytics, useCampaignEntities } from './hooks'
import { CampaignKPIs, CampaignChart, CampaignEntitiesSection } from './components'
import CampaignAnalyticsStatistics from './components/analytics/CampaignAnalyticsStatistics'
import CampaignConversionFunnel from './components/analytics/CampaignConversionFunnel'
import CampaignRevenueAnalysis from './components/analytics/CampaignRevenueAnalysis'
import CampaignTopPerformers from './components/analytics/CampaignTopPerformers'
import { CampaignRecordProps } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import dayjs from 'dayjs'

type CampaignRecordComponentProps = CampaignRecordProps

const CampaignRecord: React.FC<CampaignRecordComponentProps> = ({
  campaignId: propCampaignId,
  onBack,
  activeTab: initialActiveTab = 'overview',
  onTabChange,
  ...props
}) => {
  // Extract campaignId from props or URL parameters (needed for dynamic loader)
  const campaignId = propCampaignId || new URLSearchParams(globalThis.location.search).get('campaignId') || ''

  // Handle back navigation - always go to customer relations campaigns view
  const handleBackNavigation = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      // Always navigate to customer relations campaigns view
      navigateTo(buildPlatformUrl('/platform/crm/customer-relations', { view: 'campaigns' }))
    }
  }, [onBack])

  const [activeTab, setActiveTab] = useState(initialActiveTab)

  // Update local state when prop changes
  useEffect(() => {
    setActiveTab(initialActiveTab)
  }, [initialActiveTab])

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab)
      if (onTabChange) {
        onTabChange(tab)
      }
    },
    [onTabChange]
  )

  // Create stable context object to prevent infinite re-renders
  const stableContext = useMemo(
    () => ({ accessToken: props.accessToken }) as BusinessAppContextProps,
    [props.accessToken]
  )

  // Fetch campaign record data
  const { campaign, isLoading: campaignLoading, error: campaignError } = useCampaignRecord(stableContext, campaignId)

  // Fetch campaign KPIs data
  const {
    kpis,
    kpisWithTrends,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKPIs
  } = useCampaignKPIs(stableContext, campaignId)

  // Fetch campaign analytics data
  const {
    analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useCampaignAnalytics(stableContext, campaignId)

  // Fetch campaign entities once — shared between CampaignChart and CampaignEntitiesSection
  const campaignEntities = useCampaignEntities(stableContext, campaignId)

  // Helper functions for campaign status - MUST be before any early returns (Rules of Hooks)
  const getCampaignStatus = useCallback((startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return { status: 'Unknown', variant: 'secondary' as const }

    const now = dayjs()
    const start = dayjs(startDate)
    const end = dayjs(endDate)

    if (now.isBefore(start)) {
      return { status: 'Upcoming', variant: 'pending' as const }
    } else if (now.isAfter(end)) {
      return { status: 'Completed', variant: 'default' as const }
    } else {
      return { status: 'Active', variant: 'success' as const }
    }
  }, [])

  const calculateDuration = useCallback((startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-'
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const duration = end.diff(start, 'day')
    return `${duration} days`
  }, [])

  const formatDateRange = useCallback((startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-'
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    return `${start.format('DD MMM')} – ${end.format('DD MMM YYYY')}`
  }, [])

  // Prepare data for RecordLayout - MUST be before early returns (Rules of Hooks)
  const statusInfo = useMemo(
    () =>
      campaign
        ? getCampaignStatus(campaign.startDate, campaign.endDate)
        : { status: 'Unknown', variant: 'secondary' as const },
    [campaign, getCampaignStatus]
  )

  const headerDetailGroups = useMemo(
    () =>
      campaign
        ? [
            {
              items: [
                {
                  icon: TagIcon,
                  label: getTranslationFromI18nKeyAndLabel('campaign.type', 'Type'),
                  value: campaign.type?.value || 'Unknown Type'
                },
                {
                  icon: CalendarIcon,
                  label: getTranslationFromI18nKeyAndLabel('campaign.duration', 'Duration'),
                  value: calculateDuration(campaign.startDate, campaign.endDate)
                },
                {
                  icon: CalendarIcon,
                  label: getTranslationFromI18nKeyAndLabel('campaign.dateRange', 'Date Range'),
                  value: formatDateRange(campaign.startDate, campaign.endDate)
                }
              ]
            }
          ]
        : [],
    [campaign, calculateDuration, formatDateRange]
  )

  const headerActions = useMemo(
    () =>
      campaign ? (
        <Badge variant={statusInfo.variant} data-testid="campaign-header-status-badge">
          {statusInfo.status}
        </Badge>
      ) : null,
    [campaign, statusInfo]
  )

  const headerActionButton = useMemo(
    () =>
      props.accessToken && campaignId ? (
        <AppAction
          variant="header"
          data-testid="campaign-record-action-button"
          contexts={[
            {
              context: FlowContextName.customerCampaignEntity,
              contextData: { campaignId }
            }
          ]}
          shareContext={{
            entityType: 'campaign',
            entityId: campaignId,
            entityName: campaign?.name || 'Campaign',
            entityUrl: `/platform/crm/campaign-record?campaignId=${campaignId}`
          }}
          prefixDataTestId="campaign-record-action"
          accessToken={props.accessToken}
        />
      ) : null,
    [props.accessToken, campaignId, campaign?.name]
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('campaign.tabs.overview', 'Overview'),
          icon: <MegaphoneIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12 gba:space-y-6" data-testid="campaign-overview-container">
              {/* KPIs - Full width */}
              <div data-testid="campaign-kpis-section">
                <CampaignKPIs
                  kpis={kpis}
                  kpisWithTrends={kpisWithTrends}
                  isLoading={kpisLoading}
                  error={kpisError}
                  onRetry={refetchKPIs}
                />
              </div>

              {/* Chart - Full width */}
              <div data-testid="campaign-chart-section">
                <CampaignChart
                  campaignId={campaignId}
                  campaign={campaign}
                  allEntities={campaignEntities.entities}
                  {...stableContext}
                />
              </div>

              {/* Campaign Entities - Full width */}
              <div data-testid="campaign-entities-section" className="gba:min-h-[600px]">
                <CampaignEntitiesSection campaignId={campaignId} {...campaignEntities} {...stableContext} />
              </div>
            </div>
          )
        },
        {
          value: 'analytics',
          label: getTranslationFromI18nKeyAndLabel('campaign.tabs.analytics', 'Analytics'),
          icon: <CalendarIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12 gba:space-y-6" data-testid="campaign-analytics-container">
              {/* Analytics Statistics - Full width */}
              <div data-testid="campaign-analytics-statistics-section">
                <CampaignAnalyticsStatistics
                  metrics={analyticsData.metrics}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                  onRetry={refetchAnalytics}
                />
              </div>

              {/* Conversion Funnel - Full width */}
              <div data-testid="campaign-conversion-funnel-section">
                <CampaignConversionFunnel
                  funnelData={analyticsData.conversionFunnel}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                  onRetry={refetchAnalytics}
                />
              </div>

              {/* Revenue Analysis - Full width */}
              <div data-testid="campaign-revenue-analysis-section">
                <CampaignRevenueAnalysis
                  metrics={analyticsData.metrics}
                  timelineData={analyticsData.timelineAnalysis}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                  onRetry={refetchAnalytics}
                />
              </div>

              {/* Top Performers - Full width */}
              <div data-testid="campaign-top-performers-section">
                <CampaignTopPerformers
                  performers={analyticsData.topPerformers}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                  onRetry={refetchAnalytics}
                />
              </div>
            </div>
          )
        }
      ]
    }),
    [
      activeTab,
      handleTabChange,
      campaign,
      campaignId,
      kpis,
      kpisWithTrends,
      kpisLoading,
      kpisError,
      refetchKPIs,
      analyticsData,
      analyticsLoading,
      analyticsError,
      refetchAnalytics,
      props
    ]
  )

  // NOW we can do early returns - all hooks have been called
  if (campaignLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (campaignError || !campaign) {
    return (
      <div className="gba:p-8">
        <h1>Campaign Error</h1>
        <p>Error: {campaignError || 'Campaign not found'}</p>
        <p>Campaign ID: {campaignId}</p>
        <button onClick={handleBackNavigation}>Back to List</button>
      </div>
    )
  }

  return (
    <div data-testid="campaign-record">
      <RecordLayout
        headerOrientation="horizontal"
        headerAvatar={<IconAvatar icon={MegaphoneIcon} variant="decorative" size="xl" />}
        headerOverline={getTranslationFromI18nKeyAndLabel('campaigns.header.category', 'CAMPAIGN')}
        onBack={handleBackNavigation}
        headerTitle={campaign.name}
        headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        views={subViewsConfig.items}
        defaultView={subViewsConfig.defaultValue}
        onViewChange={subViewsConfig.onValueChange}
      />
    </div>
  )
}

export { CampaignRecord }
export default CampaignRecord
