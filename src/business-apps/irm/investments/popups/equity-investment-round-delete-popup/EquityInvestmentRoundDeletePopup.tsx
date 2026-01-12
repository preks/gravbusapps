import React, { useState, useEffect } from 'react'
import { Button, Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const prefixDataTestId = 'EquityInvestmentRoundDeletePopup'

export interface EquityInvestmentRoundDeletePopupProps extends BusinessAppContextProps {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

const EquityInvestmentRoundDeletePopup: React.FC<EquityInvestmentRoundDeletePopupProps> = ({
  additionalData,
  onSuccess,
  onError
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract round data safely
  const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters || additionalData || {}
  const equityInvestmentRoundId =
    taskPayload?.equityInvestmentRoundId ||
    taskPayload?.entityId ||
    taskPayload?.targetEntityId ||
    additionalData?.equityInvestmentRoundId ||
    additionalData?.entityId ||
    additionalData?.targetEntityId

  const roundData = taskPayload?.roundData || additionalData?.roundData || {}
  const roundName = roundData?.name || taskPayload?.roundName || additionalData?.roundName || 'this round'

  // Listen for process completion events
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        const response = event.detail?.response
        if (response) {
          setIsDeleting(false)
          if (onSuccess) {
            onSuccess({ deletedRoundId: equityInvestmentRoundId })
          }
        }
      } catch (err: any) {
        console.error('Error in process completion:', err)
        setError(
          err?.message ||
            getTranslationFromI18nKeyAndLabel(
              'investment.rounds.delete.error.failed',
              'Failed to delete investment round. Please try again.'
            )
        )
        setIsDeleting(false)
        if (onError) {
          onError(err)
        }
      }
    }

    window.addEventListener('pse_complete', handleProcessCompletion)

    return () => {
      window.removeEventListener('pse_complete', handleProcessCompletion)
    }
  }, [equityInvestmentRoundId, onSuccess, onError])

  const handleDelete = async () => {
    if (!equityInvestmentRoundId) {
      setError(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.delete.error.noId',
          'Investment round ID is required for deletion'
        )
      )
      return
    }

    try {
      setIsDeleting(true)
      setError(null)

      // Prepare the deletion payload
      const payload = {
        equityInvestmentRound: {
          id: equityInvestmentRoundId,
          version: roundData?.version || 0
        }
      }

      // Dispatch the process continue event
      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (err: any) {
      console.error('Error deleting investment round:', err)
      setError(
        err?.message ||
          getTranslationFromI18nKeyAndLabel(
            'investment.rounds.delete.error.failed',
            'Failed to delete investment round. Please try again.'
          )
      )
      setIsDeleting(false)
      if (onError) {
        onError(err)
      }
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  return (
    <div className="gba:max-w-md gba:mx-auto gba:p-6" data-testid={`${prefixDataTestId}-container`}>
      {/* Header with warning icon */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-red-100">
          <WarningIcon className="gba:w-5 gba:h-5 gba:text-red-600" data-testid={`${prefixDataTestId}-warning-icon`} />
        </div>
        <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900" data-testid={`${prefixDataTestId}-title`}>
          {getTranslationFromI18nKeyAndLabel('investment.rounds.delete.title', 'Delete Investment Round')}
        </h2>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription data-testid={`${prefixDataTestId}-error-message`}>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isDeleting && (
        <div className="gba:text-center gba:mb-6">
          <Spinner size="lg" className="gba:mb-4" />
          <p className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('investment.rounds.delete.deleting', 'Deleting investment round...')}
          </p>
        </div>
      )}

      {/* Confirmation message */}
      {!isDeleting && (
        <div className="gba:text-center gba:mb-6">
          <p
            className="gba:text-lg gba:text-gray-800 gba:leading-relaxed gba:mb-3"
            data-testid={`${prefixDataTestId}-confirmation-text`}
          >
            {getTranslationFromI18nKeyAndLabel(
              'investment.rounds.delete.confirmation.question',
              'Are you sure you want to delete the investment round'
            )}{' '}
            <Badge variant="outline" className="gba:inline gba:mx-1">
              {roundName}
            </Badge>
            ?
          </p>
          <p className="gba:text-sm gba:text-red-600 gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('investment.rounds.delete.warning', 'This action cannot be undone.')}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isDeleting && (
        <div className="gba:flex gba:gap-3">
          <Button
            variant="secondary"
            className="gba:flex-1"
            size="lg"
            onClick={handleCancel}
            data-testid={`${prefixDataTestId}-cancel-button`}
          >
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            className="gba:flex-1"
            size="lg"
            onClick={handleDelete}
            disabled={!equityInvestmentRoundId}
            data-testid={`${prefixDataTestId}-confirm-button`}
          >
            {getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default EquityInvestmentRoundDeletePopup
export { EquityInvestmentRoundDeletePopup }
