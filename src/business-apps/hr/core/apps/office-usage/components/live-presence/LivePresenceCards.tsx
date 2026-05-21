import React from 'react'
import { Card, Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { MapPinIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LivePresenceLocationCard } from '../../types'
import {
  getOccupancyBadgeVariant,
  getOccupancyBgColorClass,
  getOccupancyStatus
} from '../../utils/occupancyCalculations'

interface LivePresenceCardsProps {
  locationCards: LivePresenceLocationCard[]
  prefixDataTestId?: string
}

export const LivePresenceCards: React.FC<LivePresenceCardsProps> = ({
  locationCards,
  prefixDataTestId = 'live-presence-cards'
}) => {
  const getFallback = (displayName: string): string => {
    const parts = displayName
      .split(/\s+/)
      .map(p => p.trim())
      .filter(Boolean)

    const first = parts[0]?.[0]
    const second = parts[1]?.[0]

    const initials = `${first ?? ''}${second ?? ''}`.toUpperCase()
    return initials || '-'
  }

  if (locationCards.length === 0) {
    return (
      <div className="gba:text-center gba:py-12" data-testid={`${prefixDataTestId}-empty`}>
        <MapPinIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground gba:mb-4" />
        <p className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:office_usage.no_live_presence_data',
            'No live presence data available.'
          )}
        </p>
      </div>
    )
  }

  return (
    <div
      className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
      data-testid={prefixDataTestId}
    >
      {locationCards.map(location => {
        const badgeVariant = getOccupancyBadgeVariant(location.currentOccupancyPercentage)
        const isOverCapacity = location.capacity > 0 && location.currentOccupied > location.capacity
        const occupancyStatus = getOccupancyStatus(location.currentOccupancyPercentage)
        const statusDotBgClass = getOccupancyBgColorClass(occupancyStatus)
        const ratioTextClassName = isOverCapacity ? 'gba:text-warning gba:font-semibold' : 'gba:text-muted-foreground'

        return (
          <Card
            key={location.siteLocationId}
            className="gba:p-4"
            data-testid={`${prefixDataTestId}-${location.siteLocationId}`}
          >
            {/* Header */}
            <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                  <MapPinIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <h4 className="gba:font-semibold gba:text-foreground">{location.siteLocationName}</h4>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  {isOverCapacity && <WarningCircleIcon className="gba:w-4 gba:h-4 gba:text-warning" />}
                  <span className={`gba:text-sm ${ratioTextClassName}`}>
                    {location.currentOccupied} / {location.capacity}
                  </span>
                  <Badge variant={isOverCapacity ? 'warning' : badgeVariant} className="gba:text-xs">
                    {location.currentOccupancyPercentage.toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <div className={`gba:w-2 gba:h-2 gba:rounded-full ${statusDotBgClass}`} />
            </div>

            {/* In Office Now */}
            <div className="gba:mb-4">
              <h5 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.in_office_now', 'In office now')} (
                {location.peopleInOfficeNow.length})
              </h5>
              {location.peopleInOfficeNow.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.no_one_checked_in', 'No one checked in')}
                </p>
              ) : (
                <div className="gba:space-y-2">
                  {location.peopleInOfficeNow.slice(0, 5).map(person => (
                    <div key={person.employeeId} className="gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:w-8 gba:h-8">
                        {person.pictureUrl && <AvatarImage src={`data:image/jpeg;base64,${person.pictureUrl}`} />}
                        <AvatarFallback>{getFallback(person.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                          {person.displayName}
                        </p>
                        {person.jobTitle && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{person.jobTitle}</p>
                        )}
                      </div>
                      <span className="gba:text-xs gba:text-muted-foreground">{person.startTime}</span>
                    </div>
                  ))}
                  {location.peopleInOfficeNow.length > 5 && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:pt-2">
                      +{location.peopleInOfficeNow.length - 5}{' '}
                      {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.more', 'more')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Due Later Today */}
            {location.peopleDueLater.length > 0 && (
              <div className="gba:pt-3 gba:border-t gba:border-border">
                <h5 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.due_later_today', 'Due later today')} (
                  {location.peopleDueLater.length})
                </h5>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {location.peopleDueLater.slice(0, 6).map(person => (
                    <Avatar
                      key={person.employeeId}
                      className="gba:w-6 gba:h-6"
                      title={`${person.displayName} - ${person.expectedStartTime}`}
                    >
                      {person.pictureUrl && <AvatarImage src={`data:image/jpeg;base64,${person.pictureUrl}`} />}
                      <AvatarFallback>{getFallback(person.displayName)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
