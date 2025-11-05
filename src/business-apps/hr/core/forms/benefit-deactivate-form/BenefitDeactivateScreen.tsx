'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Textarea
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'
import {
  DEACTIVATION_REASON_OPTIONS,
  getReasonLabel
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitDeactivationReasons'
import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import { getDefaultEndDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import BenefitSummaryCard from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/components/modals/BenefitSummaryCard'

export interface BenefitDeactivateScreenProps extends BusinessAppContextProps {
  /**
   * Translation function
   */
  t: (key: string, params?: any) => string
  /**
   * Controls modal visibility
   */
  isOpen: boolean
  /**
   * Callback when modal should close
   */
  onClose: () => void
  /**
   * The active benefit to deactivate
   */
  benefit: BenefitCatalogItem
  /**
   * Employee ID for the request
   */
  employeeId: string
  /**
   * Callback after successful submission
   */
  onSuccess?: () => void
}

/**
 * Form for deactivating an active employee benefit.
 * Shows benefit details, requires reason and end date, may need HR approval.
 *
 * **Kogito Integration:**
 * - Flow: DEACTIVATE_BENEFIT_FLOW (🚧 placeholder)
 * - Domain: COMPENSATION_FLOW_DOMAIN
 * - Approval: Conditional (based on benefit type/value)
 *
 * **Future Enhancement:**
 * When Kogito flows are registered, this will trigger via AppAction instead of manual button.
 */
const BenefitDeactivateScreen: React.FC<BenefitDeactivateScreenProps> = ({
  t,
  isOpen,
  onClose,
  benefit,
  employeeId,
  accessToken,
  userInfo,
  additionalData,
  onSuccess
}) => {
  // Form state
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [additionalDetails, setAdditionalDetails] = useState('')

  /**
   * Initialize end date on mount
   */
  React.useEffect(() => {
    if (isOpen && !endDate) {
      setEndDate(getDefaultEndDate())
    }
  }, [isOpen])

  /**
   * Validation function for AppActionForm
   * Returns array of error messages or null if valid
   */
  const validateForm = useCallback(() => {
    const errors: string[] = []

    // Check end date
    if (!endDate || endDate.length === 0) {
      errors.push(t('error-end-date-required'))
    } else {
      const selectedDate = new Date(endDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        errors.push(t('error-end-date-today-or-later'))
      }
    }

    // Check reason
    if (!reason || reason.length === 0) {
      errors.push(t('error-reason-required'))
    }

    // Check additional details if "other" is selected
    if (reason === 'other') {
      const trimmedDetails = additionalDetails.trim()
      if (trimmedDetails.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH) {
        errors.push(
          t('error-additional-details-min-length', {
            min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH
          })
        )
      }
      if (trimmedDetails.length > BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH) {
        errors.push(
          t('error-additional-details-max-length', {
            max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
          })
        )
      }
    }

    return errors.length > 0 ? errors : null
  }, [endDate, reason, additionalDetails, t])

  /**
   * Check if form is valid for disabling submit button
   */
  const isFormValid = useMemo(() => {
    const hasEndDate = endDate.length > 0
    const hasReason = reason.length > 0
    const trimmedDetails = additionalDetails.trim()
    const hasDetailsIfOther =
      reason !== 'other' ||
      (trimmedDetails.length >= BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH &&
        trimmedDetails.length <= BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH)

    return hasEndDate && hasReason && hasDetailsIfOther
  }, [endDate, reason, additionalDetails])

  /**
   * Form submission handler
   * Builds the payload for the benefit deactivation process
   */
  const handleSubmit = useCallback(async () => {
    // Determine deactivation reason text
    const deactivationReasonText = reason === 'other' ? additionalDetails.trim() : getReasonLabel(reason)

    // Build and return payload for Kogito process
    // Backend will determine if approval is required based on benefit type/value
    return {
      employeeBenefitId: benefit.employeeBenefitId,
      employeeId,
      benefitType: benefit.benefitType,
      deactivationReason: deactivationReasonText,
      effectiveEndDate: new Date(endDate).toISOString(),
      requestedBy: employeeId,
      requestDate: new Date().toISOString()
    }
  }, [employeeId, benefit.employeeBenefitId, benefit.benefitType, reason, additionalDetails, endDate])

  /**
   * Success handler - called after process starts
   */
  const handleSuccess = useCallback(() => {
    onSuccess?.()
    onClose()

    // Reset form state
    setEndDate(getDefaultEndDate())
    setReason('')
    setAdditionalDetails('')
  }, [onSuccess, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-md gba:p-0" data-testid="deactivate-benefit-modal">
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-0">
          <DialogTitle data-testid="deactivate-benefit-modal-title">{t('modal-deactivate-title')}</DialogTitle>
        </DialogHeader>

        <AppActionForm
          processType="update"
          formData={{}}
          validateForm={validateForm}
          onSubmit={handleSubmit}
          onSuccess={handleSuccess}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          onCancel={onClose}
          customFormLayout={true}
          submitButtonText={t('modal-deactivate-submit-button')}
          cancelButtonText={t('modal-deactivate-cancel-button')}
          submitButtonVariant="destructive"
          isSubmitDisabled={!isFormValid}
          submitButtonTestId="deactivate-benefit-submit-button"
          cancelButtonTestId="deactivate-benefit-cancel-button"
          businessAppContext={{ accessToken, userInfo, additionalData }}
          data-testid="deactivate-benefit-form"
        >
          <div className="gba:space-y-4">
            {/* Benefit Summary Card */}
            <BenefitSummaryCard t={t} benefit={benefit} />

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
                data-testid="deactivate-benefit-end-date-input"
              />
            </div>

            {/* Reason for Deactivation (Required) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-deactivate-reason-label')} <span className="gba:text-destructive">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="deactivate-benefit-reason-select">
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
                  data-testid="deactivate-benefit-additional-details-textarea"
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
      </DialogContent>
    </Dialog>
  )
}

export default BenefitDeactivateScreen
