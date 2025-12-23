'use client'

import React from 'react'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

interface BenefitInfoSectionProps {
  t: (key: string, params?: any) => string
  benefit: BenefitCatalogItem
  currencyCode: string
  locale: string
  valueDisplay: { amount: number; periodKey: string } | null
  children?: React.ReactNode
}

/**
 * Shared Benefit Info Section
 *
 * Displays common benefit information:
 * - Title
 * - Provider and Amount
 * - Optional children for custom date/status badges
 *
 * Used by ActiveBenefitLayout and ScheduledBenefitLayout to reduce code duplication.
 */
const BenefitInfoSection: React.FC<BenefitInfoSectionProps> = ({
  t,
  benefit,
  currencyCode,
  locale,
  valueDisplay,
  children
}) => {
  return (
    <div className="gba:flex-1 gba:space-y-0.5">
      {/* Benefit Title */}
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

      {/* Custom date/status badges passed as children */}
      {children}
    </div>
  )
}

export default BenefitInfoSection
