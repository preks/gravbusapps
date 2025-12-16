'use client'

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

interface ScheduledBenefitLayoutProps {
  t: (key: string, params?: any) => string
  benefit: BenefitCatalogItem
  currencyCode: string
  locale: string
  onViewDetails?: () => void
  valueDisplay: { amount: number; periodKey: string } | null
}

/**
 * Scheduled Benefit Layout Component
 *
 * Displays layout for benefits that are scheduled to start in the future
 */
const ScheduledBenefitLayout: React.FC<ScheduledBenefitLayoutProps> = ({
  t,
  benefit,
  currencyCode,
  locale,
  onViewDetails,
  valueDisplay
}) => {
  return (
    <div className="gba:flex gba:justify-between gba:gap-3">
      {/* Left side: Benefit info stacked */}
      <div className="gba:flex-1 gba:space-y-0.5">
        <h3
          className="gba:text-base gba:font-semibold gba:text-foreground gba:leading-tight"
          data-testid={`benefit-catalog-title-${benefit.code}`}
        >
          {getTranslatedBenefitType(benefit, locale)}
        </h3>

        {/* Provider and Amount */}
        {(benefit.provider || valueDisplay) && (
          <div
            className="gba:text-xs gba:text-muted-foreground gba:leading-tight"
            data-testid={`benefit-provider-amount-${benefit.code}`}
          >
            {benefit.provider && <span>{getTranslatedCatalogEntryValue(benefit.provider, locale)}</span>}
            {benefit.provider && valueDisplay && <span> • </span>}
            {valueDisplay && (
              <span className="gba:font-medium gba:text-foreground">
                {formatCurrencyString(valueDisplay.amount, {
                  currency: benefit.currency?.code || currencyCode,
                  locale: locale,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                })}
                {t(valueDisplay.periodKey)}
              </span>
            )}
          </div>
        )}

        {/* Scheduled Badge with Start Date */}
        {benefit.startDate && (
          <div
            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-info-foreground gba:bg-info-secondary gba:px-2 gba:py-1 gba:rounded-md gba:mt-2"
            data-testid={`benefit-scheduled-badge-${benefit.code}`}
          >
            <span className="gba:font-semibold">{t('benefit-scheduled-badge')}</span>
            <span>•</span>
            <span>
              {t('benefit-starts-on')}{' '}
              {new Date(benefit.startDate).toLocaleDateString(locale ?? 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Action buttons stacked */}
      <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-32" data-testid={`benefit-actions-${benefit.code}`}>
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="gba:w-full"
            data-testid={`benefit-catalog-details-button-${benefit.code}`}
          >
            {t('benefit-view-details')}
          </Button>
        )}
        {/* Disabled Request Button - Cannot request already scheduled benefit */}
        <Button
          variant="secondary"
          size="sm"
          disabled={true}
          className="gba:w-full gba:opacity-50 gba:cursor-not-allowed"
          data-testid={`benefit-catalog-request-button-disabled-${benefit.code}`}
        >
          {t('benefit-already-scheduled')}
        </Button>
      </div>
    </div>
  )
}

export default ScheduledBenefitLayout
