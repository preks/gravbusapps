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

interface DeactivateBenefitModalProps {
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
   * Access token for API calls
   */
  accessToken: string
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
   * Calculate if HR approval is required based on benefit value or type
   */
  const requiresApproval = useMemo(() => {
    return (benefit.yearlyAmount && benefit.yearlyAmount > 5000) || benefit.code === 'CAR' || benefit.code === 'ESPP'
  }, [benefit])

  /**
   * Get default end date (last day of current month)
   */
  const getDefaultEndDate = (): string => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    date.setDate(0) // Last day of current month
    return date.toISOString().split('T')[0]
  }

  /**
   * Initialize end date on mount
   */
  React.useEffect(() => {
    if (isOpen && !endDate) {
      setEndDate(getDefaultEndDate())
    }
  }, [isOpen])

  /**
   * Format currency amount
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date string
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Check if form is valid
   */
  const isFormValid = useMemo(() => {
    const hasEndDate = endDate.length > 0
    const hasReason = reason.length > 0
    const hasDetailsIfOther =
      reason !== 'other' || (additionalDetails.trim().length >= 20 && additionalDetails.trim().length <= 500)

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
      if (reason === 'other' && additionalDetails.trim().length < 20) {
        throw new Error('Additional details must be at least 20 characters')
      }
      if (reason === 'other' && additionalDetails.trim().length > 500) {
        throw new Error('Additional details must not exceed 500 characters')
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

      // Start Kogito process
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
          requestDate: new Date().toISOString(),
          requiresApproval
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
   * Get label for reason option
   */
  const getReasonLabel = (reasonValue: string): string => {
    switch (reasonValue) {
      case 'no_longer_needed':
        return getTranslationFromI18nKeyAndLabel('lowcoder:compensation.reason_no_longer_needed', 'No longer needed')
      case 'found_alternative':
        return getTranslationFromI18nKeyAndLabel('lowcoder:compensation.reason_found_alternative', 'Found alternative')
      case 'cost_reduction':
        return getTranslationFromI18nKeyAndLabel('lowcoder:compensation.reason_cost_reduction', 'Cost reduction')
      case 'other':
        return getTranslationFromI18nKeyAndLabel('lowcoder:compensation.reason_other', 'Other')
      default:
        return reasonValue
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
          <div
            className="gba:p-4 gba:bg-muted gba:rounded-lg gba:space-y-2"
            data-testid="deactivate-benefit-summary-card"
          >
            <div className="gba:font-semibold gba:text-foreground">{benefit.benefitType}</div>
            {benefit.provider?.value && (
              <div className="gba:text-sm gba:text-muted-foreground">
                <span className="gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.provider', 'Provider')}:
                </span>{' '}
                {benefit.provider.value}
              </div>
            )}
            {benefit.yearlyAmount && (
              <div className="gba:text-sm gba:text-muted-foreground">
                <span className="gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.value', 'Value')}:
                </span>{' '}
                {formatCurrency(benefit.yearlyAmount)} / year
              </div>
            )}
            {benefit.startDate && (
              <div className="gba:text-sm gba:text-muted-foreground">
                <span className="gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.start_date', 'Start Date')}:
                </span>{' '}
                {formatDate(benefit.startDate)}
              </div>
            )}
          </div>

          {/* Warning Alert (if approval required) */}
          {requiresApproval && (
            <Alert variant="default" data-testid="deactivate-benefit-warning-alert">
              <AlertDescription>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:compensation.deactivation_approval_warning',
                  'This benefit requires HR approval for deactivation due to its value or type.'
                )}
              </AlertDescription>
            </Alert>
          )}

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
                <SelectItem value="no_longer_needed">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:compensation.reason_no_longer_needed',
                    'No longer needed'
                  )}
                </SelectItem>
                <SelectItem value="found_alternative">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:compensation.reason_found_alternative',
                    'Found alternative'
                  )}
                </SelectItem>
                <SelectItem value="cost_reduction">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.reason_cost_reduction', 'Cost reduction')}
                </SelectItem>
                <SelectItem value="other">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.reason_other', 'Other')}
                </SelectItem>
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
                maxLength={500}
                data-testid="deactivate-benefit-additional-details-textarea"
                disabled={isSubmitting}
              />
              <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
                {additionalDetails.length} / 500 characters
                {additionalDetails.length < 20 && additionalDetails.length > 0 && (
                  <span className="gba:text-destructive gba:ml-2">(minimum 20 characters)</span>
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
