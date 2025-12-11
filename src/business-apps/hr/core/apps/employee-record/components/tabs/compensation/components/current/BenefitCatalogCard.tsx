'use client'

import React from 'react'
import { Card, Button, Icon } from '@newwork/nw-design-system'
import { Plus as PlusIcon } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

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
  currencyCode = 'EUR',
  locale,
  onViewDetails,
  accessToken,
  userInfo
}) => {
  const employeeId = userInfo?.employeeDetails?.employeeId

  // Request and Deactivate handled via AppAction

  /**
   * Handle view details action
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(benefit)
    }
  }

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
        <div className="gba:flex gba:justify-between gba:items-start gba:gap-2">
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

          <AppAction
            variant="custom"
            mode="button"
            buttonSize="sm"
            buttonVariant="secondary"
            emptyState="enable"
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
            className="gba:w-32 gba:font-semibold"
          >
            <Icon icon={PlusIcon} size="sm" data-testid={`benefit-request-icon-${benefit.code}`} />
            {benefit.isPending ? t('benefit-status-pending') : t('benefit-request-button')}
          </AppAction>
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
            {(benefit.provider || benefit.yearlyAmount) && (
              <div
                className="gba:text-xs gba:text-muted-foreground gba:leading-tight"
                data-testid={`benefit-provider-amount-${benefit.code}`}
              >
                {benefit.provider && <span>{getTranslatedCatalogEntryValue(benefit.provider, locale)}</span>}
                {benefit.provider && benefit.yearlyAmount && <span> • </span>}
                {benefit.yearlyAmount && (
                  <span className="gba:font-medium gba:text-foreground">
                    {formatCurrencyString(benefit.yearlyAmount, {
                      currency: benefit.currency?.code || currencyCode,
                      locale: locale,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                    {t('benefit-per-year')}
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
                {t('benefit-since')}{' '}
                {new Date(benefit.startDate).toLocaleDateString(locale ?? 'en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>

          {/* Right side: Action buttons stacked */}
          <div className="gba:flex gba:flex-col gba:gap-1 gba:w-32" data-testid={`benefit-actions-${benefit.code}`}>
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
