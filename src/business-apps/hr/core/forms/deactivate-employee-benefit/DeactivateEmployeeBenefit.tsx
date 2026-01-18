'use client'

import React, { useCallback, useMemo } from 'react'
import { Label, DateInput, useTranslation, LocalizationProvider, type SupportedLocale } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import { BenefitSummaryCard } from '../employee-benefit-review/components'
import translations from '../_i18n'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { DeactivateEmployeeBenefitProvider, useDeactivateEmployeeBenefit } from './DeactivateEmployeeBenefitContext'
import { useDeactivateEmployeeBenefitForm } from './useDeactivateEmployeeBenefitForm'

/**
 * Form for deactivating an active employee benefit.
 * Shows benefit details, requires reason and end date, may need HR approval.
 *
 * **Kogito Integration:**
 * - Flow: deactivateEmployeeBenefit
 * - Domain: COMPENSATION_FLOW_DOMAIN
 * - Approval: Conditional (based on benefit type/value)
 */
const DeactivateEmployeeBenefitContent: React.FC<BusinessAppContextProps> = ({
  additionalData,
  userInfo,
  accessToken
}) => {
  const { data } = useDeactivateEmployeeBenefit()
  const { t } = useTranslation(translations)

  // Extract currency code from benefit's currency (catalog is the single source of truth)
  const currencyCode = useMemo(() => {
    // Use benefit's currency code directly from catalog
    if (data?.selectedBenefit?.currency?.code) {
      return data.selectedBenefit.currency.code
    }
    // Fallback: extract from currencyRef if currency object not available
    if (data?.selectedBenefit?.currencyRef) {
      const parts = data.selectedBenefit.currencyRef.split(':')
      return parts[parts.length - 1] || 'EUR'
    }
    return 'EUR'
  }, [data?.selectedBenefit?.currency?.code, data?.selectedBenefit?.currencyRef])

  const {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    endDate,
    setEndDate,
    minEndDate,
    isFormValid,
    validateForm,
    buildSubmitPayload,
    markAsCancelled,
    markAsSubmitted
  } = useDeactivateEmployeeBenefitForm({ data, additionalData, userInfo, accessToken, t })

  const title = useMemo(() => t('modal-deactivate-title'), [t])

  // Submission handler that builds payload and marks as submitted after successful build
  // This ensures markAsSubmitted() is called immediately after payload is ready,
  // preventing abort events if component unmounts during process execution
  const handleSubmit = useCallback(async () => {
    try {
      const payload = await buildSubmitPayload()
      // Only mark as submitted after successful payload build to prevent abort on cleanup
      markAsSubmitted()
      return payload
    } catch (error) {
      // Do not mark as submitted on error to allow retry
      console.error('Failed to build submit payload:', error)
      throw error // Rethrow to let AppActionForm handle the error
    }
  }, [buildSubmitPayload, markAsSubmitted])

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
      data-testid="deactivate-employee-benefit-container"
    >
      <FormHeader
        title={title}
        flowIconUrl={flowIconUrl}
        employee={
          employeeProfile
            ? {
                firstName: employeeProfile.firstName,
                lastName: employeeProfile.lastName,
                pictureThumbnail: employeeProfile.pictureThumbnail,
                jobTitle: employeePosition?.jobPosition?.name
              }
            : undefined
        }
      />

      <div
        className="gba:flex gba:flex-col gba:[&>div[data-testid='deactivate-employee-benefit']]:pt-0!"
        data-testid="deactivate-employee-benefit-form-content"
      >
        <AppActionForm
          processType="update"
          formData={{}}
          validateForm={validateForm}
          onSubmit={handleSubmit}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonText={t('modal-deactivate-submit-button')}
          submitButtonVariant="destructive"
          isSubmitDisabled={!isFormValid}
          submitButtonTestId="deactivate-employee-benefit-submit-button"
          onCancel={markAsCancelled}
          data-testid="deactivate-employee-benefit"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="deactivate-employee-benefit-fields">
            {/* Benefit Summary Card */}
            {selectedBenefit && <BenefitSummaryCard t={t} benefit={selectedBenefit} currencyCode={currencyCode} />}

            {/* Effective End Date (Required) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-deactivate-end-date-label')} <span className="gba:text-destructive">*</span>
              </Label>
              <DateInput
                type="date"
                outputFormat="iso"
                value={endDate}
                onChange={date => setEndDate(typeof date === 'string' ? date : '')}
                min={minEndDate}
                data-testid="deactivate-employee-benefit-end-date-input"
              />
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const DeactivateEmployeeBenefit: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale() as SupportedLocale, [])
  return (
    <LocalizationProvider locale={locale}>
      <DeactivateEmployeeBenefitProvider {...context}>
        <DeactivateEmployeeBenefitContent {...context} />
      </DeactivateEmployeeBenefitProvider>
    </LocalizationProvider>
  )
}

export default DeactivateEmployeeBenefit
