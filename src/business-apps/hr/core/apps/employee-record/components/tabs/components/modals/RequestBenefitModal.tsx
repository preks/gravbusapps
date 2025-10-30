'use client'

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Input,
  Textarea,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BenefitCatalogItem } from '../../../../types/benefitCatalogTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BENEFIT_FORM_VALIDATION } from '../../../../constants/benefitFormValidation'
import { getDefaultStartDate } from '../../../../utils/utils'
import BenefitProviderField from '../form-fields/BenefitProviderField'
import BenefitValueField from '../form-fields/BenefitValueField'

interface RequestBenefitModalProps extends BusinessAppContextProps {
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
 * Modal for requesting a new employee benefit.
 * Allows employee to select provider, specify value, start date, and provide justification.
 */
const RequestBenefitModal: React.FC<RequestBenefitModalProps> = ({
  isOpen,
  onClose,
  benefit,
  employeeId,
  onSuccess
}) => {
  // Form state
  const [provider, setProvider] = useState<string>('')
  const [yearlyValue, setYearlyValue] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [justification, setJustification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize start date on mount
   */
  React.useEffect(() => {
    if (isOpen && !startDate) {
      setStartDate(getDefaultStartDate())
    }
  }, [isOpen])

  /**
   * Check if form is valid
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
   * Handle form submission
   */
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validation
      if (!provider) throw new Error('Provider is required')
      if (!startDate) throw new Error('Start date is required')
      if (justification.trim().length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH) {
        throw new Error(`Justification must be at least ${BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH} characters`)
      }
      if (justification.trim().length > BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH) {
        throw new Error(`Justification must not exceed ${BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH} characters`)
      }

      // Validate start date is in the future
      const selectedDate = new Date(startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        throw new Error('Start date must be in the future')
      }

      // Parse yearly value
      const yearlyAmountValue = yearlyValue.trim() ? parseFloat(yearlyValue) : 0

      // Start Kogito process
      startProcess({
        domain: 'human-resources',
        processName: 'requestEmployeeBenefit',
        payload: {
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
        },
        skipScreen: true
      })

      // Success
      onSuccess?.()
      onClose()

      // Reset form
      setProvider('')
      setYearlyValue('')
      setStartDate(getDefaultStartDate())
      setJustification('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-md" data-testid="request-benefit-modal">
        <DialogHeader>
          <DialogTitle data-testid="request-benefit-modal-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.request_benefit', 'Request Benefit')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" data-testid="request-benefit-error-alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Benefit Type (Read-only) */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.benefit_type', 'Benefit Type')}
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
            value={provider}
            onChange={setProvider}
            providers={benefit.availableProviders || []}
            disabled={isSubmitting}
            required
          />

          {/* Expected Yearly Value (Optional) */}
          <BenefitValueField value={yearlyValue} onChange={setYearlyValue} disabled={isSubmitting} />

          {/* Preferred Start Date (Required) */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.start_date', 'Preferred Start Date')}{' '}
              <span className="gba:text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              data-testid="request-benefit-start-date-input"
              disabled={isSubmitting}
            />
          </div>

          {/* Justification (Required) */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.justification', 'Justification')}{' '}
              <span className="gba:text-destructive">*</span>
            </Label>
            <Textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:compensation.justification_placeholder',
                'Please explain why you need this benefit...'
              )}
              rows={4}
              maxLength={BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH}
              data-testid="request-benefit-justification-textarea"
              disabled={isSubmitting}
            />
            <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
              {justification.length} / {BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH} characters
              {justification.length > 0 && justification.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH && (
                <span className="gba:text-destructive gba:ml-2">
                  (minimum {BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH} characters)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer with action buttons */}
        <DialogFooter className="gba:flex gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid="request-benefit-cancel-button"
          >
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            data-testid="request-benefit-submit-button"
          >
            {isSubmitting
              ? getTranslationFromI18nKeyAndLabel('common.processing', 'Processing...')
              : getTranslationFromI18nKeyAndLabel('lowcoder:compensation.submit_request', 'Submit Request')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RequestBenefitModal
