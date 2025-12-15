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

// CSS to hide the close button
const sheetStyles = `
  .benefit-details-sheet-no-close > button[data-slot="sheet-close"] {
    display: none !important;
  }
`
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
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
  locale,
  accessToken,
  userInfo
}) => {
  const employeeId = userInfo?.employeeDetails?.employeeId
  const isEmployeeIdValid = Boolean(employeeId)

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-'
    return dayjs(dateStr).locale(locale).format('MMM D, YYYY')
  }

  // Don't render Sheet if benefit is not available
  if (!benefit) return null

  const title = getTranslatedBenefitType(benefit, locale)

  // Parse objectValue JSON to extract benefit details
  const parseBenefitObjectValue = (
    objectValue: unknown
  ): { value?: string; period?: string; groups?: string[]; currency?: string } => {
    if (!objectValue) return {}

    try {
      // objectValue might be a string or already parsed object
      const parsed = typeof objectValue === 'string' ? JSON.parse(objectValue) : objectValue
      return {
        value: parsed?.value,
        period: parsed?.period,
        groups: parsed?.groups,
        currency: parsed?.currency
      }
    } catch (error) {
      console.error('Error parsing benefit objectValue:', error)
      return {}
    }
  }

  // Get benefit value details from objectValue JSON
  const benefitDetails = parseBenefitObjectValue(benefit.catalogEntry.objectValue)

  // Format period suffix
  const getPeriodSuffix = (period?: string): string => {
    if (period === 'yearly') return '/yr'
    if (period === 'monthly') return '/mo'
    return ''
  }

  /**
   * Get benefit value display from catalog objectValue
   * Returns the catalog's defined value with proper period label
   */
  const getCatalogValueDisplay = (): { amount: number; periodLabel: string } | null => {
    // Use catalog value as source of truth
    if (benefitDetails.value && benefitDetails.value !== 'none') {
      const amount = parseFloat(benefitDetails.value)
      const period = benefitDetails.period || 'yearly'
      const periodLabel = period === 'monthly' ? t('benefit-details-monthly-value') : t('benefit-details-yearly-value')

      return { amount, periodLabel }
    }

    // Fallback to employee benefit data if catalog value not available
    if (benefit.yearlyAmount) {
      return { amount: benefit.yearlyAmount, periodLabel: t('benefit-details-yearly-value') }
    }

    if (benefit.monthlyAmount) {
      return { amount: benefit.monthlyAmount, periodLabel: t('benefit-details-monthly-value') }
    }

    return null
  }

  const catalogValue = benefit.isActive ? getCatalogValueDisplay() : null

  return (
    <>
      <style>{sheetStyles}</style>
      <SheetPrimitive
        open={isOpen}
        onOpenChange={open => {
          if (!open) onClose()
        }}
      >
        <SheetContent
          side="right"
          className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none benefit-details-sheet-no-close"
          data-testid="benefit-details-modal"
        >
          <SheetHeader className="gba:px-6">
            <div className="gba:space-y-2">
              <SheetTitle className="gba:text-xl gba:font-semibold">{title}</SheetTitle>
              <Badge
                variant={benefit.isActive ? 'success' : 'default'}
                data-testid={`benefit-status-badge-${benefit.code}`}
                className="gba:w-fit"
              >
                {benefit.isActive ? t('benefit-status-active') : t('benefit-status-available')}
              </Badge>
            </div>
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
                    <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                      {t('benefit-details-category')}
                    </div>
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
                      <div className="gba:text-sm gba:text-muted-foreground gba:whitespace-pre-wrap">
                        {benefit.notes}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Available Benefit Details (for non-active benefits) */}
              {!benefit.isActive && (
                <>
                  {/* Benefit Type */}
                  {benefit.catalogEntry.type && (
                    <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                      <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                        {t('benefit-details-benefit-information')}
                      </h3>
                      <div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                          {t('benefit-details-type')}
                        </div>
                        <div className="gba:text-sm gba:font-medium gba:text-foreground">
                          {benefit.catalogEntry.type}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Benefit Value Information from objectValue JSON */}
                  {benefitDetails.value && !isNaN(parseFloat(benefitDetails.value)) && (
                    <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                      <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
                        {t('benefit-details-value')}
                      </h3>
                      <div>
                        <div className="gba:text-lg gba:font-bold gba:text-foreground">
                          {formatCurrencyString(parseFloat(benefitDetails.value), {
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
                  {(!benefitDetails.value || isNaN(parseFloat(benefitDetails.value))) && (
                    <div className="gba:space-y-3 gba:pt-4 gba:border-t">
                      <div className="gba:text-sm gba:text-muted-foreground gba:italic">
                        {t('benefit-details-no-value-info')}
                      </div>
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
              )}
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="gba:mt-auto gba:px-6 gba:flex-col gba:gap-2">
            {!benefit.isActive && (
              <>
                {!isEmployeeIdValid && (
                  <div
                    className="gba:text-sm gba:text-destructive gba:text-center gba:p-2 gba:bg-destructive-secondary gba:rounded"
                    data-testid="benefit-details-employee-id-error"
                  >
                    {t('benefit-request-employee-id-missing')}
                  </div>
                )}
                {isEmployeeIdValid && (
                  <AppAction
                    variant="custom"
                    mode="button"
                    buttonSize="default"
                    buttonVariant="default"
                    emptyState="enable"
                    data-testid={`benefit-details-request-button-${benefit.code}`}
                    contexts={[
                      {
                        context: FlowContextName.employeeBenefitRequest,
                        contextData: { employeeId: employeeId!, benefit: benefit }
                      }
                    ]}
                    prefixDataTestId={`benefit-details-request-${benefit.code}`}
                    autoExecute={true}
                    accessToken={accessToken}
                    className="gba:font-semibold gba:w-full"
                  >
                    {benefit.isPending ? t('benefit-status-pending') : t('benefit-request-button')}
                  </AppAction>
                )}
              </>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="gba:w-full"
              data-testid="benefit-details-close-button"
            >
              {t('common-close')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </SheetPrimitive>
    </>
  )
}

export default BenefitDetailsModal
