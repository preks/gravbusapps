import React, { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Button, Separator } from '@newwork/nw-design-system'
import { CaretDownIcon, MapPinIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TripSectionProps {
  expenseRequestTrip: Array<{
    address?: string
    tripDateTime?: string
    pointType?: string
  }>
  startDate?: string
  endDate?: string
  destinations: Array<{
    address: string
    tripDateTime?: string
    pointType?: string
  }>
  numberOfDestinations: number
  countriesSummary: {
    countries?: string
  }
  prefixDataTestId?: string
}

// Helper function to format time using formatDate with time format
const formatTimeOnly = (dateValue: string | undefined): string => {
  if (!dateValue) return ''
  return formatDate(new Date(dateValue), 'time.short') || ''
}

const TripSection: React.FC<TripSectionProps> = ({
  expenseRequestTrip,
  countriesSummary,
  prefixDataTestId = 'approve-expense'
}) => {
  const [isDestinationExpanded, setIsDestinationExpanded] = useState(true)

  if (!expenseRequestTrip || expenseRequestTrip.length === 0) {
    return null
  }

  // Extract different point types from expenseRequestTrip
  const locations = expenseRequestTrip
  const startPoint = locations.find(({ pointType }) => pointType === 'START_POINT')
  const endPoint = locations.find(({ pointType }) => pointType === 'END_POINT')
  const destinationPoints = locations.filter(({ pointType }) => pointType === 'DESTINATION_POINT')
  const numberOfDestinationPoints = destinationPoints.length

  return (
    <div data-testid={`${prefixDataTestId}-trip`} className="gba:mb-4">
      {/* Trip title - Light gray header bar */}
      <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
        <span className="gba:text-foreground gba:text-sm gba:font-semibold gba:pl-3">
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.trip_header', 'Trip')}
        </span>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-8 gba:mb-2" data-testid={`${prefixDataTestId}-trip-section`}>
        {/* Start Location */}
        <div className="gba:mb-2" data-testid={`${prefixDataTestId}-start-location`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <MapPinIcon size={16} className="gba:text-base gba:text-muted-foreground" />
            <span className="gba:font-semibold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.start_location',
                'Start Location'
              )}
            </span>
          </div>
          <div className="gba:ml-6">
            <div className="gba:text-foreground">{startPoint?.address || 'N/A'}</div>
            <div className="gba:text-foreground">
              {startPoint?.tripDateTime &&
                `${formatDate(startPoint.tripDateTime)}, ${formatTimeOnly(startPoint.tripDateTime)}`}
            </div>
          </div>
        </div>

        {/* End Location */}
        <div className="gba:mb-2" data-testid={`${prefixDataTestId}-end-location`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <MapPinIcon size={16} className="gba:text-base gba:text-muted-foreground" />
            <span className="gba:font-semibold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.end_location_text',
                'End Location'
              )}
            </span>
          </div>
          <div className="gba:ml-6">
            <div className="gba:text-foreground">{endPoint?.address || 'N/A'}</div>
            <div className="gba:text-foreground">
              {endPoint?.tripDateTime &&
                `${formatDate(endPoint.tripDateTime)}, ${formatTimeOnly(endPoint.tripDateTime)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Destination with collapsible - Full width */}
      <Collapsible
        open={isDestinationExpanded}
        onOpenChange={setIsDestinationExpanded}
        data-testid={`${prefixDataTestId}-destination`}
        className="gba:w-full"
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <MapPinIcon size={16} className="gba:text-base gba:text-muted-foreground" />
          <span className="gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:approve_expense_request.destination_location',
              'Destination Location'
            )}
          </span>
          <div className="gba:flex-1" />
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:p-1 gba:h-auto"
              data-testid={`${prefixDataTestId}-destination-toggle`}
            >
              <CaretDownIcon
                size={16}
                className={`gba:text-base gba:transition-transform gba:duration-200 ${isDestinationExpanded ? 'gba:rotate-180' : 'gba:rotate-0'}`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="gba:text-foreground gba:ml-6">
          {numberOfDestinationPoints}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.regions_breakdown', 'Destination')}
          {numberOfDestinationPoints !== 1 ? 's' : ''}{' '}
          {countriesSummary.countries ? `in ${countriesSummary.countries}` : ''}
        </div>
        {/* Collapsible content */}
        <CollapsibleContent>
          <Separator className="gba:h-px gba:bg-gray-100 gba:mb-3 gba:mt-3" />
          <div className="gba:ml-6 gba:mt-1 gba:text-muted-foreground gba:text-sm">
            {destinationPoints.map((trip, index) => (
              <div key={index} className="gba:mb-0">
                <div>
                  <span className="gba:text-muted-foreground gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:approve_expense_request.destination_location',
                      'Destination'
                    )}
                    :{' '}
                  </span>
                  <span className="gba:text-foreground">
                    {trip.address},{' '}
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:approve_expense_request.destinations_breakdown',
                      'Departure'
                    )}{' '}
                    {trip.tripDateTime && `${formatDate(trip.tripDateTime)}, ${formatTimeOnly(trip.tripDateTime)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default TripSection
