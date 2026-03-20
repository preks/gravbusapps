import React from 'react'
import { SheetFooter, Button } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BenefitCatalogItem } from '../../types/benefitCatalogTypes'

interface BenefitDetailsFooterProps {
  /**
   * Benefit data
   */
  benefit: BenefitCatalogItem
  /**
   * When set, passed to request flow as pre-selected provider (from modal provider dropdown)
   */
  selectedProviderRef?: string
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Access token for API requests
   */
  accessToken: string
  /**
   * Employee ID
   */
  employeeId?: string
  /**
   * Close handler
   */
  onClose: () => void
}

/**
 * Benefit Details Footer Component
 * Displays action buttons and error messages in the sheet footer
 *
 * Shows request button only when benefit can be requested (not active, scheduled, or pending)
 */
const BenefitDetailsFooter: React.FC<BenefitDetailsFooterProps> = ({
  benefit,
  selectedProviderRef,
  t,
  accessToken,
  employeeId,
  onClose
}) => {
  const isEmployeeIdValid = Boolean(employeeId)
  const isAvailableBenefit = benefit.canRequest
  const hasProviders = (benefit.availableProviders?.length ?? 0) > 0
  const hasProviderSelection = selectedProviderRef != null && selectedProviderRef !== ''
  const canSubmitRequest = isAvailableBenefit && (!hasProviders || hasProviderSelection)
  const benefitWithProvider = hasProviderSelection ? { ...benefit, providerRef: selectedProviderRef } : benefit

  return (
    <SheetFooter className="gba:mt-auto gba:px-6 gba:flex-col gba:gap-2">
      {canSubmitRequest && (
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
                  contextData: { employeeId: employeeId!, benefit: benefitWithProvider }
                }
              ]}
              prefixDataTestId={`benefit-details-request-${benefit.code}`}
              autoExecute={true}
              accessToken={accessToken}
              className="gba:font-semibold gba:w-full"
            >
              {t('benefit-request-button')}
            </AppAction>
          )}
        </>
      )}
      <Button onClick={onClose} variant="outline" className="gba:w-full" data-testid="benefit-details-close-button">
        {t('common-close')}
      </Button>
    </SheetFooter>
  )
}

export default BenefitDetailsFooter
