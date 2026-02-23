'use client'

import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { getTranslatedBenefitType, getTranslatedCatalogEntryValue } from '../../utils/benefitTranslationUtils'

interface NotApprovedBenefitLayoutProps {
  t: (key: string, params?: any) => string
  benefit: BenefitCatalogItem
  employeeId: string
  locale: string
  onViewDetails?: () => void
  accessToken: string
}

/**
 * Not Approved Benefit Layout Component
 *
 * Displays layout for benefits that were rejected (CANCELLED_COMPENSATION).
 * Shows View Details and Request again button.
 */
const NotApprovedBenefitLayout: React.FC<NotApprovedBenefitLayoutProps> = ({
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
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          <h3
            className="gba:text-base gba:font-semibold gba:text-foreground gba:leading-tight"
            data-testid={`benefit-catalog-title-${benefit.code}`}
          >
            {getTranslatedBenefitType(benefit, locale)}
          </h3>
          <Badge
            variant="secondary"
            size="sm"
            className="gba:shrink-0"
            data-testid={`benefit-not-approved-badge-${benefit.code}`}
          >
            {t('benefit-status-not-approved')}
          </Badge>
        </div>

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

      <div
        className="gba:flex gba:flex-col gba:gap-1 gba:shrink-0 gba:w-auto gba:min-w-32"
        data-testid={`benefit-actions-${benefit.code}`}
      >
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="gba:w-full"
            data-testid={`benefit-catalog-details-button-${benefit.code}`}
          >
            <span className="gba:truncate">{t('benefit-view-details')}</span>
          </Button>
        )}
        <AppAction
          variant="custom"
          mode="button"
          buttonSize="sm"
          buttonVariant="secondary"
          emptyState="enable"
          data-testid={`benefit-catalog-request-again-button-${benefit.code}`}
          contexts={[
            {
              context: FlowContextName.employeeBenefitRequest,
              contextData: { employeeId, benefit }
            }
          ]}
          prefixDataTestId={`benefit-request-again-${benefit.code}`}
          autoExecute={true}
          accessToken={accessToken}
          className="gba:w-full gba:font-semibold"
        >
          <span className="gba:truncate">{t('benefit-request-again')}</span>
        </AppAction>
      </div>
    </div>
  )
}

export default NotApprovedBenefitLayout
