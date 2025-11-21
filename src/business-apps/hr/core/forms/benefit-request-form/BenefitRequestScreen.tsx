'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Label, Input, Textarea } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'
import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import { getDefaultStartDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import BenefitProviderField from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/components/form-fields/BenefitProviderField'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface BenefitRequestScreenProps extends BusinessAppContextProps {
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
   * The benefit to request
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
 * Form for requesting a new employee benefit.
 * Allows employee to select provider, specify value, start date, and provide justification.
 *
 * **Kogito Integration:**
 * - Flow: REQUEST_BENEFIT_FLOW (🚧 placeholder)
 * - Domain: COMPENSATION_FLOW_DOMAIN
 * - Approval: Required (manager approval)
 *
 * **Future Enhancement:**
 * When Kogito flows are registered, this will trigger via AppAction instead of manual button.
 */
const BenefitRequestScreen: React.FC<BenefitRequestScreenProps> = ({
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
  const [provider, setProvider] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [justification, setJustification] = useState('')

  /**
   * Initialize start date on mount
   */
  React.useEffect(() => {
    if (isOpen && !startDate) {
      setStartDate(getDefaultStartDate())
    }
  }, [isOpen])

  const currentLocale = getCurrentActiveUserLocale()

  /**
   * Resolve localized additional values from catalog entry
   * - additionalValue1: numeric value
   * - additionalValue2: unit label
   */
  const { additionalValue1Display, additionalValue2Display, additionalValue1Number } = useMemo(() => {
    const tr = benefit?.catalogEntry?.translations?.find(t => t.localeCode === currentLocale)

    const av1 = (tr?.additionalValue1 ?? benefit?.catalogEntry?.additionalValue1 ?? '').toString()
    const av2 = (tr?.additionalValue2 ?? benefit?.catalogEntry?.additionalValue2 ?? '').toString()

    // Normalize decimal separators (e.g., "100,50" -> "100.50")
    const normalized = av1.replace(',', '.')
    const parsed = Number.parseFloat(normalized)

    return {
      additionalValue1Display: av1,
      additionalValue2Display: av2,
      additionalValue1Number: Number.isFinite(parsed) ? parsed : 0
    }
  }, [benefit, currentLocale])

  /**
   * Validation function for AppActionForm
   * Returns array of error messages or null if valid
   */
  const validateForm = useCallback(() => {
    const errors: string[] = []

    // Check providers availability
    if (!benefit.availableProviders || benefit.availableProviders.length === 0) {
      errors.push(t('error-no-providers'))
    }

    // Check provider selection
    if (!provider || provider.length === 0) {
      errors.push(t('error-provider-required'))
    }

    // Check start date
    if (!startDate || startDate.length === 0) {
      errors.push(t('error-start-date-required'))
    } else {
      const selectedDate = new Date(startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        errors.push(t('error-start-date-future'))
      }
    }

    // Check justification
    const trimmedJustification = justification.trim()
    if (trimmedJustification.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH) {
      errors.push(
        t('error-justification-min-length', {
          min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH
        })
      )
    }
    if (trimmedJustification.length > BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH) {
      errors.push(
        t('error-justification-max-length', {
          max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
        })
      )
    }

    return errors.length > 0 ? errors : null
  }, [benefit, provider, startDate, justification, t])

  /**
   * Check if form is valid for disabling submit button
   */
  const isFormValid = useMemo(() => {
    const hasProviders = benefit.availableProviders && benefit.availableProviders.length > 0
    const trimmedJustification = justification.trim()
    return (
      hasProviders &&
      provider.length > 0 &&
      startDate.length > 0 &&
      trimmedJustification.length >= BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH &&
      trimmedJustification.length <= BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
    )
  }, [benefit.availableProviders, provider, startDate, justification])

  /**
   * Form submission handler
   * Builds the payload for the benefit request process
   */
  const handleSubmit = useCallback(async () => {
    // Derive yearly amount from catalog Additional Value 1 (if numeric)
    const yearlyAmountValue = additionalValue1Number || 0

    // Build and return payload for Kogito process
    return {
      employeeId,
      benefitTypeRef: benefit.catalogId,
      benefitProviderRef: provider,
      yearlyAmount: yearlyAmountValue,
      currencyRef: BENEFIT_FORM_VALIDATION.DEFAULT_CURRENCY_REF,
      startDate: new Date(startDate).toISOString(),
      justification: justification.trim(),
      requestedBy: employeeId,
      requestDate: new Date().toISOString(),
      status: 'PENDING'
    }
  }, [employeeId, benefit.catalogId, provider, additionalValue1Number, startDate, justification])

  /**
   * Success handler - called after process starts
   */
  const handleSuccess = useCallback(() => {
    onSuccess?.()
    onClose()

    // Reset form state
    setProvider('')
    setStartDate(getDefaultStartDate())
    setJustification('')
  }, [onSuccess, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-md gba:p-0" data-testid="request-benefit-modal">
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-0">
          <DialogTitle data-testid="request-benefit-modal-title">{t('modal-request-title')}</DialogTitle>
        </DialogHeader>

        <AppActionForm
          processType="create"
          formData={{}}
          validateForm={validateForm}
          onSubmit={handleSubmit}
          onSuccess={handleSuccess}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          onCancel={onClose}
          customFormLayout={true}
          submitButtonText={t('modal-request-submit-button')}
          cancelButtonText={t('modal-request-cancel-button')}
          isSubmitDisabled={!isFormValid}
          submitButtonTestId="request-benefit-submit-button"
          cancelButtonTestId="request-benefit-cancel-button"
          businessAppContext={{ accessToken, userInfo, additionalData }}
          data-testid="request-benefit-form"
        >
          <div className="gba:space-y-4">
            {/* Benefit Type (Read-only) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-benefit-type-label')}
              </Label>
              <div
                className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-3 gba:py-2 gba:text-sm"
                data-testid="request-benefit-benefit-type-display"
              >
                {benefit.benefitType}
              </div>
            </div>

            {/* Benefit Provider (Required) */}
            <BenefitProviderField
              t={t}
              value={provider}
              onChange={setProvider}
              providers={benefit.availableProviders || []}
              required
            />

            {/* Catalog Value (from Additional Value 1 + Additional Value 2) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-value-label')}
              </Label>
              <div
                className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-3 gba:py-2 gba:text-sm"
                data-testid="request-benefit-included-value-display"
              >
                {additionalValue1Display || additionalValue2Display
                  ? `${additionalValue1Display}${additionalValue2Display ? ` ${additionalValue2Display}` : ''}`
                  : '-'}
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
                data-testid="request-benefit-start-date-input"
              />
            </div>

            {/* Justification (Required) */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('modal-request-justification-label')} <span className="gba:text-destructive">*</span>
              </Label>
              <Textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder={t('modal-request-justification-placeholder')}
                rows={4}
                maxLength={BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH}
                data-testid="request-benefit-justification-textarea"
              />
              <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
                {t('modal-character-count', {
                  current: justification.length,
                  max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
                })}
                {justification.length > 0 && justification.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH && (
                  <span className="gba:text-destructive gba:ml-2">
                    {t('modal-character-minimum', { min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </AppActionForm>
      </DialogContent>
    </Dialog>
  )
}

export default BenefitRequestScreen
