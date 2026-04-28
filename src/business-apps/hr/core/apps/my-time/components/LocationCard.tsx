'use client'

import React from 'react'
import { Button, Card, Icon, useTranslation } from '@newwork/nw-design-system'
import { MapPin, Warning } from '@phosphor-icons/react'

import timeTrackingTranslations from '../_i18n'

interface LocationCardProps {
  readonly isActive: boolean
  readonly locationLabel: string
  readonly confirmLocationLabel: string
  readonly onOpenLocationModal: () => void
  /**
   * True when the employee's home address has no stored coordinates. When true, a
   * warning row is rendered prompting the user to update the address. The clock-in
   * itself still works — the home side just won't trigger the IS_NEAR_HOME enum.
   */
  readonly homeNeedsReview?: boolean
  /**
   * True when the office siteLocation has no stored coordinates. Same warning
   * behaviour as `homeNeedsReview`. Currently always true until the SiteLocation
   * backend ships the latitude/longitude columns.
   */
  readonly officeNeedsReview?: boolean
}

export const LocationCard: React.FC<LocationCardProps> = ({
  isActive,
  locationLabel,
  confirmLocationLabel,
  onOpenLocationModal,
  homeNeedsReview,
  officeNeedsReview
}) => {
  const { t } = useTranslation(timeTrackingTranslations)

  const showWarning = Boolean(homeNeedsReview || officeNeedsReview)
  const warningMessage = (() => {
    if (homeNeedsReview && officeNeedsReview) return t('location_address_review_warning')
    if (homeNeedsReview) return t('location_address_review_warning_home')
    if (officeNeedsReview) return t('location_address_review_warning_office')
    return ''
  })()

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
      {showWarning && (
        <div
          className="gba:mt-3 gba:flex gba:items-start gba:gap-2 gba:rounded-md gba:bg-amber-50 gba:p-2 gba:text-xs gba:text-amber-800 dark:gba:bg-amber-950/40 dark:gba:text-amber-200"
          data-testid="timeclock-location-address-review-warning"
        >
          <Icon icon={Warning} className="gba:mt-0.5 gba:shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}
    </Card>
  )
}
