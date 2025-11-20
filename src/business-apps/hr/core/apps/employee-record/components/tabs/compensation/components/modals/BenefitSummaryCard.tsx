import React from 'react'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { formatForDisplay } from '@/common/utils/dateFormatter'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

interface BenefitSummaryCardProps {
  t: (key: string, params?: any) => string
  benefit: BenefitCatalogItem
  locale?: string
}

/**
 * Displays a summary card for a benefit with key information
 */
const BenefitSummaryCard: React.FC<BenefitSummaryCardProps> = ({ t, benefit, locale }) => {
  const currentLocale = locale || getCurrentActiveUserLocale()

  return (
    <div className="gba:p-4 gba:bg-muted gba:rounded-lg gba:space-y-2" data-testid="deactivate-benefit-summary-card">
      <div className="gba:font-semibold gba:text-foreground">{getTranslatedBenefitType(benefit, currentLocale)}</div>

      {benefit.provider && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">{t('benefit-provider')}:</span>{' '}
          {getTranslatedCatalogEntryValue(benefit.provider, currentLocale)}
        </div>
      )}

      {benefit.yearlyAmount && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">{t('benefit-value-yearly')}:</span>{' '}
          {formatCurrencyString(benefit.yearlyAmount, {
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}{' '}
          / {t('current-annually')}
        </div>
      )}

      {benefit.startDate && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">{t('modal-request-start-date-label')}:</span>{' '}
          {formatForDisplay(benefit.startDate)}
        </div>
      )}
    </div>
  )
}

export default BenefitSummaryCard
