'use client'

import React from 'react'
import {
  Button,
  Card,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { MapPin, Warning } from '@phosphor-icons/react'

import timeTrackingTranslations from '../_i18n'

interface LocationCardProps {
  readonly isActive: boolean
  readonly locationLabel: string
  readonly confirmLocationLabel: string
  readonly onOpenLocationModal: () => void
  /**
   * True when the employee's home address has no stored coordinates. When true, a
   * small amber warning icon is rendered next to the LOCATION header, with the
   * full message available on hover/focus via tooltip — chosen over an inline row
   * to avoid stretching the card and the sibling clock-in card next to it. The
   * clock-in itself still works; the home side just won't trigger IS_NEAR_HOME.
   */
  readonly homeNeedsReview?: boolean
  /**
   * True when the office siteLocation has no stored coordinates. Same tooltip
   * behaviour as `homeNeedsReview` — most commonly fires for legacy SiteLocation
   * records that were never resaved through the change-site-location form and so
   * still lack the lat/lng columns.
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
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:tracking-wide">
          {t('location_label')}
        </span>
        {showWarning && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="gba:inline-flex gba:items-center gba:justify-center gba:border-0 gba:bg-transparent gba:p-0 gba:text-amber-600 dark:gba:text-amber-400 gba:cursor-help"
                  data-testid="timeclock-location-address-review-warning"
                  aria-label={warningMessage}
                >
                  <Icon icon={Warning} className="gba:h-4 gba:w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="gba:max-w-[260px]">
                <p className="gba:text-xs">{warningMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
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
              {/*
                Match the active-state link button's vertical rhythm so the card
                doesn't shrink while the location is still loading. The link
                button (variant="link" size="sm") contributes ~6px of vertical
                padding around its text; mirror that here on the placeholder
                span via my-1.5 so both states render at the same height.
              */}
              <span
                className="gba:my-1.5 gba:text-sm gba:text-muted-foreground"
                data-testid="timeclock-location-placeholder"
              >
                {t('location_placeholder')}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
