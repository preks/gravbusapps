import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BenefitCatalogItem } from '../../../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { formatForDisplay } from '@/common/utils/dateFormatter'

interface BenefitSummaryCardProps {
  benefit: BenefitCatalogItem
}

/**
 * Displays a summary card for a benefit with key information
 */
const BenefitSummaryCard: React.FC<BenefitSummaryCardProps> = ({ benefit }) => {
  return (
    <div className="gba:p-4 gba:bg-muted gba:rounded-lg gba:space-y-2" data-testid="deactivate-benefit-summary-card">
      <div className="gba:font-semibold gba:text-foreground">{benefit.benefitType}</div>

      {benefit.provider?.value && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.provider', 'Provider')}:
          </span>{' '}
          {benefit.provider.value}
        </div>
      )}

      {benefit.yearlyAmount && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.value', 'Value')}:
          </span>{' '}
          {formatCurrencyString(benefit.yearlyAmount, {
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}{' '}
          / year
        </div>
      )}

      {benefit.startDate && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.start_date', 'Start Date')}:
          </span>{' '}
          {formatForDisplay(benefit.startDate)}
        </div>
      )}
    </div>
  )
}

export default BenefitSummaryCard
