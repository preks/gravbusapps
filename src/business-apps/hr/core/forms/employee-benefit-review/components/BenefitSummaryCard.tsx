import React from 'react'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../utils/translationHelpers'
import { parseBenefitObjectValue } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/utils/benefitDetailsUtils'
import type { BenefitSummaryData } from '../types'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

interface BenefitSummaryCardProps {
  t: (key: string, params?: any) => string
  benefit: BenefitSummaryData | BenefitCatalogItem
  locale?: string
  currencyCode?: string
}

/**
 * Displays a summary card for a benefit with key information
 * Shared component for benefit action forms (request, deactivate, etc.)
 *
 * @param currencyCode - Currency code from employee's bank account (e.g., 'USD', 'EUR'). Fallback to 'EUR' if not provided.
 */
const BenefitSummaryCard: React.FC<BenefitSummaryCardProps> = ({ t, benefit, locale, currencyCode = 'EUR' }) => {
  const currentLocale = locale || getCurrentActiveUserLocale()

  // Parse catalog objectValue to get the real benefit value and period
  const catalogDetails = parseBenefitObjectValue(benefit.catalogEntry?.objectValue)

  // Determine the display value and period with priority:
  // 1. Catalog objectValue (source of truth for catalog-defined benefits)
  // 2. Employee benefit amounts (for active/historical benefits)
  const getValueDisplay = (): { amount: number; periodLabel: string; period: 'monthly' | 'yearly' } | null => {
    // Priority 1: Use catalog value if available
    if (catalogDetails.value && catalogDetails.value !== 'none') {
      const amount = Number.parseFloat(catalogDetails.value)
      if (Number.isFinite(amount)) {
        const period: 'monthly' | 'yearly' = catalogDetails.period === 'monthly' ? 'monthly' : 'yearly'
        const periodLabel = period === 'monthly' ? t('current-monthly') : t('current-annually')
        return { amount, periodLabel, period }
      }
    }

    // Priority 2: Fall back to employee benefit yearly amount
    if (benefit.yearlyAmount !== null && benefit.yearlyAmount !== undefined && benefit.yearlyAmount > 0) {
      return { amount: benefit.yearlyAmount, periodLabel: t('current-annually'), period: 'yearly' }
    }

    // Priority 3: Fall back to employee benefit monthly amount
    if (benefit.monthlyAmount !== null && benefit.monthlyAmount !== undefined && benefit.monthlyAmount > 0) {
      return { amount: benefit.monthlyAmount, periodLabel: t('current-monthly'), period: 'monthly' }
    }

    return null
  }

  const valueDisplay = getValueDisplay()

  return (
    <div className="gba:p-4 gba:bg-muted gba:rounded-lg gba:space-y-2" data-testid="benefit-summary-card">
      <div className="gba:font-semibold gba:text-foreground">{getTranslatedBenefitType(benefit, currentLocale)}</div>

      {benefit.provider && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">{t('benefit-provider')}:</span>{' '}
          {getTranslatedCatalogEntryValue(benefit.provider, currentLocale)}
        </div>
      )}

      {/* Display value with correct period derived from actual amount */}
      {valueDisplay && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">
            {valueDisplay.period === 'monthly' ? t('benefit-details-monthly-value') : t('benefit-value-yearly')}:
          </span>{' '}
          {formatCurrencyString(valueDisplay.amount, {
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}{' '}
          / {valueDisplay.periodLabel}
        </div>
      )}

      {benefit.startDate && (
        <div className="gba:text-sm gba:text-muted-foreground">
          <span className="gba:font-medium">{t('modal-request-start-date-label')}:</span>{' '}
          {formatDate(benefit.startDate, 'date.short')}
        </div>
      )}
    </div>
  )
}

export default BenefitSummaryCard
