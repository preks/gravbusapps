import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Button,
  Separator,
  Label,
  Badge
} from '@newwork/nw-design-system'
import { PiMapPin, PiCalendarDuotone, PiClock } from 'react-icons/pi'
import { ChevronDown } from 'lucide-react'
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

  // Extract different point types from expenseRequestTrip
  const locations = expenseRequestTrip || []
  const startPoint = locations.find(({ pointType }) => pointType === 'START_POINT')
  const endPoint = locations.find(({ pointType }) => pointType === 'END_POINT')
  const destinationPoints = locations.filter(({ pointType }) => pointType === 'DESTINATION_POINT')
  const numberOfDestinationPoints = destinationPoints.length

  // Only show trip section if there's at least a start or end point
  if (!startPoint && !endPoint && numberOfDestinationPoints === 0) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-trip`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiMapPin className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.trip_header', 'Trip Details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:grid gba:grid-cols-2 gba:gap-4" data-testid={`${prefixDataTestId}-trip-section`}>
          {/* Start Location */}
          <div data-testid={`${prefixDataTestId}-start-location`}>
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiCalendarDuotone className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.start_location',
                    'Start Location'
                  )}
                </Label>
                <p className="gba:text-sm gba:mt-1">{startPoint?.address || 'N/A'}</p>
                {startPoint?.tripDateTime && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {formatDate(startPoint.tripDateTime)}, {formatTimeOnly(startPoint.tripDateTime)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* End Location */}
          <div data-testid={`${prefixDataTestId}-end-location`}>
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiClock className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.end_location_text',
                    'End Location'
                  )}
                </Label>
                <p className="gba:text-sm gba:mt-1">{endPoint?.address || 'N/A'}</p>
                {endPoint?.tripDateTime && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {formatDate(endPoint.tripDateTime)}, {formatTimeOnly(endPoint.tripDateTime)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Destination with collapsible */}
        {numberOfDestinationPoints > 0 && (
          <>
            <Separator />
            <Collapsible
              open={isDestinationExpanded}
              onOpenChange={setIsDestinationExpanded}
              data-testid={`${prefixDataTestId}-destination`}
            >
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiMapPin className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
                  <div>
                    <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:approve_expense_request.destination_location',
                        'Destinations'
                      )}
                    </Label>
                    <p className="gba:text-sm gba:mt-1">
                      {numberOfDestinationPoints}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:approve_expense_plan.regions_breakdown',
                        'Destination'
                      )}
                      {numberOfDestinationPoints !== 1 ? 's' : ''}
                      {countriesSummary.countries && (
                        <Badge variant="outline" className="gba:ml-2">
                          {countriesSummary.countries}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:p-1 gba:h-auto"
                    data-testid={`${prefixDataTestId}-destination-toggle`}
                  >
                    <ChevronDown
                      className={`gba:h-4 gba:w-4 gba:transition-transform gba:duration-200 ${isDestinationExpanded ? 'gba:rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="gba:mt-3">
                <div className="gba:space-y-2 gba:pl-7">
                  {destinationPoints.map((trip, index) => (
                    <div key={index} className="gba:border-l-2 gba:border-border gba:pl-3 gba:py-1">
                      <p className="gba:text-sm">
                        <span className="gba:font-medium">{trip.address}</span>
                        {trip.tripDateTime && (
                          <span className="gba:text-muted-foreground gba:ml-2">
                            {formatDate(trip.tripDateTime)}, {formatTimeOnly(trip.tripDateTime)}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TripSection
