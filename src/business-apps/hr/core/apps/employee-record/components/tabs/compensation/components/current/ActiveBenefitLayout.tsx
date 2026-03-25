'use client'

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'
import { BenefitStatus } from '../../types/compensationEnums'
import BenefitInfoSection from './BenefitInfoSection'
import { formatDate } from '@/common/utils/windowUtils'
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

  // Check if deactivation request is pending approval (status = PENDING_COMPENSATION, benefitStatus = ACTIVE_BENEFIT)
  const isPendingDeactivation = benefit.isPending && benefit.isActive && benefit.benefitStatus === BenefitStatus.ACTIVE

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
            className="gba:text-xs gba:text-decorative-secondary-foreground gba:leading-tight"
            data-testid={`benefit-start-date-${benefit.code}`}
          >
            {startDateInFuture ? t('benefit-starts-in') : t('benefit-since')}{' '}
            {formatDate(benefit.startDate, 'date.short')}
          </div>
        )}

        {/* Scheduled Deactivation Badge - Moved to left column */}
        {isAlreadyDeactivated && benefit.endDate && (
          <div
            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-warning-foreground gba:bg-warning-secondary gba:px-2 gba:py-1 gba:rounded-md gba:mt-2"
            data-testid={`benefit-scheduled-deactivation-${benefit.code}`}
          >
            <span className="gba:font-semibold">{t('benefit-ends')}</span>
            <span>•</span>
            <span>{formatDate(benefit.endDate, 'date.short')}</span>
          </div>
        )}
      </BenefitInfoSection>

      {/* Right side: Action buttons stacked */}
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
        {/* Show deactivate button (active, deactivated, or scheduled) */}
        {isPendingDeactivation ? (
          /* Show deactivated button when deactivation request is awaiting approval */
          <Button
            variant="destructive"
            size="sm"
            disabled={true}
            className="gba:w-full"
            data-testid={`benefit-catalog-deactivate-button-deactivated-${benefit.code}`}
          >
            <span className="gba:truncate">{t('benefit-deactivated-button')}</span>
          </Button>
        ) : isAlreadyDeactivated ? (
          /* Show disabled button when benefit is already scheduled for deactivation */
          <Button
            variant="secondary"
            size="sm"
            disabled={true}
            className="gba:w-full gba:opacity-50 gba:cursor-not-allowed"
            data-testid={`benefit-catalog-deactivate-button-disabled-${benefit.code}`}
          >
            <span className="gba:truncate">{t('benefit-deactivate-button')}</span>
          </Button>
        ) : (
          /* Show active deactivate button when benefit can still be deactivated */
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
            <span className="gba:truncate">{t('benefit-deactivate-button')}</span>
          </AppAction>
        )}
      </div>
    </div>
  )
}

export default ActiveBenefitLayout
