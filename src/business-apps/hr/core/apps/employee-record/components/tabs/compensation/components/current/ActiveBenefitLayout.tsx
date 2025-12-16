'use client'

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { BenefitStatus } from '../../types/compensationEnums'
import BenefitInfoSection from './BenefitInfoSection'
import dayjs from 'dayjs'

interface ActiveBenefitLayoutProps {
  t: (key: string, params?: any) => string
  benefit: BenefitCatalogItem
  employeeId: string
  currencyCode: string
  locale: string
  onViewDetails?: () => void
  accessToken: string
  valueDisplay: { amount: number; periodKey: string } | null
}

/**
 * Active Benefit Layout Component
 *
 * Displays layout for benefits that are currently active
 */
const ActiveBenefitLayout: React.FC<ActiveBenefitLayoutProps> = ({
  t,
  benefit,
  employeeId,
  currencyCode,
  locale,
  onViewDetails,
  accessToken,
  valueDisplay
}) => {
  const startDateInFuture = benefit.startDate ? dayjs(benefit.startDate).isAfter(dayjs()) : false
  const isAlreadyDeactivated =
    benefit.isActive && Boolean(benefit.endDate) && benefit.benefitStatus === BenefitStatus.INACTIVE

  return (
    <div className="gba:flex gba:justify-between gba:gap-3">
      {/* Left side: Benefit info stacked */}
      <BenefitInfoSection
        t={t}
        benefit={benefit}
        currencyCode={currencyCode}
        locale={locale}
        valueDisplay={valueDisplay}
      >
        {/* Active-specific: Start Date */}
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
      </BenefitInfoSection>

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
        {/* Show deactivate button OR "Ends" badge */}
        {isAlreadyDeactivated ? (
          /* Show badge when benefit is already deactivated (has endDate + INACTIVE_BENEFIT status) */
          <div
            className="gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-warning-foreground gba:bg-warning-secondary gba:px-3 gba:py-2 gba:rounded-md gba:w-full gba:text-center"
            data-testid={`benefit-scheduled-deactivation-${benefit.code}`}
          >
            {t('benefit-ends')}{' '}
            {new Date(benefit.endDate!).toLocaleDateString(locale ?? 'en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        ) : (
          /* Show deactivate button when benefit can still be deactivated */
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
        )}
      </div>
    </div>
  )
}

export default ActiveBenefitLayout
