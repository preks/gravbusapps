import React, { useState } from 'react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import { MapPinIcon, ArrowRightIcon, ArrowLeftIcon, MapTrifoldIcon, FlagIcon, TableIcon, ChartLineIcon } from '@phosphor-icons/react'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { getCatalogValue } from '../utils/formatters'
import { ExpenseRequestTrip } from '../types/expensePlanV2Types'
import Pill from '@/components/pill'

interface EnhancedTripSectionProps {
  expenseRequestTrip: ExpenseRequestTrip[]
  prefixDataTestId?: string
  t: (key: string, vars?: Record<string, unknown>) => string
}

// Get point type icon
const getPointTypeIcon = (pointType: string) => {
  switch (pointType) {
    case 'START_POINT':
      return <FlagIcon className="gba:h-5 gba:w-5 gba:text-green-600" />
    case 'END_POINT':
      return <FlagIcon className="gba:h-5 gba:w-5 gba:text-red-600" />
    case 'DESTINATION_POINT':
      return <MapPinIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />
    case 'REGION_ARRIVAL':
      return <MapTrifoldIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />
    default:
      return <MapPinIcon className="gba:h-5 gba:w-5" />
  }
}

// Get direction icon
const getDirectionIcon = (direction?: string) => {
  if (!direction) return null
  switch (direction) {
    case 'GO':
      return <ArrowRightIcon className="gba:h-4 gba:w-4 gba:text-blue-600" />
    case 'BACK':
      return <ArrowLeftIcon className="gba:h-4 gba:w-4 gba:text-orange-600" />
    default:
      return null
  }
}

const EnhancedTripSection: React.FC<EnhancedTripSectionProps> = ({
  expenseRequestTrip,
  prefixDataTestId = 'approve-expense-plan-v2',
  t
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')

  // Get point type label
  const getPointTypeLabel = (pointType: string) => {
    switch (pointType) {
      case 'START_POINT':
        return t('point-type-start')
      case 'END_POINT':
        return t('point-type-end')
      case 'DESTINATION_POINT':
        return t('point-type-destination')
      case 'REGION_ARRIVAL':
        return t('point-type-region-arrival')
      default:
        return pointType
    }
  }

  // Get direction label
  const getDirectionLabel = (direction?: string) => {
    if (!direction) return ''
    switch (direction) {
      case 'GO':
        return t('direction-outbound')
      case 'BACK':
        return t('direction-return')
      default:
        return direction
    }
  }

  // Handle empty or undefined trip data
  if (!expenseRequestTrip || expenseRequestTrip.length === 0) {
    return null
  }

  // Sort trips by order or date
  const sortedTrips = [...expenseRequestTrip].sort((a, b) => {
    if (a.tripOrder && b.tripOrder) {
      return a.tripOrder - b.tripOrder
    }
    return new Date(a.tripDateTime).getTime() - new Date(b.tripDateTime).getTime()
  })

  // Only show trip section if there are trips
  if (sortedTrips.length === 0) {
    return null
  }

  // Table view
  const renderTableView = () => {
    return (
      <div className="gba:overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:text-center">{t('label-order')}</TableHead>
              <TableHead>{t('label-date-time')}</TableHead>
              <TableHead>{t('label-trip-details')}</TableHead>
              <TableHead>{t('label-destination')}</TableHead>
              <TableHead>{t('label-start-location')}</TableHead>
              <TableHead>{t('label-start-location-country')}</TableHead>
              <TableHead>{t('label-region')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrips.map((trip, index) => (
              <TableRow
                key={`trip-${trip.tripOrder ?? index}`}
                data-testid={`${prefixDataTestId}-trip-table-row-${index}`}
              >
                <TableCell className="gba:text-center">{trip.tripOrder ?? index + 1}</TableCell>
                <TableCell>{formatDateTime(trip.tripDateTime)}</TableCell>
                <TableCell>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {getDirectionIcon(trip.tripDirection)}
                    <span>{getDirectionLabel(trip.tripDirection)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {getPointTypeIcon(trip.pointType)}
                    <span>{getPointTypeLabel(trip.pointType)}</span>
                  </div>
                </TableCell>
                <TableCell>{trip.address}</TableCell>
                <TableCell>
                  {trip.country ? (
                    <Pill
                      type="waiting"
                      label={getCatalogValue(trip.country) || trip.country.value}
                      data-testid={`${prefixDataTestId}-country-pill-${index}`}
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {trip.travelRegion ? (
                    <Pill
                      type="task"
                      label={getCatalogValue(trip.travelRegion) || trip.travelRegion.value}
                      data-testid={`${prefixDataTestId}-travel-region-pill-${index}`}
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Timeline view
  const renderTimelineView = () => {
    return (
      <div className="gba:space-y-4">
        {sortedTrips.map((trip, index) => {
          const isGo = trip.tripDirection === 'GO'
          const isBack = trip.tripDirection === 'BACK'

          return (
            <div
              key={`trip-${trip.tripOrder ?? index}`}
              className={`gba:relative gba:pl-8 gba:pb-4 ${
                index < sortedTrips.length - 1 ? 'gba:border-l-2 gba:border-border' : ''
              }`}
              data-testid={`${prefixDataTestId}-trip-timeline-item-${index}`}
            >
              {/* Timeline dot */}
              <div
                className={`gba:absolute gba:left-0 gba:top-1 gba:w-3 gba:h-3 gba:rounded-full gba:-translate-x-[7px] ${
                  isGo ? 'gba:bg-blue-600' : ''
                }${isBack ? 'gba:bg-orange-600' : ''}${!isGo && !isBack ? 'gba:bg-gray-400' : ''}`}
              />

              {/* Content */}
              <div className="gba:space-y-2">
                {/* Date and time */}
                <div className="gba:text-xs gba:text-muted-foreground gba:font-medium">
                  {formatDateTime(trip.tripDateTime)}
                </div>

                {/* Point type and direction */}
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  {getPointTypeIcon(trip.pointType)}
                  <span className="gba:font-semibold gba:text-sm">{getPointTypeLabel(trip.pointType)}</span>
                  {trip.tripDirection && (
                    <>
                      {getDirectionIcon(trip.tripDirection)}
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {getDirectionLabel(trip.tripDirection)}
                      </span>
                    </>
                  )}
                </div>

                {/* Address */}
                <div className="gba:text-sm">{trip.address}</div>

                {/* Country and Travel Region badges */}
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  {trip.country && (
                    <Badge variant="outline" className="gba:text-xs">
                      {getCatalogValue(trip.country) || trip.country.value}
                    </Badge>
                  )}
                  {trip.travelRegion && (
                    <Badge variant="secondary" className="gba:text-xs">
                      {getCatalogValue(trip.travelRegion) || trip.travelRegion.value}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      {/* View Mode Toggle */}
      <div
        className="gba:flex gba:items-center gba:justify-end gba:gap-2"
        data-testid={`${prefixDataTestId}-trip-view-toggle-buttons`}
      >
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('table')}
          data-testid={`${prefixDataTestId}-trip-table-view-button`}
        >
          <TableIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('view-table')}
        </Button>
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('timeline')}
          data-testid={`${prefixDataTestId}-trip-timeline-view-button`}
        >
          <ChartLineIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('view-timeline')}
        </Button>
      </div>

      {/* Content */}
      {viewMode === 'table' ? renderTableView() : renderTimelineView()}
    </div>
  )
}

export default EnhancedTripSection
