import React, { useState } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { OfficeAttendanceRecord, SiteLocationCapacity, OfficeUsageFilters } from '../../types'
import { KpiCards } from '../usage-overview/KpiCards'
import { LocationUsageCards } from '../usage-overview/LocationUsageCards'
import { LocationDetailPanel } from '../usage-overview/LocationDetailPanel'
import { CapacityUsageChart } from '../usage-overview/CapacityUsageChart'
import { useUsageOverviewData } from '../../hooks/useUsageOverviewData'
import { useLocationDetail } from '../../hooks/useLocationDetail'
import { OfficeUsageFilterBar } from '../filters/OfficeUsageFilterBar'

interface UsageOverviewTabProps {
  kpiAttendance: OfficeAttendanceRecord[]
  attendance: OfficeAttendanceRecord[]
  locations: SiteLocationCapacity[]
  filters: OfficeUsageFilters
  onFiltersChange: (updates: Partial<OfficeUsageFilters>) => void
  filtersLoading?: boolean
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onSwitchToLivePresence: (locationId: string) => void
  prefixDataTestId?: string
}

export const UsageOverviewTab: React.FC<UsageOverviewTabProps> = ({
  kpiAttendance,
  attendance,
  locations,
  filters,
  onFiltersChange,
  filtersLoading = false,
  isLoading,
  error,
  onRetry,
  onSwitchToLivePresence,
  prefixDataTestId = 'usage-overview-tab'
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  // Calculate aggregated data
  // KPIs: always for last 30 days, all locations, by day (not affected by UI filters)
  const { kpis } = useUsageOverviewData(kpiAttendance, locations, 'day')
  // Cards/other sections: still reflect current filters/data
  const { locationUsageCards } = useUsageOverviewData(attendance, locations, filters.granularity)
  const locationDetail = useLocationDetail(selectedLocationId, attendance, locations)

  // Apply optional location filter for the chart (graph-only as requested)
  const selectedLocationIdForChart = filters.selectedLocations?.[0]
  const filteredAttendanceForChart =
    selectedLocationIdForChart && selectedLocationIdForChart.length > 0
      ? attendance.filter(a => a.siteLocationId === selectedLocationIdForChart)
      : attendance
  const filteredLocationsForChart =
    selectedLocationIdForChart && selectedLocationIdForChart.length > 0
      ? locations.filter(l => l.siteLocationId === selectedLocationIdForChart)
      : locations
  const selectedLocationForLabel = selectedLocationIdForChart
    ? locations.find(l => l.siteLocationId === selectedLocationIdForChart)
    : undefined

  const handleLocationClick = (locationId: string) => {
    setSelectedLocationId(locationId)
  }

  const handleClosePanel = () => {
    setSelectedLocationId(null)
  }

  const handleViewLivePresence = (locationId: string) => {
    setSelectedLocationId(null)
    onSwitchToLivePresence(locationId)
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertTitle>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:office_usage.error_loading_attendance',
            'Failed to load attendance data'
          )}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <Button onClick={onRetry} className="gba:mt-4">
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.retry', 'Retry')}
        </Button>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="md" />
        <span className="gba:ml-3 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.loading_attendance', 'Loading attendance data...')}
        </span>
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      {/* Page Header */}
      <div className="gba:mb-6">
        <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.usage_overview_title', 'Office Usage Overview')}
        </h2>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
          {filters.granularity === 'day'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.daily_view', 'Daily view')
            : getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.weekly_view', 'Weekly view')}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.for', 'for')}{' '}
          {filters.selectedLocations.length === 0
            ? getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.all_locations', 'all locations')
            : `${filters.selectedLocations.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.locations', 'location(s)')}`}
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={kpis} prefixDataTestId={`${prefixDataTestId}-kpis`} />

      {/* Filters under KPI cards */}
      <OfficeUsageFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        locations={locations}
        isLoading={filtersLoading}
        prefixDataTestId={`${prefixDataTestId}-filter-bar`}
      />

      {/* Capacity vs Usage Chart */}
      <div className="gba:mb-6 gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-6">
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.capacity_vs_usage', 'Office usage vs. capacity')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            —{' '}
            {selectedLocationForLabel
              ? `${selectedLocationForLabel.name}${
                  selectedLocationForLabel.locality ? ` (${selectedLocationForLabel.locality})` : ''
                }`
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:office_usage.all_locations_combined',
                  'All locations combined'
                )}
          </p>
        </div>
        <CapacityUsageChart
          attendance={filteredAttendanceForChart}
          locations={filteredLocationsForChart}
          granularity={filters.granularity}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          prefixDataTestId={`${prefixDataTestId}-chart`}
        />
      </div>

      {/* Location Usage Cards */}
      <LocationUsageCards
        locations={locationUsageCards}
        onLocationClick={handleLocationClick}
        prefixDataTestId={`${prefixDataTestId}-locations`}
      />

      {/* Location Detail Panel */}
      <LocationDetailPanel
        location={locationDetail}
        isOpen={!!selectedLocationId}
        onClose={handleClosePanel}
        onViewLivePresence={handleViewLivePresence}
        prefixDataTestId={`${prefixDataTestId}-detail-panel`}
      />
    </div>
  )
}
