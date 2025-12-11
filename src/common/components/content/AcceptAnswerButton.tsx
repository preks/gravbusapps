import React, { useState, useCallback } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CheckCircle, XCircle } from 'lucide-react'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildAcceptAnswerPayload } from '@/common/data/content/payloads/acceptAnswerPayloads'

interface AcceptAnswerButtonProps {
  answerId: string
  questionId: string
  isAccepted: boolean
  accessToken: string
  employeeId: string
  onAcceptComplete?: () => void
  'data-testid'?: string
}

/**
 * AcceptAnswerButton Component
 * Allows question author to accept/unaccept an answer with optimistic updates
 */
export const AcceptAnswerButton: React.FC<AcceptAnswerButtonProps> = ({
  answerId,
  questionId,
  isAccepted,
  accessToken,
  employeeId,
  onAcceptComplete,
  'data-testid': dataTestId = 'accept-answer-button'
}) => {
  // Local state for optimistic update
  const [optimisticAccepted, setOptimisticAccepted] = useState(isAccepted)

  const handleSuccess = useCallback(() => {
    if (onAcceptComplete) {
      onAcceptComplete()
    }
  }, [onAcceptComplete])

  const handleError = useCallback((previousState: boolean) => {
    // Rollback on error
    setOptimisticAccepted(previousState)
    console.error('Error accepting/unaccepting answer')
  }, [])

  return (
    <AppActionProvider
      contextsArray={[FlowContextName.contentEntryAccept]}
      externalContextData={{
        contentEntryId: answerId
      }}
      accessToken={accessToken}
      onSuccess={handleSuccess}
      transformData={() =>
        buildAcceptAnswerPayload({
          answerId,
          questionId,
          accepted: !optimisticAccepted,
          employeeId
        })
      }
    >
      {({ executeAction, isLoading }) => (
        <Button
          variant={optimisticAccepted ? 'outline' : 'default'}
          size="sm"
          onClick={async () => {
            // Save previous state for rollback
            const previousState = optimisticAccepted

            // Optimistic update - change UI immediately
            setOptimisticAccepted(!previousState)

            try {
              // Call backend
              await executeAction({})
              // Success callback will be called automatically
            } catch {
              // Rollback on error
              handleError(previousState)
            }
          }}
          disabled={isLoading}
          className={optimisticAccepted ? 'gba:text-success gba:border-success' : ''}
          data-testid={`${dataTestId}-action`}
        >
          {optimisticAccepted ? (
            <>
              <XCircle className="gba:w-4 gba:h-4 gba:mr-2" />
              Unaccept
            </>
          ) : (
            <>
              <CheckCircle className="gba:w-4 gba:h-4 gba:mr-2" />
              Accept Answer
            </>
          )}
        </Button>
      )}
    </AppActionProvider>
  )
}
