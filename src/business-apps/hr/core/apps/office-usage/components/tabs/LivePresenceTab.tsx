import React, { useState } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner, Badge } from '@newwork/nw-design-system'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LivePresenceRecord, SiteLocationCapacity } from '../../types'
import { LivePresenceCards } from '../live-presence/LivePresenceCards'
import { PeopleListView } from '../live-presence/PeopleListView'
import { useLivePresenceData } from '../../hooks/useLivePresenceData'

interface LivePresenceTabProps {
  presence: LivePresenceRecord[]
  locations: SiteLocationCapacity[]
  isLoading: boolean
  error: Error | null
  lastRefresh: Date
  onRefresh: () => void
  onRetry: () => void
  selectedLocationFilter?: string
  prefixDataTestId?: string
  onClearLocationFilter?: () => void
}

export const LivePresenceTab: React.FC<LivePresenceTabProps> = ({
  presence,
  locations,
  isLoading,
  error,
  lastRefresh,
  onRefresh,
  onRetry,
  selectedLocationFilter,
  prefixDataTestId = 'live-presence-tab',
  onClearLocationFilter
}) => {
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')

  // Calculate presence data
  const { locationCards, allPeople } = useLivePresenceData(presence, locations)

  // Filter by selected location if provided
  const filteredLocationCards = selectedLocationFilter
    ? locationCards.filter(card => card.siteLocationId === selectedLocationFilter)
    : locationCards

  const filteredPeople = selectedLocationFilter
    ? allPeople.filter(person => {
        const record = presence.find(p => p.employeeId === person.employeeId)
        return record?.siteLocationId === selectedLocationFilter
      })
    : allPeople

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertTitle>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:office_usage.error_loading_data',
            'Error loading office usage data'
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
          {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.loading_presence', 'Loading live presence data...')}
        </span>
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      {/* Header with Refresh */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div>
          <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.live_presence_title', 'Live Office Presence')}
          </h2>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.as_of', 'As of')}{' '}
              {formatDate(lastRefresh, 'date.short', 'HH:mm') || '-'}
            </span>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading} className="gba:h-6 gba:px-2">
              <ArrowsClockwise className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="gba:flex gba:items-center gba:gap-2">
          {selectedLocationFilter && (
            <Badge variant="secondary" className="gba:flex gba:items-center gba:gap-2">
              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filtered_by', 'Filtered by')}:{' '}
              {locations.find(loc => loc.siteLocationId === selectedLocationFilter)?.name ||
                getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.location', 'Location')}
              {onClearLocationFilter && (
                <Button
                  size="xs"
                  variant="ghost"
                  className="gba:ml-1"
                  onClick={onClearLocationFilter}
                  data-testid={`${prefixDataTestId}-clear-location-filter`}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.clear', 'Clear')}
                </Button>
              )}
            </Badge>
          )}

          {/* View Mode Toggle */}
          <Badge
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            className="gba:cursor-pointer"
            onClick={() => setViewMode('grouped')}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.grouped_by_location', 'Grouped by location')}
          </Badge>
          <Badge
            variant={viewMode === 'list' ? 'default' : 'outline'}
            className="gba:cursor-pointer"
            onClick={() => setViewMode('list')}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.people_list', 'People list')}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="gba:mb-6 gba:p-4 gba:bg-muted/50 gba:rounded-lg gba:flex gba:items-center gba:justify-between">
        <div>
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.total_in_office', 'Total in office')}:
          </span>
          <span className="gba:ml-2 gba:text-lg gba:font-semibold gba:text-foreground">{presence.length}</span>
        </div>
        <div>
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.across', 'Across')}:
          </span>
          <span className="gba:ml-2 gba:text-lg gba:font-semibold gba:text-foreground">
            {locationCards.filter(loc => loc.currentOccupied > 0).length}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.locations', 'location(s)')}
          </span>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'grouped' ? (
        <LivePresenceCards locationCards={filteredLocationCards} prefixDataTestId={`${prefixDataTestId}-cards`} />
      ) : (
        <PeopleListView people={filteredPeople} prefixDataTestId={`${prefixDataTestId}-list`} />
      )}
    </div>
  )
}
