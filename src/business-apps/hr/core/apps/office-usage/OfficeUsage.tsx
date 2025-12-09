import React, { useState, useEffect } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { ChartBar, Users } from '@phosphor-icons/react'
import { OfficeUsageProps } from './types'
import { OfficeUsageFilterBar } from './components/filters/OfficeUsageFilterBar'
import { useOfficeUsageFilters } from './hooks/useOfficeUsageFilters'
import { useSiteLocations } from './hooks/useSiteLocations'
import { useOfficeAttendance } from './hooks/useOfficeAttendance'
import { useLivePresence } from './hooks/useLivePresence'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const OfficeUsage: React.FC<OfficeUsageProps> = ({ accessToken, prefixDataTestId = 'office-usage' }) => {
  const [activeTab, setActiveTab] = useState<'usage-overview' | 'live-presence'>('usage-overview')

  // Get structure ID
  const structureId = getCurrentActiveStructureId() || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'

  // Filters state
  const { filters, updateFilters } = useOfficeUsageFilters()

  // Site locations data
  const {
    locations,
    isLoading: locationsLoading,
    error: locationsError,
    refetch: refetchLocations
  } = useSiteLocations(accessToken, structureId)

  // Office attendance data
  const {
    attendance,
    isLoading: attendanceLoading,
    error: attendanceError,
    fetchAttendance
  } = useOfficeAttendance(accessToken, structureId)

  // Live presence data
  const {
    presence,
    isLoading: presenceLoading,
    error: presenceError,
    lastRefresh,
    fetchPresence
  } = useLivePresence(accessToken, structureId)

  // Fetch attendance data when filters change
  useEffect(() => {
    if (accessToken && filters.dateFrom && filters.dateTo) {
      fetchAttendance(filters.dateFrom, filters.dateTo)
    }
  }, [accessToken, filters.dateFrom, filters.dateTo, fetchAttendance])

  // Fetch live presence on tab change
  useEffect(() => {
    if (activeTab === 'live-presence' && accessToken) {
      fetchPresence()
    }
  }, [activeTab, accessToken, fetchPresence])

  // Handle location errors
  if (locationsError) {
    return (
      <div className="gba:p-6" data-testid={`${prefixDataTestId}-error`}>
        <Alert variant="destructive">
          <AlertTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:office_usage.error_loading_locations',
              'Failed to load office locations'
            )}
          </AlertTitle>
          <AlertDescription>{locationsError.message}</AlertDescription>
        </Alert>
        <Button onClick={refetchLocations} className="gba:mt-4" data-testid={`${prefixDataTestId}-retry-button`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.error_try_again', 'Try again')}
        </Button>
      </div>
    )
  }

  // Loading locations
  if (locationsLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.loading', 'Loading...')}
        </span>
      </div>
    )
  }

  return (
    <div className="gba:container gba:mx-auto gba:p-6" data-testid={prefixDataTestId}>
      {/* Page Header */}
      <div className="gba:mb-6">
        <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.office_usage_title', 'Office Usage & Presence')}
        </h1>
        <p className="gba:text-muted-foreground gba:mt-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:office_usage.office_usage_subtitle',
            'Monitor office capacity and real-time employee presence'
          )}
        </p>
      </div>

      {/* Filter Bar - Persistent across tabs */}
      <OfficeUsageFilterBar
        filters={filters}
        onFiltersChange={updateFilters}
        locations={locations}
        isLoading={locationsLoading || attendanceLoading}
        prefixDataTestId={`${prefixDataTestId}-filter-bar`}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)}>
        <TabsList className="gba:mb-6">
          <TabsTrigger
            value="usage-overview"
            startIcon={<ChartBar />}
            data-testid={`${prefixDataTestId}-usage-overview-tab`}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.usage_overview_tab', 'Usage Overview')}
          </TabsTrigger>
          <TabsTrigger
            value="live-presence"
            startIcon={<Users />}
            data-testid={`${prefixDataTestId}-live-presence-tab`}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.live_presence_tab', "Who's in the Office Now")}
          </TabsTrigger>
        </TabsList>

        {/* Usage Overview Tab */}
        <TabsContent value="usage-overview">
          <div data-testid={`${prefixDataTestId}-usage-overview-content`}>
            {attendanceLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="lg" />
                <span className="gba:ml-3 gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.loading', 'Loading...')}
                </span>
              </div>
            ) : attendanceError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:office_usage.error_loading_attendance',
                    'Failed to load attendance data'
                  )}
                </AlertTitle>
                <AlertDescription>{attendanceError.message}</AlertDescription>
              </Alert>
            ) : (
              <div className="gba:space-y-6">
                {/* KPI Cards - Coming soon */}
                <div className="gba:p-8 gba:bg-muted gba:rounded-lg gba:text-center">
                  <p className="gba:text-muted-foreground">
                    Usage Overview: {attendance.length} attendance records found
                  </p>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                    {filters.granularity === 'day' ? 'Daily' : 'Weekly'} view for{' '}
                    {filters.selectedLocations.length === 0
                      ? 'all locations'
                      : `${filters.selectedLocations.length} location(s)`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Live Presence Tab */}
        <TabsContent value="live-presence">
          <div data-testid={`${prefixDataTestId}-live-presence-content`}>
            {presenceLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="lg" />
                <span className="gba:ml-3 gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.loading', 'Loading...')}
                </span>
              </div>
            ) : presenceError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:office_usage.error_loading_data',
                    'Error loading office usage data'
                  )}
                </AlertTitle>
                <AlertDescription>{presenceError.message}</AlertDescription>
              </Alert>
            ) : (
              <div className="gba:space-y-6">
                {/* Live Presence Cards - Coming soon */}
                <div className="gba:p-8 gba:bg-muted gba:rounded-lg gba:text-center">
                  <p className="gba:text-muted-foreground">
                    Live Presence: {presence.length} people currently in office
                  </p>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                    Last refreshed: {lastRefresh.toLocaleTimeString()}
                  </p>
                  <Button
                    onClick={fetchPresence}
                    className="gba:mt-4"
                    variant="outline"
                    data-testid={`${prefixDataTestId}-refresh-button`}
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.presence_refresh', 'Refresh')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OfficeUsage
