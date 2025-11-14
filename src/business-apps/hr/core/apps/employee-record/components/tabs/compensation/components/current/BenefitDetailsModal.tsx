'use client'

import React from 'react'
import {
  SheetPrimitive,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
  Badge
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import dayjs from 'dayjs'
import {
  getTranslatedBenefitType,
  getTranslatedProviderValue,
  getTranslatedCatalogEntryValue
} from '../../utils/benefitTranslationUtils'

interface BenefitDetailsModalProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Sheet open state
   */
  isOpen: boolean
  /**
   * Close handler
   */
  onClose: () => void
  /**
   * Benefit data to display
   */
  benefit: BenefitCatalogItem | null
  /**
   * Currency code for formatting
   */
  currencyCode?: string
  /**
   * Locale for formatting
   */
  locale: string
}

/**
 * Benefit Details Sheet Component
 * Read-only sidebar modal displaying comprehensive benefit information
 *
 * Shows:
 * - Benefit type and description
 * - Provider information
 * - Value details (yearly/monthly amounts)
 * - Active period (start/end dates)
 * - Status and notes
 * - Available providers for the benefit type
 */
const BenefitDetailsModal: React.FC<BenefitDetailsModalProps> = ({
  t,
  isOpen,
  onClose,
  benefit,
  currencyCode = 'EUR',
  locale
}) => {
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-'
    return dayjs(dateStr).locale(locale).format('MMM D, YYYY')
  }

  // Don't render Sheet if benefit is not available
  if (!benefit) return null

  const title = getTranslatedBenefitType(benefit, locale)

  return (
    <SheetPrimitive
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none"
        data-testid="benefit-details-modal"
      >
        <SheetHeader className="gba:px-6">
          <SheetTitle className="gba:text-xl gba:font-semibold">{title}</SheetTitle>
          {benefit.description ? (
            <SheetDescription className="gba:mt-2">{benefit.description}</SheetDescription>
          ) : (
            <SheetDescription className="gba:sr-only">{t('benefit-details-description')}</SheetDescription>
          )}
        </SheetHeader>

        <div className="gba:mt-6 gba:px-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
          <div className="gba:space-y-6">
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

            {/* Active Benefit Details */}
            {benefit.isActive && (
              <>
                {/* Provider Information */}
                {benefit.provider && (
                  <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                    <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                      {t('benefit-details-provider-info')}
                    </h3>
                    <div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                        {t('benefit-details-provider')}
                      </div>
                      <div className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslatedCatalogEntryValue(benefit.provider, locale)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Value Information */}
                {(benefit.yearlyAmount || benefit.monthlyAmount) && (
                  <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                    <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                      {t('benefit-details-value-info')}
                    </h3>
                    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                      {benefit.yearlyAmount && (
                        <div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                            {t('benefit-details-yearly-value')}
                          </div>
                          <div className="gba:text-lg gba:font-bold gba:text-foreground">
                            {formatCurrencyString(benefit.yearlyAmount, {
                              currency: benefit.currency?.code || currencyCode,
                              locale: locale,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })}
                          </div>
                        </div>
                      )}
                      {benefit.monthlyAmount && (
                        <div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                            {t('benefit-details-monthly-value')}
                          </div>
                          <div className="gba:text-lg gba:font-bold gba:text-foreground">
                            {formatCurrencyString(benefit.monthlyAmount, {
                              currency: benefit.currency?.code || currencyCode,
                              locale: locale,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })}
                          </div>
                        </div>
                      )}
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
                          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                            {t('benefit-details-start-date')}
                          </div>
                          <div className="gba:text-sm gba:font-medium gba:text-foreground">
                            {formatDate(benefit.startDate)}
                          </div>
                        </div>
                      )}
                      {benefit.endDate && (
                        <div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                            {t('benefit-details-end-date')}
                          </div>
                          <div className="gba:text-sm gba:font-medium gba:text-foreground">
                            {formatDate(benefit.endDate)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {benefit.notes && (
                  <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                    <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                      {t('benefit-details-notes')}
                    </h3>
                    <div className="gba:text-sm gba:text-muted-foreground gba:whitespace-pre-wrap">{benefit.notes}</div>
                  </div>
                )}
              </>
            )}

            {/* Available Providers (for non-active benefits) */}
            {!benefit.isActive && benefit.availableProviders && benefit.availableProviders.length > 0 && (
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
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="gba:mt-auto gba:px-6">
          <Button onClick={onClose} variant="outline" data-testid="benefit-details-close-button">
            {t('common-close')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </SheetPrimitive>
  )
}

export default BenefitDetailsModal
