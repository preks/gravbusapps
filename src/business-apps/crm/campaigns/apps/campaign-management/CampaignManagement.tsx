import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { useSalesCampaignManagementData as useSalesCampaignData } from '@/common/data/customer/hooks/useSalesCampaignManagementData'
import { useCampaignFilters } from './components/campaign-list/hooks/useCampaignFilters'
import {
  useCampaignCatalogOptions as useGetCampaignCatalogOptions,
  useCampaignTypes as useGetCampaignTypes
} from '@/common/data/customer/hooks/useCampaignCatalogOptions'
import { CampaignStatistics } from './components'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createCampaignColumns, createCampaignSortableColumns } from './config/campaignColumns'
import { campaignFilterConfig } from './config/campaignFilters'
import type { TimelinePeriod } from './components/campaigns-analytics/types/CampaignsAnalyticsTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { CAMPAIGN_STATUS } from '@/common/data/customer/constants/customerCatalogs'

// Import shared Campaign Management Layout
import { CampaignManagementLayout } from '@/common/components/customer/campaign-management'
import type { Campaign } from '@/common/components/customer/campaign-management'

// Import campaigns analytics components
import { useCampaignsAnalytics } from '@/common/data/customer/hooks/useCampaignsAnalytics'
import CampaignsAnalyticsStatistics from './components/campaigns-analytics/components/CampaignsAnalyticsStatistics'
import CampaignsPerformanceComparison from './components/campaigns-analytics/components/CampaignsPerformanceComparison'
import CampaignsTimelineAnalysis from './components/campaigns-analytics/components/CampaignsTimelineAnalysis'
import CampaignsTopPerformers from './components/campaigns-analytics/components/CampaignsTopPerformers'
import CampaignsRevenueAnalysis from './components/campaigns-analytics/components/CampaignsRevenueAnalysis'
import CampaignsRevenueEfficiency from './components/campaigns-analytics/components/CampaignsRevenueEfficiency'

// Import campaign insights
import CampaignInsights from './components/campaign-dashboards/CampaignInsights'

// Import hero section
import { CampaignHeroSection } from './components/CampaignHeroSection'

interface CampaignManagementContentProps extends BusinessAppContextProps {
  onBack?: () => void
  showHero?: boolean
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
const buildDynamicFilterConfig = (
  campaignTypeOptions: Array<{ id: string; label: string }>,
  campaignStatusOptions: Array<{ id: string; label: string }>
) => {
  const config = structuredClone(campaignFilterConfig)
  const typeGroup = config.groups.find((g: { id: string }) => g.id === 'type-group')
  const statusGroup = config.groups.find((g: { id: string }) => g.id === 'status-group')

  if (typeGroup && campaignTypeOptions?.length > 0) {
    const typeFilter = typeGroup.filters.find((f: { id: string }) => f.id === 'types')
    if (typeFilter?.config && 'options' in typeFilter.config) {
      typeFilter.config.options = campaignTypeOptions.map(t => ({
        id: t.id,
        label: t.label
      }))
    }
  }

  if (statusGroup && campaignStatusOptions?.length > 0) {
    const statusFilter = statusGroup.filters.find((f: { id: string }) => f.id === 'status')
    if (statusFilter?.config && 'options' in statusFilter.config) {
      statusFilter.config.options = campaignStatusOptions.map(status => ({
        id: status.id,
        label: status.label
      }))
    }
  }

  return config
}

/**
 * Convert raw DataDisplay filters into the internal format used by processFiltersAndFetch.
 * Extracted so the same logic can be used at initialization time (from localStorage)
 * and whenever the user changes filters at runtime.
 */
const buildProcessedFilters = (filters: Record<string, any>): Record<string, any> => {
  const startDate = processDateRangeFilter(filters, 'startDateRange')
  const endDate = processDateRangeFilter(filters, 'endDateRange')
  const createdDate = processDateRangeFilter(filters, 'createdAtRange')
  const processedCampaignTypes = mapFiltersToOldFormat(filters)

  return {
    ...filters,
    _processedStartDateAfter: startDate.from,
    _processedStartDateBefore: startDate.to,
    _processedEndDateAfter: endDate.from,
    _processedEndDateBefore: endDate.to,
    _processedCreatedAfter: createdDate.from,
    _processedCreatedBefore: createdDate.to,
    _processedCampaignTypes: processedCampaignTypes
  }
}

const CampaignManagementContent: React.FC<CampaignManagementContentProps> = props => {
  // Persist filters, sorting, and visible columns across navigation
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:campaign-management-preferences:v1')

  // Analytics timeline period state
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>('last-year')

  // Filter state — initialize from localStorage on first mount
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(() =>
    Object.keys(initialFilters).length > 0 ? buildProcessedFilters(initialFilters) : {}
  )

  // Sorting state — initialize from localStorage on first mount
  const storedSort = initialSorting?.[0]
  const [sortField, setSortField] = useState<string>(storedSort?.id ?? 'createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(storedSort?.desc === false ? 'ASC' : 'DESC')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Use the centralized campaign filters hook
  const campaignFilters = useCampaignFilters(props)
  const { search, setSearch, filtersInitialized } = campaignFilters

  // Fetch campaign data
  const {
    campaigns,
    totalCount,
    isLoading,
    error,
    statistics,
    isStatisticsLoading,
    statisticsError,
    refetch,
    fetchSalesCampaignsWithCount,
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
  const { options: campaignStatusOptions } = useGetCampaignCatalogOptions(props, CAMPAIGN_STATUS)

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(
    () => buildDynamicFilterConfig(campaignTypeOptions || [], campaignStatusOptions || []),
    [campaignTypeOptions, campaignStatusOptions]
  )

  // Handle filter changes from DataDisplay
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(buildProcessedFilters(filters))
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      // Persist only the raw (user-facing) filters — no _processed* internal keys
      saveFilters(filters)
    },
    [saveFilters]
  )

  // Handle sorting changes from DataDisplay
  const handleSortChange = useCallback(
    (field: string, order: 'ASC' | 'DESC') => {
      setSortField(field)
      setSortOrder(order)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      saveSorting([{ id: field, desc: order === 'DESC' }])
    },
    [saveSorting]
  )

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearch(newSearch)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    },
    [setSearch]
  )

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
      offset: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize
    })
  }, [
    search,
    selectedFilters,
    sortField,
    sortOrder,
    pagination.pageIndex,
    pagination.pageSize,
    filtersInitialized,
    processFiltersAndFetch
  ])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    refetch()
    refetchStatistics()
  }, [refetch, refetchStatistics])

  useProcessCompletion({ onSuccess: handleProcessComplete })

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
    const handleTimelinePeriodChange = (period: TimelinePeriod) => {
      setTimelinePeriod(period)
      refetchTimeline(period).catch(() => undefined)
    }

    const commonProps: CommonAnalyticsProps = {
      isLoading: analyticsLoading,
      error: analyticsError,
      onRetry: refetchAnalytics
    }

    const timelineProps: CommonAnalyticsProps = {
      isLoading: isTimelineLoading || analyticsLoading,
      error: timelineError || analyticsError,
      onRetry: () => {
        refetchTimeline().catch(() => undefined)
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
            onTimelinePeriodChange: handleTimelinePeriodChange
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
            topCampaigns: analyticsData.topCampaigns
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

  // Render insights section
  const renderInsights = useCallback(() => {
    return <CampaignInsights {...props} />
  }, [props])

  const handleTabDataFetch = useCallback(
    (tab: 'overview' | 'analytics' | 'insights') => {
      if (tab === 'overview') {
        refetch()
        refetchStatistics()
        return
      }

      if (tab === 'analytics') {
        fetchAnalytics()
      }
    },
    [refetch, refetchStatistics, fetchAnalytics]
  )

  const showHero = props.showHero !== false

  // Use the shared CampaignManagementLayout component
  return (
    <>
      {showHero && <CampaignHeroSection />}
      <CampaignManagementLayout
        {...props}
        // Data
        campaigns={campaigns}
        totalCount={totalCount}
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
        onSearchChange={handleSearchChange}
        selectedFilters={[]}
        onFilterChange={handleFilterChange}
        // Sorting
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        pagination={pagination}
        onPaginationChange={setPagination}
        // Persistence props — inject stored values so layout restores them on mount
        initialFilters={initialFilters}
        initialSorting={initialSorting ?? undefined}
        initialVisibleColumns={initialVisibleColumns ?? undefined}
        onSaveVisibleColumns={saveVisibleColumns}
        // Actions
        onRefetch={refetch}
        onRefetchStatistics={refetchStatistics}
        onRefetchAnalytics={refetchAnalytics}
        onRefetchTimeline={refetchTimeline}
        onFetchAnalytics={fetchAnalytics}
        onTabDataFetch={handleTabDataFetch}
        onCampaignRowClick={handleCampaignRowClick}
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
        renderInsights={renderInsights}
        // Configuration
        filterConfiguration={dynamicFilterConfig}
        sortableColumns={createCampaignSortableColumns()}
        // Export
        enableExport
        exportFilenamePrefix="campaigns"
        fetchCampaignsForExport={fetchSalesCampaignsWithCount}
      />
    </>
  )
}

interface CampaignManagementProps extends BusinessAppContextProps {
  onBack?: () => void
  showHero?: boolean
}

const CampaignManagement: React.FC<CampaignManagementProps> = props => {
  return <CampaignManagementContent {...props} />
}

export default CampaignManagement
