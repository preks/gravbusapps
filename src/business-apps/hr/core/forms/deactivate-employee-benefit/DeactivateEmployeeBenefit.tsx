'use client'

import React, { useMemo } from 'react'
import {
  Label,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation,
  LocalizationProvider,
  type SupportedLocale
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import BenefitSummaryCard from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/components/modals/BenefitSummaryCard'
import { DEACTIVATION_REASON_OPTIONS } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitDeactivationReasons'
import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import translations from '@/business-apps/hr/core/apps/employee-record/_i18n'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { DeactivateEmployeeBenefitProvider, useDeactivateEmployeeBenefit } from './DeactivateEmployeeBenefitContext'
import { useTaskCancellation } from '../../hooks/useTaskCancellation'
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
const DeactivateEmployeeBenefitContent: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo }) => {
  const { data } = useDeactivateEmployeeBenefit()
  const { t } = useTranslation(translations)

  const {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    endDate,
    setEndDate,
    reason,
    setReason,
    additionalDetails,
    setAdditionalDetails,
    isFormValid,
    validateForm,
    buildSubmitPayload
  } = useDeactivateEmployeeBenefitForm({ data, additionalData, userInfo, t })

  // Handle task cancellation when form closes without submission
  const { markAsSubmitted, markAsCancelled } = useTaskCancellation('pse_abort')

  const title = useMemo(() => t('modal-deactivate-title'), [t])

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
          onSubmit={() => buildSubmitPayload({ markAsSubmitted })}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          cancelButtonText={t('modal-deactivate-cancel-button')}
          submitButtonText={t('modal-deactivate-submit-button')}
          submitButtonVariant="destructive"
          isSubmitDisabled={!isFormValid}
          submitButtonTestId="deactivate-employee-benefit-submit-button"
          cancelButtonTestId="deactivate-employee-benefit-cancel-button"
          onCancel={() => {
            markAsCancelled()
          }}
          data-testid="deactivate-employee-benefit"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="deactivate-employee-benefit-fields">
            {/* Benefit Summary Card */}
            {selectedBenefit && <BenefitSummaryCard t={t} benefit={selectedBenefit} />}

            {/* Effective End Date (Required) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-deactivate-end-date-label')} <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="deactivate-employee-benefit-end-date-input"
              />
            </div>

            {/* Reason for Deactivation (Required) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-deactivate-reason-label')} <span className="gba:text-destructive">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="deactivate-employee-benefit-reason-select">
                  <SelectValue placeholder={t('modal-deactivate-reason-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {DEACTIVATION_REASON_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`modal-deactivate-reason-${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Details (Conditional - shown if "Other" selected) */}
            {reason === 'other' && (
              <div className="gba:space-y-2">
                <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                  {t('modal-deactivate-additional-info-label')}
                </Label>
                <Textarea
                  value={additionalDetails}
                  onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder={t('modal-deactivate-additional-info-placeholder')}
                  rows={3}
                  maxLength={BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH}
                  data-testid="deactivate-employee-benefit-additional-details-textarea"
                />
                <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
                  {t('modal-character-count', {
                    current: additionalDetails.length,
                    max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
                  })}
                  {additionalDetails.length > 0 &&
                    additionalDetails.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH && (
                      <span className="gba:text-destructive gba:ml-2">
                        {t('modal-character-minimum', { min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH })}
                      </span>
                    )}
                </div>
              </div>
            )}
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
