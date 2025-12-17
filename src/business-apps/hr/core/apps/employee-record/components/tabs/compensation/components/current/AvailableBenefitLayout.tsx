'use client'

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

interface AvailableBenefitLayoutProps {
  t: (key: string, params?: any) => string
  benefit: BenefitCatalogItem
  employeeId: string
  locale: string
  onViewDetails?: () => void
  accessToken: string
}

/**
 * Available Benefit Layout Component
 *
 * Displays layout for benefits that are available to request
 */
const AvailableBenefitLayout: React.FC<AvailableBenefitLayoutProps> = ({
  t,
  benefit,
  employeeId,
  locale,
  onViewDetails,
  accessToken
}) => {
  return (
    <div className="gba:flex gba:justify-between gba:items-start gba:gap-3">
      <div className="gba:flex-1">
        <h3
          className="gba:text-base gba:font-semibold gba:text-foreground gba:leading-tight"
          data-testid={`benefit-catalog-title-${benefit.code}`}
        >
          {getTranslatedBenefitType(benefit, locale)}
        </h3>

        {/* Provider Badges */}
        {benefit.availableProviders && benefit.availableProviders.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1" data-testid={`benefit-providers-${benefit.code}`}>
            {benefit.availableProviders.map(provider => (
              <span
                key={provider.id}
                className="gba:inline-flex gba:items-center gba:text-xs gba:text-foreground gba:bg-muted gba:px-2 gba:py-0.5 gba:rounded-md"
                data-testid={`benefit-provider-badge-${benefit.code}-${provider.code}`}
              >
                {getTranslatedCatalogEntryValue(provider, locale)}
              </span>
            ))}
          </div>
        )}

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
            onClick={onViewDetails}
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
  )
}

export default AvailableBenefitLayout
