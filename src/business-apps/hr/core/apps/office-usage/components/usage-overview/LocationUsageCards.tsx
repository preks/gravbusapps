import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { MapPin, TrendUp } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LocationUsageCardData } from '../../types'

interface LocationUsageCardsProps {
  locations: LocationUsageCardData[]
  onLocationClick: (locationId: string) => void
  prefixDataTestId?: string
}

export const LocationUsageCards: React.FC<LocationUsageCardsProps> = ({
  locations,
  onLocationClick,
  prefixDataTestId = 'location-usage-cards'
}) => {
  if (locations.length === 0) {
    return (
      <div className="gba:text-center gba:py-12" data-testid={`${prefixDataTestId}-empty`}>
        <MapPin className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground gba:mb-4" />
        <p className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:office_usage.no_locations_data',
            'No location data available for the selected period.'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="gba:mb-6" data-testid={prefixDataTestId}>
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        {locations.map(location => {
          return (
            <Card
              key={location.siteLocationId}
              className="gba:p-6 gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow"
              onClick={() => onLocationClick(location.siteLocationId)}
              data-testid={`${prefixDataTestId}-${location.siteLocationId}`}
            >
              {/* Header */}
              <div className="gba:mb-4">
                <h4 className="gba:font-semibold gba:text-foreground gba:text-lg gba:mb-1">
                  {location.siteLocationName}
                </h4>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.capacity', 'Capacity')}: {location.capacity}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.desks', 'desks')}
                </p>
              </div>

              {/* Main Percentage */}
              <div className="gba:mb-4">
                <div className="gba:text-4xl gba:font-bold gba:text-primary">
                  {location.averageOccupancy.toFixed(0)}%
                </div>
              </div>

              {/* Sparkline placeholder */}
              <div className="gba:h-16 gba:mb-4 gba:bg-muted/30 gba:rounded gba:flex gba:items-center gba:justify-center">
                <TrendUp className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
              </div>

              {/* Stats */}
              <div className="gba:space-y-2 gba:text-sm">
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.peak_occupancy', 'Peak occupancy')}:
                  </span>
                  <span className="gba:font-medium">{location.peakOccupancy.toFixed(0)}%</span>
                </div>
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.office_days', 'Office days logged')}
                  </span>
                  <span className="gba:font-medium">{location.peakDate && `(${location.peakDate})`}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
