import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RecordLayout, Badge, Button, Spinner, IconAvatar, HeaderSlot, useTranslation } from '@newwork/nw-design-system'
import { MegaphoneIcon, CalendarIcon, TagIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignRecord, useCampaignKPIs, useCampaignAnalytics } from './hooks'
import { CampaignKPIs, CampaignChart, CampaignEntitiesSection } from './components'
import CampaignEventsSection from './components/CampaignEventsSection'
import CampaignContentSection from './components/CampaignContentSection'
import CampaignAccountsSection from './components/CampaignAccountsSection'
import CampaignDetailsSection from './components/CampaignDetailsSection'
import CampaignConversionFunnel from './components/analytics/CampaignConversionFunnel'
import CampaignRevenueAnalysis from './components/analytics/CampaignRevenueAnalysis'
import { CampaignRecordProps } from './types'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '../../_i18n'
import { getBadgeVariantFromCatalog } from '@/common/utils/badgeUtils'
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
  const { t } = useTranslation(translations)
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
  const isOverviewTabActive = activeTab === 'overview'
  const isAnalyticsTabActive = activeTab === 'analytics'

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
  } = useCampaignKPIs(stableContext, campaignId, { enabled: isOverviewTabActive })

  // Fetch campaign analytics data
  const {
    analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useCampaignAnalytics(stableContext, campaignId, {
    enabled: isAnalyticsTabActive && Boolean(campaign),
    startDate: campaign?.startDate,
    endDate: campaign?.endDate
  })

  // Helper functions for campaign status - MUST be before any early returns (Rules of Hooks)
  const getCampaignStatus = useCallback((statusEntry?: { value?: string; code?: string; objectValue?: any }) => {
    if (statusEntry?.value) {
      const catalogVariant = getBadgeVariantFromCatalog(statusEntry)
      if (catalogVariant && catalogVariant !== 'default') {
        return { status: statusEntry.value, variant: catalogVariant }
      }
      const lower = statusEntry.value.toLowerCase()
      if (lower.includes('active')) return { status: statusEntry.value, variant: 'success' as const }
      if (lower.includes('paused')) return { status: statusEntry.value, variant: 'warning' as const }
      if (lower.includes('completed')) return { status: statusEntry.value, variant: 'default' as const }
      if (lower.includes('planned')) return { status: statusEntry.value, variant: 'pending' as const }
      return { status: statusEntry.value, variant: 'secondary' as const }
    }

    return { status: statusEntry?.code || 'Unknown', variant: 'secondary' as const }
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
        ? getCampaignStatus(campaign.customerCampaignStatus)
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
                  label: t('campaign-type'),
                  value: campaign.type?.value || 'Unknown Type'
                },
                {
                  icon: CalendarIcon,
                  label: t('campaign-duration'),
                  value: calculateDuration(campaign.startDate, campaign.endDate)
                },
                {
                  icon: CalendarIcon,
                  label: t('campaign-dateRange'),
                  value: formatDateRange(campaign.startDate, campaign.endDate)
                },
                ...(campaign.customerCampaignSegment
                  ? [
                      {
                        icon: TagIcon,
                        label: t('campaign-segment'),
                        value: campaign.customerCampaignSegment.value
                      }
                    ]
                  : []),
                ...(campaign.budgetAllocated == null
                  ? []
                  : [
                      {
                        icon: TagIcon,
                        label: t('campaign-budget'),
                        value: `$${Number(campaign.budgetAllocated).toLocaleString()}`
                      }
                    ]),
                ...(campaign.ownerEmployee
                  ? [
                      {
                        icon: TagIcon,
                        label: t('campaign-owner'),
                        value: campaign.ownerEmployee.displayName
                      }
                    ]
                  : [])
              ]
            }
          ]
        : [],
    [campaign, calculateDuration, formatDateRange, t]
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
          label: t('campaign-tabs-overview'),
          icon: <MegaphoneIcon className="gba:mr-2" />,
          content: isOverviewTabActive ? (
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

              {/* Campaign details (strategic, financial, description) */}
              <div data-testid="campaign-details-wrapper">
                {campaign ? <CampaignDetailsSection campaign={campaign} /> : null}
              </div>

              {/* Chart - Full width */}
              <div data-testid="campaign-chart-section">
                <CampaignChart campaignId={campaignId} campaign={campaign} {...stableContext} />
              </div>

              {/* Target Accounts */}
              <div data-testid="campaign-accounts-wrapper">
                <CampaignAccountsSection campaignId={campaignId} {...stableContext} />
              </div>

              {/* Events */}
              <div data-testid="campaign-events-wrapper">
                <CampaignEventsSection campaignId={campaignId} {...stableContext} />
              </div>

              {/* Content */}
              <div data-testid="campaign-content-wrapper">
                <CampaignContentSection campaignId={campaignId} {...stableContext} />
              </div>

              {/* Campaign Entities - Full width */}
              <div data-testid="campaign-entities-section" className="gba:min-h-[600px]">
                <CampaignEntitiesSection campaignId={campaignId} {...stableContext} />
              </div>
            </div>
          ) : null
        },
        {
          value: 'analytics',
          label: t('campaign-tabs-analytics'),
          icon: <CalendarIcon className="gba:mr-2" />,
          content: isAnalyticsTabActive ? (
            <div className="gba:col-span-12 gba:space-y-6" data-testid="campaign-analytics-container">
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
                  entityTimelineData={analyticsData.entityTimelineAnalysis}
                  revenueTimelineData={analyticsData.revenueTrendAnalysis}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                  onRetry={refetchAnalytics}
                />
              </div>
            </div>
          ) : null
        }
      ]
    }),
    [
      activeTab,
      handleTabChange,
      campaign,
      campaignId,
      isOverviewTabActive,
      isAnalyticsTabActive,
      kpis,
      kpisWithTrends,
      kpisLoading,
      kpisError,
      refetchKPIs,
      analyticsData,
      analyticsLoading,
      analyticsError,
      refetchAnalytics,
      stableContext
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
      <div className="gba:p-8 gba:space-y-4" data-testid="campaign-record-error">
        <h1 className="gba:text-xl gba:font-semibold">{t('campaign-error-title')}</h1>
        <p className="gba:text-muted-foreground">{campaignError || t('campaign-error-notFound')}</p>
        <Button variant="outline" onClick={handleBackNavigation} data-testid="campaign-error-back-button">
          {t('campaign-error-backToList')}
        </Button>
      </div>
    )
  }

  return (
    <RecordLayout
      data-testid="campaign-record"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={MegaphoneIcon} variant="decorative" size="xl" />}
      headerOverline={t('campaigns-header-category')}
      onBack={handleBackNavigation}
      headerTitle={campaign.name}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActions={headerActions}
      headerActionButton={headerActionButton}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

export { CampaignRecord }
export default CampaignRecord
