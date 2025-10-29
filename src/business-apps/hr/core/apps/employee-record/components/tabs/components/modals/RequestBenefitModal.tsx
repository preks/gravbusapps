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
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BenefitCatalogItem } from '../../../../types/benefitCatalogTypes'

interface RequestBenefitModalProps {
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
   * Access token for API calls
   */
  accessToken: string
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
   * Get default start date (first day of next month)
   */
  const getDefaultStartDate = (): string => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    date.setDate(1)
    return date.toISOString().split('T')[0]
  }

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
    return (
      hasProviders &&
      provider.length > 0 &&
      startDate.length > 0 &&
      justification.trim().length >= 20 &&
      justification.trim().length <= 500
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
      if (justification.trim().length < 20) {
        throw new Error('Justification must be at least 20 characters')
      }
      if (justification.trim().length > 500) {
        throw new Error('Justification must not exceed 500 characters')
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
          currencyRef: 'Currency:v1:EUR',
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
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.provider', 'Provider')}{' '}
              <span className="gba:text-destructive">*</span>
            </Label>
            {benefit.availableProviders && benefit.availableProviders.length > 0 ? (
              <Select value={provider} onValueChange={setProvider} disabled={isSubmitting}>
                <SelectTrigger data-testid="request-benefit-provider-select">
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel('common.select_provider', 'Select provider')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {benefit.availableProviders.map(providerOption => (
                    <SelectItem key={providerOption.id} value={providerOption.id}>
                      {providerOption.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="gba:text-sm gba:text-muted-foreground gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:compensation.no_providers_available',
                  'No providers configured for this benefit type'
                )}
              </div>
            )}
          </div>

          {/* Expected Yearly Value (Optional) */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.expected_value', 'Expected Yearly Value')} (
              {getTranslationFromI18nKeyAndLabel('common.optional', 'Optional')})
            </Label>
            <div className="gba:relative">
              <span className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-sm gba:text-muted-foreground">
                €
              </span>
              <Input
                type="number"
                value={yearlyValue}
                onChange={e => setYearlyValue(e.target.value)}
                placeholder="15000"
                className="gba:pl-8"
                min="0"
                step="100"
                data-testid="request-benefit-value-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

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
              maxLength={500}
              data-testid="request-benefit-justification-textarea"
              disabled={isSubmitting}
            />
            <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
              {justification.length} / 500 characters
              {justification.length < 20 && justification.length > 0 && (
                <span className="gba:text-destructive gba:ml-2">(minimum 20 characters)</span>
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
