'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  Label,
  Input,
  Textarea,
  useTranslation,
  LocalizationProvider,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import BenefitProviderField from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/components/form-fields/BenefitProviderField'
import { getTranslatedBenefitType } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/utils/benefitTranslationUtils'
import translations from '@/business-apps/hr/core/apps/employee-record/_i18n'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { RequestEmployeeBenefitProvider, useRequestEmployeeBenefit } from './RequestEmployeeBenefitContext'
import { useTaskCancellation } from '../../hooks/useTaskCancellation'
import { useRequestEmployeeBenefitForm } from './useRequestEmployeeBenefitForm'
import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'

type SupportedLocale = 'en-US' | 'de-DE' | 'ro-RO'

/**
 * Form for requesting a new employee benefit.
 * Allows employee to select provider, specify value, start date, and provide justification.
 *
 * **Kogito Integration:**
 * - Flow: requestEmployeeBenefit
 * - Domain: COMPENSATION_FLOW_DOMAIN
 * - Approval: Required (manager approval)
 */
const RequestEmployeeBenefitContent: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo }) => {
  const { data, isLoading, error, refetch } = useRequestEmployeeBenefit()
  const { t } = useTranslation(translations)
  const locale = getCurrentActiveUserLocale()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedBenefitValueDisplay, setSubmittedBenefitValueDisplay] = useState<string | null>(null)

  const {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    benefitProviders,
    provider,
    setProvider,
    startDate,
    setStartDate,
    justification,
    setJustification,
    period,
    includedDisplayWithCurrency,
    resolvedPeriodDisplay,
    isFormValid,
    validateForm,
    buildSubmitPayload
  } = useRequestEmployeeBenefitForm({ data, additionalData, userInfo, t })

  // Handle task cancellation when form closes without submission
  const { markAsSubmitted, markAsCancelled } = useTaskCancellation('pse_abort')

  const title = useMemo(() => t('modal-request-title'), [t])

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true)
    setSubmittedBenefitValueDisplay(includedDisplayWithCurrency)
    return buildSubmitPayload({ markAsSubmitted })
  }, [buildSubmitPayload, includedDisplayWithCurrency, markAsSubmitted])

  const handleProcessCompletion = useCallback((detail: { resolution?: 'success' | 'failure' } | null) => {
    if (detail?.resolution !== 'success') {
      setIsSubmitting(false)
      setSubmittedBenefitValueDisplay(null)
    }
  }, [])

  // Get translated benefit type
  const translatedBenefitType = useMemo(
    () => (selectedBenefit ? getTranslatedBenefitType(selectedBenefit, locale) : '-'),
    [selectedBenefit, locale]
  )
  const benefitValueDisplay = submittedBenefitValueDisplay ?? includedDisplayWithCurrency

  // Show loading state while data is being fetched
  if (isLoading && !isSubmitting) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px] gba:min-h-[400px] gba:items-center gba:justify-center"
        data-testid="request-employee-benefit-loading"
      >
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4" />
          <p className="gba:text-sm gba:text-muted-foreground">{t('modal-request-loading')}</p>
        </div>
      </div>
    )
  }

  // Show error state if data fetch failed
  if (error) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px] gba:min-h-[400px] gba:items-center gba:justify-center gba:p-6"
        data-testid="request-employee-benefit-error"
      >
        <Alert variant="destructive" className="gba:mb-4">
          <AlertTitle>{t('compensation-error-title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="default" data-testid="request-employee-benefit-retry-button">
          {t('action-retry')}
        </Button>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]"
      data-testid="request-employee-benefit-container"
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
        className="gba:flex gba:flex-col gba:[&>div[data-testid='request-employee-benefit']]:pt-0!"
        data-testid="request-employee-benefit-form-content"
      >
        <AppActionForm
          processType="create"
          formData={{}}
          validateForm={validateForm}
          onSubmit={handleSubmit}
          onProcessCompletion={handleProcessCompletion}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          cancelButtonText={t('modal-request-cancel-button')}
          submitButtonText={t('modal-request-submit-button')}
          isSubmitDisabled={!isFormValid}
          submitButtonTestId="request-employee-benefit-submit-button"
          cancelButtonTestId="request-employee-benefit-cancel-button"
          onCancel={() => {
            markAsCancelled()
          }}
          data-testid="request-employee-benefit"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="request-employee-benefit-fields">
            {/* Benefit Type (Read-only) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-benefit-type-label')}
              </Label>
              <div
                className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-3 gba:py-2 gba:text-sm"
                data-testid="request-employee-benefit-benefit-type-display"
              >
                {translatedBenefitType}
              </div>
            </div>

            {/* Benefit Provider (Optional) - Only show if providers are available */}
            {(benefitProviders.length > 0 ||
              (selectedBenefit?.availableProviders && selectedBenefit.availableProviders.length > 0)) && (
              <BenefitProviderField
                t={t}
                value={provider}
                onChange={setProvider}
                providers={benefitProviders.length > 0 ? benefitProviders : selectedBenefit?.availableProviders || []}
                required={false}
              />
            )}

            {/* Benefit Value (from objectValue preferred, fallback to additional values) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-value-label')}
              </Label>
              <div
                className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-3 gba:py-2 gba:text-sm"
                data-testid="request-employee-benefit-included-value-display"
              >
                {benefitValueDisplay}
              </div>
            </div>

            {/* Period (pre-populated from objectValue, read-only display) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-period-label')}
              </Label>
              <div
                className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-3 gba:py-2 gba:text-sm"
                data-testid="request-employee-benefit-period-display"
              >
                {period || resolvedPeriodDisplay || '-'}
              </div>
            </div>

            {/* Preferred Start Date (Required) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-start-date-label')} <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="request-employee-benefit-start-date-input"
              />
            </div>

            {/* Justification (Optional) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-justification-label')}
              </Label>
              <Textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder={t('modal-request-justification-placeholder')}
                rows={4}
                maxLength={BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH}
                data-testid="request-employee-benefit-justification-textarea"
              />
              <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
                {t('modal-character-count', {
                  current: justification.length,
                  max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
                })}
                {justification.trim().length > 0 && justification.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH && (
                  <span className="gba:text-destructive gba:ml-2">
                    {t('modal-character-minimum', { min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export const RequestEmployeeBenefit: React.FC<BusinessAppContextProps> = context => {
  const locale = getCurrentActiveUserLocale() as SupportedLocale
  return (
    <LocalizationProvider locale={locale}>
      <RequestEmployeeBenefitProvider {...context}>
        <RequestEmployeeBenefitContent {...context} />
      </RequestEmployeeBenefitProvider>
    </LocalizationProvider>
  )
}

export default RequestEmployeeBenefit
