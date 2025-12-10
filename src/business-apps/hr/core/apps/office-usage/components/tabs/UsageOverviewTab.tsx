import React, { useState } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { OfficeAttendanceRecord, SiteLocationCapacity, OfficeUsageFilters } from '../../types'
import { KpiCards } from '../usage-overview/KpiCards'
import { LocationUsageCards } from '../usage-overview/LocationUsageCards'
import { LocationDetailPanel } from '../usage-overview/LocationDetailPanel'
import { useUsageOverviewData } from '../../hooks/useUsageOverviewData'
import { useLocationDetail } from '../../hooks/useLocationDetail'

interface UsageOverviewTabProps {
  attendance: OfficeAttendanceRecord[]
  locations: SiteLocationCapacity[]
  filters: OfficeUsageFilters
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onSwitchToLivePresence: (locationId: string) => void
  prefixDataTestId?: string
}

export const UsageOverviewTab: React.FC<UsageOverviewTabProps> = ({
  attendance,
  locations,
  filters,
  isLoading,
  error,
  onRetry,
  onSwitchToLivePresence,
  prefixDataTestId = 'usage-overview-tab'
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  // Calculate aggregated data
  const { kpis, locationUsageCards } = useUsageOverviewData(attendance, locations, filters.granularity)
  const locationDetail = useLocationDetail(selectedLocationId, attendance, locations)

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

      {/* Capacity vs Usage Chart Placeholder */}
      <div className="gba:mb-6 gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-6">
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.capacity_vs_usage', 'Office usage vs. capacity')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            —{' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:office_usage.all_locations_combined',
              'All locations combined'
            )}
          </p>
        </div>
        <div className="gba:h-64 gba:bg-gradient-to-br gba:from-primary/5 gba:to-primary/10 gba:rounded gba:flex gba:items-center gba:justify-center">
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:office_usage.chart_coming_soon',
              'Chart visualization coming soon'
            )}
          </p>
        </div>
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
