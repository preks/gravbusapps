'use client'

import React from 'react'
import { Card, Button } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'
import dayjs from 'dayjs'

interface BenefitCatalogCardProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Benefit catalog item with merged employee data
   */
  benefit: BenefitCatalogItem
  /**
   * Employee ID for the profile being viewed (NOT the logged-in user)
   */
  employeeId: string
  /**
   * Currency code for formatting amounts
   */
  currencyCode?: string
  /**
   * Locale for formatting currency
   */
  locale: string
  /**
   * Callback when user wants to view benefit details
   */
  onViewDetails?: (benefit: BenefitCatalogItem) => void
}

/**
 * BenefitCatalogCard Component
 *
 * Displays a single benefit from the catalog with:
 * - Status badge (Active/Available/Inactive)
 * - Provider information (if active)
 * - Monetary value (if active)
 * - Action buttons (Request/Deactivate)
 */
const BenefitCatalogCard: React.FC<BenefitCatalogCardProps> = ({
  t,
  benefit,
  employeeId,
  currencyCode = 'EUR',
  locale,
  onViewDetails,
  accessToken
}) => {
  // Request and Deactivate handled via AppAction

  /**
   * Parse catalog objectValue to get benefit value and period
   */
  const parseBenefitObjectValue = (objectValue: unknown): { value?: string; period?: string; currency?: string } => {
    if (!objectValue) return {}

    try {
      const parsed = typeof objectValue === 'string' ? JSON.parse(objectValue) : objectValue
      return {
        value: parsed?.value,
        period: parsed?.period,
        currency: parsed?.currency
      }
    } catch (error) {
      console.error('Error parsing benefit objectValue:', error)
      return {}
    }
  }

  /**
   * Get benefit value display from catalog objectValue
   * Returns the catalog's defined value with proper period suffix
   */
  const getBenefitValueDisplay = (): { amount: number; periodKey: string } | null => {
    // For active benefits, prefer catalog value over employee value
    const catalogDetails = parseBenefitObjectValue(benefit.catalogEntry?.objectValue)

    if (catalogDetails.value && catalogDetails.value !== 'none') {
      const amount = parseFloat(catalogDetails.value)

      // Validate that the parsed amount is a valid number
      if (!Number.isFinite(amount)) {
        console.warn(
          `Invalid benefit amount value: "${catalogDetails.value}" for benefit code: ${benefit.code}. Skipping catalog value.`
        )
        // Fall through to employee benefit data fallback
      } else {
        const period = catalogDetails.period || 'yearly'
        const periodKey = period === 'monthly' ? 'benefit-per-month' : 'benefit-per-year'

        return { amount, periodKey }
      }
    }

    // Fallback to employee benefit data if catalog value not available
    if (benefit.yearlyAmount) {
      return { amount: benefit.yearlyAmount, periodKey: 'benefit-per-year' }
    }

    if (benefit.monthlyAmount) {
      return { amount: benefit.monthlyAmount, periodKey: 'benefit-per-month' }
    }

    return null
  }

  /**
   * Check if start date is in the future
   */
  const isStartDateInFuture = (startDate?: string): boolean => {
    if (!startDate) return false
    return dayjs(startDate).isAfter(dayjs())
  }

  /**
   * Handle view details action
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(benefit)
    }
  }

  const valueDisplay = benefit.isActive ? getBenefitValueDisplay() : null
  const startDateInFuture = isStartDateInFuture(benefit.startDate)

  return (
    <Card
      className={`gba:p-3 gba:transition-all gba:duration-200 ${
        benefit.isActive
          ? 'gba:border-success gba:bg-success-secondary/10'
          : 'gba:border-border gba:hover:border-accent'
      }`}
      data-testid={`benefit-catalog-card-${benefit.code}`}
    >
      {/* Available Benefits Layout */}
      {!benefit.isActive && (
        <div className="gba:flex gba:justify-between gba:items-start gba:gap-3">
          <div className="gba:flex-1">
            <h3
              className="gba:text-base gba:font-semibold gba:text-foreground gba:leading-tight"
              data-testid={`benefit-catalog-title-${benefit.code}`}
            >
              {getTranslatedBenefitType(benefit, locale)}
            </h3>
            {benefit.description && (
              <p
                className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mt-1"
                data-testid={`benefit-description-${benefit.code}`}
              >
                {benefit.description}
              </p>
            )}
          </div>

          {/* Right side: Action buttons stacked */}
          <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-32" data-testid={`benefit-actions-${benefit.code}`}>
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                className="gba:w-full"
                data-testid={`benefit-catalog-details-button-${benefit.code}`}
              >
                {t('benefit-view-details')}
              </Button>
            )}
            <AppAction
              variant="custom"
              mode="button"
              buttonSize="sm"
              buttonVariant="secondary"
              emptyState="enable"
              disabled={benefit.isPending}
              data-testid={`benefit-catalog-request-button-${benefit.code}`}
              contexts={[
                {
                  context: FlowContextName.employeeBenefitRequest,
                  contextData: { employeeId: employeeId, benefit: benefit }
                }
              ]}
              prefixDataTestId={`benefit-request-${benefit.code}`}
              autoExecute={true}
              accessToken={accessToken}
              className="gba:w-full gba:font-semibold"
            >
              {benefit.isPending ? t('benefit-status-pending') : t('benefit-request-button')}
            </AppAction>
          </div>
        </div>
      )}

      {/* Active Benefits Layout - Single Flex Row */}
      {benefit.isActive && (
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

            {/* Start Date */}
            {benefit.startDate && (
              <div
                className="gba:text-xs gba:text-muted-foreground gba:leading-tight"
                data-testid={`benefit-start-date-${benefit.code}`}
              >
                {startDateInFuture ? t('benefit-starts-in') : t('benefit-since')}{' '}
                {new Date(benefit.startDate).toLocaleDateString(locale ?? 'en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>

          {/* Right side: Action buttons stacked */}
          <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-32" data-testid={`benefit-actions-${benefit.code}`}>
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                className="gba:w-full"
                data-testid={`benefit-catalog-details-button-${benefit.code}`}
              >
                {t('benefit-view-details')}
              </Button>
            )}
            <AppAction
              variant="custom"
              mode="button"
              buttonSize="sm"
              buttonVariant="outline"
              emptyState="enable"
              disabled={benefit.isPending}
              data-testid={`benefit-catalog-deactivate-button-${benefit.code}`}
              contexts={[
                {
                  context: FlowContextName.employeeBenefitDeactivate,
                  contextData: { employeeId: employeeId, benefit: benefit }
                }
              ]}
              prefixDataTestId={`benefit-deactivate-${benefit.code}`}
              autoExecute={true}
              accessToken={accessToken}
              className="gba:w-full gba:text-destructive hover:gba:bg-destructive hover:gba:text-destructive-foreground"
            >
              {t('benefit-deactivate-button')}
            </AppAction>
          </div>
        </div>
      )}
    </Card>
  )
}

export default BenefitCatalogCard
