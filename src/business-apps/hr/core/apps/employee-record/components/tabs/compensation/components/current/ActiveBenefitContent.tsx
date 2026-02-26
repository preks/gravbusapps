import React from 'react'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { formatDate } from '../../utils/benefitDetailsUtils'
import { getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

interface ActiveBenefitContentProps {
  /**
   * Benefit data
   */
  benefit: BenefitCatalogItem
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Currency code for formatting
   */
  currencyCode: string
  /**
   * Locale for formatting
   */
  locale: string
  /**
   * Catalog value to display (amount and period label)
   */
  catalogValue: { amount: number; periodLabel: string } | null
  /**
   * Translated benefit title
   */
  title: string
}

/**
 * Active Benefit Content Component
 * Displays provider information, value details, and active period for active benefits
 */
const ActiveBenefitContent: React.FC<ActiveBenefitContentProps> = ({
  benefit,
  t,
  currencyCode,
  locale,
  catalogValue,
  title
}) => {
  return (
    <>
      {/* Benefit Type Information */}
      <div className="gba:space-y-3">
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
          {t('benefit-details-type-info')}
        </h3>
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('benefit-details-category')}</div>
            <div className="gba:text-sm gba:font-medium gba:text-foreground">{title}</div>
          </div>
        </div>
      </div>

      {/* Provider Information */}
      {benefit.provider && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-provider-info')}
          </h3>
          <div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('benefit-details-provider')}</div>
            <div className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslatedCatalogEntryValue(benefit.provider, locale)}
            </div>
          </div>
        </div>
      )}

      {/* Value Information - Use catalog value */}
      {catalogValue && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-value-info')}
          </h3>
          <div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{catalogValue.periodLabel}</div>
            <div className="gba:text-lg gba:font-bold gba:text-foreground">
              {formatCurrencyString(catalogValue.amount, {
                currency: benefit.currency?.code || currencyCode,
                locale: locale,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Period */}
      {(benefit.startDate || benefit.endDate) && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-active-period')}
          </h3>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {benefit.startDate && (
              <div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('benefit-details-start-date')}</div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {formatDate(benefit.startDate, locale)}
                </div>
              </div>
            )}
            {benefit.endDate && (
              <div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('benefit-details-end-date')}</div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {formatDate(benefit.endDate, locale)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes and Comments */}
      {(benefit.notes || benefit.comments) && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-additional-info')}
          </h3>
          <div className="gba:space-y-2 gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">
            {benefit.notes && (
              <div data-testid="benefit-details-notes-value">
                <span className="gba:text-muted-foreground">{t('benefit-details-justification')}: </span>
                {benefit.notes}
              </div>
            )}
            {benefit.comments && (
              <div data-testid="benefit-details-comments-value">
                <span className="gba:text-muted-foreground">{t('benefit-details-comments')}: </span>
                {benefit.comments}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default ActiveBenefitContent
