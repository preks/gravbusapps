'use client'

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import BenefitInfoSection from './BenefitInfoSection'

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
      <BenefitInfoSection
        t={t}
        benefit={benefit}
        currencyCode={currencyCode}
        locale={locale}
        valueDisplay={valueDisplay}
      >
        {/* Scheduled-specific: Badge with Start Date */}
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
      </BenefitInfoSection>

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
