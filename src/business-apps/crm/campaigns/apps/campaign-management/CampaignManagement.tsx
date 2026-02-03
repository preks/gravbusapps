import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesCampaignData } from './components/campaign-list/hooks/useSalesCampaignData'
import { useCampaignFilters } from './components/campaign-list/hooks/useCampaignFilters'
import { useGetCampaignTypes } from './components/campaign-list/hooks/useGetCampaignTypes'
import { CampaignStatistics, AddCampaignModal } from './components'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { SalesCampaign } from './components/campaign-list/types/SalesCampaignTypes'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createCampaignColumns, createCampaignSortableColumns } from './config/campaignColumns'
import { campaignFilterConfig } from './config/campaignFilters'
import type { TimelinePeriod } from './components/campaigns-analytics/types/CampaignsAnalyticsTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

// Import shared Campaign Management Layout
import { CampaignManagementLayout } from '@/common/components/customer/campaign-management'
import type { Campaign } from '@/common/components/customer/campaign-management'

// Import campaigns analytics components
import { useCampaignsAnalytics } from './components/campaigns-analytics'
import CampaignsAnalyticsStatistics from './components/campaigns-analytics/components/CampaignsAnalyticsStatistics'
import CampaignsPerformanceComparison from './components/campaigns-analytics/components/CampaignsPerformanceComparison'
import CampaignsTimelineAnalysis from './components/campaigns-analytics/components/CampaignsTimelineAnalysis'
import CampaignsTopPerformers from './components/campaigns-analytics/components/CampaignsTopPerformers'
import CampaignsRevenueAnalysis from './components/campaigns-analytics/components/CampaignsRevenueAnalysis'
import CampaignsRevenueEfficiency from './components/campaigns-analytics/components/CampaignsRevenueEfficiency'

interface CampaignManagementContentProps extends BusinessAppContextProps {
  onBack?: () => void
}

// Extracted campaign actions component
const CampaignRowActions: React.FC<{
  campaignId: string
  accessToken: string
}> = ({ campaignId, accessToken }) => (
  <AppAction
    variant="table-row"
    contexts={[
      {
        context: FlowContextName.customerCampaignEntity,
        contextData: { campaignId }
      }
    ]}
    prefixDataTestId="campaign-actions"
    accessToken={accessToken}
    emptyState="enable"
    lazyLoad
    data-testid={`campaign-actions-${campaignId}`}
  />
)

/**
 * Helper: Process date range filter and normalize it
 * Handles both array format ["2025-12-29", "2026-02-22"] and string format "2025-12-29,2026-02-22"
 * Converts to ISO datetime strings with proper time boundaries
 */
const processDateRangeFilter = (filters: Record<string, any>, rangeKey: string) => {
  const rangeValue = filters[rangeKey]

  const normalized = normalizeDateRange(rangeValue)

  if (!normalized || (!normalized.from && !normalized.to)) {
    return { from: undefined, to: undefined }
  }

  // Convert date strings to ISO datetime with time boundaries
  const from = normalized.from ? new Date(normalized.from + 'T00:00:00.000Z').toISOString() : undefined
  const to = normalized.to ? new Date(normalized.to + 'T23:59:59.999Z').toISOString() : undefined

  return { from, to }
}

/**
 * Helper: Map type and status filters to old hook format
 */
const mapFiltersToOldFormat = (filters: Record<string, any>): string[] => {
  const newSelectedFilters: string[] = []

  if (filters.types && Array.isArray(filters.types)) {
    newSelectedFilters.push(...filters.types.map((id: string) => `TYPE_${id}`))
  }

  if (filters.status && Array.isArray(filters.status)) {
    newSelectedFilters.push(...filters.status.map((id: string) => `STATUS_${id}`))
  }

  return newSelectedFilters
}

/**
 * Common analytics component props to eliminate duplication
 */
interface CommonAnalyticsProps {
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

/**
 * Helper: Create analytics component props with common values
 */
const createAnalyticsProps = (
  baseProps: CommonAnalyticsProps,
  dataProps: Record<string, any>
): CommonAnalyticsProps & Record<string, any> => ({
  ...dataProps,
  isLoading: baseProps.isLoading,
  error: baseProps.error,
  onRetry: baseProps.onRetry
})

// Helper to build dynamic filter configuration
const buildDynamicFilterConfig = (campaignTypeOptions: Array<{ id: string; label: string }>) => {
  const config = structuredClone(campaignFilterConfig)
  const typeGroup = config.groups.find((g: { id: string }) => g.id === 'type-group')

  if (typeGroup && campaignTypeOptions?.length > 0) {
    const typeFilter = typeGroup.filters.find((f: { id: string }) => f.id === 'types')
    if (typeFilter?.config && 'options' in typeFilter.config) {
      typeFilter.config.options = campaignTypeOptions.map(t => ({
        id: t.id,
        label: t.label
      }))
    }
  }

  return config
}

// Helper to determine campaign status from dates
const getCampaignStatus = (campaign: SalesCampaign): string => {
  if (!campaign.startDate || !campaign.endDate) {
    return 'planned'
  }

  const now = new Date()
  const startDate = new Date(campaign.startDate)
  const endDate = new Date(campaign.endDate)

  if (now >= startDate && now <= endDate) {
    return 'active'
  }
  if (now > endDate) {
    return 'completed'
  }
  return 'planned'
}

// Helper to filter campaigns by status (client-side)
const filterCampaignsByStatus = (campaigns: SalesCampaign[], statusFilters: string[] | undefined): SalesCampaign[] => {
  if (!statusFilters || statusFilters.length === 0) {
    return campaigns
  }

  return campaigns.filter(campaign => {
    const status = getCampaignStatus(campaign)
    return statusFilters.includes(status)
  })
}

const CampaignManagementContent: React.FC<CampaignManagementContentProps> = props => {
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Analytics timeline period state
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>('last-year')

  // Filter state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Sorting state
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  // Use the centralized campaign filters hook
  const campaignFilters = useCampaignFilters(props)
  const { search, setSearch, filtersInitialized } = campaignFilters

  // Fetch campaign data
  const {
    campaigns,
    isLoading,
    error,
    statistics,
    isStatisticsLoading,
    statisticsError,
    refetch,
    processFiltersAndFetch,
    refetchStatistics
  } = useSalesCampaignData(props)

  // Campaigns analytics data (lazy-loaded)
  const {
    analyticsData,
    isLoading: analyticsLoading,
    isTimelineLoading,
    error: analyticsError,
    timelineError,
    refetch: refetchAnalytics,
    fetchAnalytics,
    refetchTimeline
  } = useCampaignsAnalytics(props, { timelinePeriod })

  // Campaign types for filter
  const { campaignTypeOptions } = useGetCampaignTypes(props)

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => buildDynamicFilterConfig(campaignTypeOptions || []), [campaignTypeOptions])

  // Client-side status filtering
  const filteredCampaigns = useMemo(
    () => filterCampaignsByStatus(campaigns, selectedFilters.status),
    [campaigns, selectedFilters.status]
  )

  // Handle filter changes from DataDisplay
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    // Map date ranges to separate after/before values
    const startDate = processDateRangeFilter(filters, 'startDateRange')
    const endDate = processDateRangeFilter(filters, 'endDateRange')
    const createdDate = processDateRangeFilter(filters, 'createdAtRange')

    // Map type and status filters
    const newSelectedFilters = mapFiltersToOldFormat(filters)

    // Update local state with ALL filter data (including processed dates)
    setSelectedFilters({
      ...filters,
      // Store processed date values in state
      _processedStartDateAfter: startDate.from,
      _processedStartDateBefore: startDate.to,
      _processedEndDateAfter: endDate.from,
      _processedEndDateBefore: endDate.to,
      _processedCreatedAfter: createdDate.from,
      _processedCreatedBefore: createdDate.to,
      // Store campaign type filters
      _processedCampaignTypes: newSelectedFilters
    })
  }, [])

  // Handle sorting changes from DataDisplay
  const handleSortChange = useCallback((field: string, order: 'ASC' | 'DESC') => {
    setSortField(field)
    setSortOrder(order)
  }, [])

  // Sync filters and trigger fetch
  useEffect(() => {
    if (!filtersInitialized) {
      return
    }

    // Extract processed values from selectedFilters state
    const startDateAfter = selectedFilters._processedStartDateAfter
    const startDateBefore = selectedFilters._processedStartDateBefore
    const endDateAfter = selectedFilters._processedEndDateAfter
    const endDateBefore = selectedFilters._processedEndDateBefore
    const createdAfter = selectedFilters._processedCreatedAfter
    const createdBefore = selectedFilters._processedCreatedBefore
    const campaignTypesArray = selectedFilters._processedCampaignTypes || []

    processFiltersAndFetch({
      search: search,
      selectedFilters: campaignTypesArray,
      startDateAfter,
      startDateBefore,
      endDateAfter,
      endDateBefore,
      createdAfter,
      createdBefore,
      sortField: sortField,
      sortOrder: sortOrder,
      offset: 0,
      limit: 10000
    })
  }, [search, selectedFilters, sortField, sortOrder, filtersInitialized, processFiltersAndFetch])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    refetch()
    refetchStatistics()
  }, [refetch, refetchStatistics])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Modal handlers
  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false)
  }, [])

  const handleSubmitCampaign = async () => {
    setIsAddModalOpen(false)
    refetch()
  }

  const handleAddCampaign = useCallback(() => {
    setIsAddModalOpen(true)
  }, [])

  // Navigation handler for row clicks
  const handleCampaignRowClick = useCallback((campaign: Campaign) => {
    const url = buildPlatformUrl('/platform/crm/campaign-record', {
      campaignId: campaign.id,
      source: 'campaign-management'
    })
    navigateTo(url)
  }, [])

  // Columns
  const columns = useMemo(() => createCampaignColumns(), [])

  // Render actions for each campaign row
  const renderCampaignActions = useCallback(
    (row: { original: Campaign }) => (
      <div role="presentation" onClick={e => e.stopPropagation()}>
        <CampaignRowActions campaignId={row.original.id} accessToken={props.accessToken} />
      </div>
    ),
    [props.accessToken]
  )

  // Render statistics section
  const renderStatistics = useCallback(() => {
    return (
      <div className="gba:mb-6" data-testid="campaign-statistics-section">
        <CampaignStatistics
          statistics={
            statistics || { totalCampaigns: 0, activeCampaigns: 0, completedCampaigns: 0, averageDuration: 0 }
          }
          isLoading={isStatisticsLoading}
          error={statisticsError}
          onRetry={refetchStatistics}
        />
      </div>
    )
  }, [statistics, isStatisticsLoading, statisticsError, refetchStatistics])

  // Render analytics section
  const renderAnalytics = useCallback(() => {
    const commonProps: CommonAnalyticsProps = {
      isLoading: analyticsLoading,
      error: analyticsError,
      onRetry: refetchAnalytics
    }

    const timelineProps: CommonAnalyticsProps = {
      isLoading: isTimelineLoading || analyticsLoading,
      error: timelineError || analyticsError,
      onRetry: () => {
        void refetchTimeline()
      }
    }

    return (
      <>
        <CampaignsAnalyticsStatistics
          {...createAnalyticsProps(commonProps, {
            metrics: analyticsData.metrics
          })}
        />

        <CampaignsTimelineAnalysis
          {...createAnalyticsProps(timelineProps, {
            timelineAnalysis: analyticsData.timelineAnalysis,
            timelinePeriod,
            onTimelinePeriodChange: setTimelinePeriod
          })}
        />

        <CampaignsPerformanceComparison
          {...createAnalyticsProps(commonProps, {
            campaignComparisons: analyticsData.campaignComparisons
          })}
        />

        <CampaignsRevenueAnalysis
          {...createAnalyticsProps(commonProps, {
            revenueComparisons: analyticsData.revenueComparisons
          })}
        />

        <CampaignsRevenueEfficiency
          {...createAnalyticsProps(commonProps, {
            efficiencyComparisons: analyticsData.efficiencyComparisons
          })}
        />

        <CampaignsTopPerformers
          {...createAnalyticsProps(commonProps, {
            topCampaigns: analyticsData.topCampaigns,
            topEmployees: analyticsData.topEmployees
          })}
        />
      </>
    )
  }, [
    analyticsData,
    analyticsLoading,
    analyticsError,
    isTimelineLoading,
    timelineError,
    timelinePeriod,
    refetchAnalytics,
    refetchTimeline
  ])

  // Use the shared CampaignManagementLayout component
  return (
    <>
      <CampaignManagementLayout
        {...props}
        // Data
        campaigns={filteredCampaigns}
        statistics={statistics}
        analyticsData={analyticsData}
        campaignTypeOptions={campaignTypeOptions || []}
        // Loading states
        isLoading={isLoading}
        isStatisticsLoading={isStatisticsLoading}
        isAnalyticsLoading={analyticsLoading}
        isTimelineLoading={isTimelineLoading}
        // Error states
        error={error}
        statisticsError={statisticsError}
        analyticsError={analyticsError}
        timelineError={timelineError}
        // Search and filters
        search={search}
        onSearchChange={setSearch}
        selectedFilters={[]}
        onFilterChange={handleFilterChange}
        // Sorting
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        // Actions
        onRefetch={refetch}
        onRefetchStatistics={refetchStatistics}
        onRefetchAnalytics={refetchAnalytics}
        onRefetchTimeline={refetchTimeline}
        onFetchAnalytics={fetchAnalytics}
        onCampaignRowClick={handleCampaignRowClick}
        onAddCampaign={handleAddCampaign}
        // Analytics timeline
        timelinePeriod={timelinePeriod as string}
        onTimelinePeriodChange={setTimelinePeriod as (period: string) => void}
        // Flow contexts
        campaignEntityContext={FlowContextName.customerCampaignEntity}
        campaignCreateContext={FlowContextName.customerCampaignCreate}
        // Rendering functions
        columns={columns}
        renderCampaignActions={renderCampaignActions}
        renderStatistics={renderStatistics}
        renderAnalytics={renderAnalytics}
        // Configuration
        filterConfiguration={dynamicFilterConfig}
        sortableColumns={createCampaignSortableColumns()}
      />

      {/* Add Campaign Modal */}
      <AddCampaignModal isOpen={isAddModalOpen} onClose={handleCloseModal} onSubmit={handleSubmitCampaign} {...props} />
    </>
  )
}

interface CampaignManagementProps extends BusinessAppContextProps {
  onBack?: () => void
}

const CampaignManagement: React.FC<CampaignManagementProps> = props => {
  return <CampaignManagementContent {...props} />
}

export default CampaignManagement
