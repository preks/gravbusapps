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
import { UsageOverviewTab } from './components/tabs/UsageOverviewTab'
import { LivePresenceTab } from './components/tabs/LivePresenceTab'
import { useOfficeUsageFilters } from './hooks/useOfficeUsageFilters'
import { useSiteLocations } from './hooks/useSiteLocations'
import { useOfficeAttendance } from './hooks/useOfficeAttendance'
import { useLivePresence } from './hooks/useLivePresence'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const OfficeUsage: React.FC<OfficeUsageProps> = ({ accessToken, prefixDataTestId = 'office-usage' }) => {
  const [activeTab, setActiveTab] = useState<'usage-overview' | 'live-presence'>('usage-overview')
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string | undefined>(undefined)

  // Get structure ID
  const structureId = getCurrentActiveStructureId()

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

  // Handler to switch to live presence tab with optional location filter
  const handleSwitchToLivePresence = (locationId?: string) => {
    setSelectedLocationFilter(locationId)
    setActiveTab('live-presence')
  }

  const handleClearLivePresenceLocation = () => {
    setSelectedLocationFilter(undefined)
  }

  // Check if we have access token
  if (!accessToken) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
        data-testid={`${prefixDataTestId}-no-auth`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.loading', 'Loading...')}
        </span>
      </div>
    )
  }

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
          <UsageOverviewTab
            attendance={attendance}
            locations={locations}
            filters={filters}
            onFiltersChange={updateFilters}
            filtersLoading={locationsLoading || attendanceLoading}
            isLoading={attendanceLoading}
            error={attendanceError}
            onRetry={() => fetchAttendance(filters.dateFrom, filters.dateTo)}
            onSwitchToLivePresence={handleSwitchToLivePresence}
            prefixDataTestId={`${prefixDataTestId}-usage-overview`}
          />
        </TabsContent>

        {/* Live Presence Tab */}
        <TabsContent value="live-presence">
          <LivePresenceTab
            presence={presence}
            locations={locations}
            isLoading={presenceLoading}
            error={presenceError}
            lastRefresh={lastRefresh}
            onRefresh={fetchPresence}
            onRetry={fetchPresence}
            selectedLocationFilter={selectedLocationFilter}
            onClearLocationFilter={handleClearLivePresenceLocation}
            prefixDataTestId={`${prefixDataTestId}-live-presence`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OfficeUsage
