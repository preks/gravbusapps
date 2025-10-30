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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Textarea,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BenefitCatalogItem } from '../../../../types/benefitCatalogTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DEACTIVATION_REASON_OPTIONS, getReasonLabel } from '../../../../constants/benefitDeactivationReasons'
import { BENEFIT_FORM_VALIDATION } from '../../../../constants/benefitFormValidation'
import { getDefaultEndDate } from '../../../../utils/utils'
import BenefitSummaryCard from './BenefitSummaryCard'

interface DeactivateBenefitModalProps extends BusinessAppContextProps {
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
 * Modal for deactivating an active employee benefit.
 * Shows benefit details, requires reason and end date, may need HR approval.
 */
const DeactivateBenefitModal: React.FC<DeactivateBenefitModalProps> = ({
  isOpen,
  onClose,
  benefit,
  employeeId,
  onSuccess
}) => {
  // Form state
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize end date on mount
   */
  React.useEffect(() => {
    if (isOpen && !endDate) {
      setEndDate(getDefaultEndDate())
    }
  }, [isOpen])

  /**
   * Check if form is valid
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
   * Handle form submission
   */
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validation
      if (!endDate) throw new Error('End date is required')
      if (!reason) throw new Error('Reason is required')
      if (reason === 'other' && additionalDetails.trim().length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH) {
        throw new Error(`Additional details must be at least ${BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH} characters`)
      }
      if (reason === 'other' && additionalDetails.trim().length > BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH) {
        throw new Error(`Additional details must not exceed ${BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH} characters`)
      }

      // Validate end date is today or later
      const selectedDate = new Date(endDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        throw new Error('End date must be today or later')
      }

      // Determine deactivation reason text
      const deactivationReasonText = reason === 'other' ? additionalDetails.trim() : getReasonLabel(reason)

      // Start Kogito process - backend will determine if approval is required
      startProcess({
        domain: 'human-resources',
        processName: 'deactivateEmployeeBenefit',
        payload: {
          employeeBenefitId: benefit.employeeBenefitId,
          employeeId,
          benefitType: benefit.benefitType,
          deactivationReason: deactivationReasonText,
          effectiveEndDate: new Date(endDate).toISOString(),
          requestedBy: employeeId,
          requestDate: new Date().toISOString()
        },
        skipScreen: true
      })

      // Success
      onSuccess?.()
      onClose()

      // Reset form
      setEndDate(getDefaultEndDate())
      setReason('')
      setAdditionalDetails('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deactivation')
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
      <DialogContent className="gba:max-w-md" data-testid="deactivate-benefit-modal">
        <DialogHeader>
          <DialogTitle data-testid="deactivate-benefit-modal-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.deactivate_benefit', 'Deactivate Benefit')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" data-testid="deactivate-benefit-error-alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Benefit Summary Card */}
          <BenefitSummaryCard benefit={benefit} />

          {/* Effective End Date (Required) */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.effective_end_date', 'Effective End Date')}{' '}
              <span className="gba:text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              data-testid="deactivate-benefit-end-date-input"
              disabled={isSubmitting}
            />
          </div>

          {/* Reason for Deactivation (Required) */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:compensation.deactivation_reason',
                'Reason for Deactivation'
              )}{' '}
              <span className="gba:text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason} disabled={isSubmitting}>
              <SelectTrigger data-testid="deactivate-benefit-reason-select">
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel('common.select_reason', 'Select reason...')}
                />
              </SelectTrigger>
              <SelectContent>
                {DEACTIVATION_REASON_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {getTranslationFromI18nKeyAndLabel(option.labelKey, option.defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details (Conditional - shown if "Other" selected) */}
          {reason === 'other' && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.additional_details', 'Additional Details')}{' '}
                <span className="gba:text-destructive">*</span>
              </Label>
              <Textarea
                value={additionalDetails}
                onChange={e => setAdditionalDetails(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:compensation.additional_details_placeholder',
                  'Please provide more details...'
                )}
                rows={3}
                maxLength={BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH}
                data-testid="deactivate-benefit-additional-details-textarea"
                disabled={isSubmitting}
              />
              <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
                {additionalDetails.length} / {BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH} characters
                {additionalDetails.length > 0 && additionalDetails.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH && (
                  <span className="gba:text-destructive gba:ml-2">
                    (minimum {BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH} characters)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <DialogFooter className="gba:flex gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid="deactivate-benefit-cancel-button"
          >
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            data-testid="deactivate-benefit-submit-button"
          >
            {isSubmitting
              ? getTranslationFromI18nKeyAndLabel('common.processing', 'Processing...')
              : getTranslationFromI18nKeyAndLabel('lowcoder:compensation.deactivate_benefit', 'Deactivate Benefit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeactivateBenefitModal
