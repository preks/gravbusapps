'use client'

import React from 'react'
import { Button, Card, Icon, useTranslation } from '@newwork/nw-design-system'
import { MapPin } from '@phosphor-icons/react'

import timeTrackingTranslations from '../_i18n'

interface LocationCardProps {
  readonly isActive: boolean
  readonly locationLabel: string
  readonly confirmLocationLabel: string
  readonly onOpenLocationModal: () => void
}

export const LocationCard: React.FC<LocationCardProps> = ({
  isActive,
  locationLabel,
  confirmLocationLabel,
  onOpenLocationModal
}) => {
  const { t } = useTranslation(timeTrackingTranslations)

  return (
    <Card className="gba:p-5" data-testid="timeclock-location-card">
      <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:tracking-wide">
        {t('location_label')}
      </span>
      <div className="gba:mt-2 gba:flex gba:items-start gba:gap-3">
        <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
          <Icon icon={MapPin} />
        </div>
        <div className="gba:flex gba:flex-col gba:justify-center">
          {isActive ? (
            <>
              <span className="gba:text-base gba:font-semibold" data-testid="timeclock-location-value">
                {locationLabel}
              </span>
              <Button
                variant="link"
                size="sm"
                className="gba:!px-0 gba:text-sm gba:underline gba:justify-start"
                onClick={onOpenLocationModal}
                data-testid="timeclock-location-open-modal-button"
              >
                {confirmLocationLabel}
              </Button>
            </>
          ) : (
            <>
              <span className="gba:text-base gba:font-semibold" data-testid="timeclock-location-value">
                {t('location_not_clocked_in')}
              </span>
              <span className="gba:text-sm gba:text-muted-foreground" data-testid="timeclock-location-placeholder">
                {t('location_placeholder')}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
