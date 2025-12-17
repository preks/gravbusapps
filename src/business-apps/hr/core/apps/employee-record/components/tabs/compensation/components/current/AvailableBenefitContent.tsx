import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { getPeriodSuffix } from '../../utils/benefitDetailsUtils'
import { getTranslatedProviderValue } from '../../utils/benefitTranslationUtils'

interface AvailableBenefitContentProps {
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
   * Parsed benefit details from objectValue
   */
  benefitDetails: { value?: string; period?: string; groups?: string[]; currency?: string }
}

/**
 * Available Benefit Content Component
 * Displays benefit type, value information, and available providers for non-active benefits
 */
const AvailableBenefitContent: React.FC<AvailableBenefitContentProps> = ({
  benefit,
  t,
  currencyCode,
  locale,
  benefitDetails
}) => {
  return (
    <>
      {/* Benefit Type */}
      {benefit.catalogEntry.type && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-benefit-information')}
          </h3>
          <div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('benefit-details-type')}</div>
            <div className="gba:text-sm gba:font-medium gba:text-foreground">{benefit.catalogEntry.type}</div>
          </div>
        </div>
      )}

      {/* Benefit Value Information from objectValue JSON */}
      {benefitDetails.value && !Number.isNaN(Number.parseFloat(benefitDetails.value)) && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-value')}
          </h3>
          <div>
            <div className="gba:text-lg gba:font-bold gba:text-foreground">
              {formatCurrencyString(Number.parseFloat(benefitDetails.value), {
                currency: benefitDetails.currency || currencyCode,
                locale: locale,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
              {getPeriodSuffix(benefitDetails.period)}
            </div>
          </div>
        </div>
      )}

      {/* Show message if no value data available */}
      {(!benefitDetails.value || Number.isNaN(Number.parseFloat(benefitDetails.value))) && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <div className="gba:text-sm gba:text-muted-foreground gba:italic">{t('benefit-details-no-value-info')}</div>
        </div>
      )}

      {/* Available Providers */}
      {benefit.availableProviders && benefit.availableProviders.length > 0 && (
        <div className="gba:space-y-3 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            {t('benefit-details-available-providers')}
          </h3>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {benefit.availableProviders.map(provider => (
              <Badge key={provider.id} variant="outline" data-testid={`provider-badge-${provider.code}`}>
                {getTranslatedProviderValue(provider, locale)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default AvailableBenefitContent
