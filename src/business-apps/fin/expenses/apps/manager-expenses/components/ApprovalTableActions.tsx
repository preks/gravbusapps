import React from 'react'
import { Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { ApprovalRequest } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ApprovalTableActionsProps {
  selectedTasks: ApprovalRequest[]
  validationError: string | null
  approvalError: string | null
  isApproving: boolean
  onClearSelection: () => void
  onApproveClick: () => void
  dataTestIdPrefix: string
}

const ApprovalTableActions: React.FC<ApprovalTableActionsProps> = ({
  selectedTasks,
  validationError,
  approvalError,
  isApproving,
  onApproveClick,
  dataTestIdPrefix
}) => {
  return (
    <>
      {validationError && (
        <Alert className="gba:mb-4" data-testid={`${dataTestIdPrefix}-validation-error-alert`}>
          <AlertDescription>
            <strong>Selection Error:</strong> {validationError}
          </AlertDescription>
        </Alert>
      )}

      {selectedTasks.length > 0 && (
        <div className="gba:mb-4 gba:flex gba:justify-between gba:items-center">
          <Button
            variant="default"
            size="sm"
            onClick={onApproveClick}
            disabled={isApproving}
            data-testid={`${dataTestIdPrefix}-approve-button`}
          >
            {isApproving
              ? 'Approving...'
              : `${getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_request.approve_button',
                  'Approve'
                )} ${selectedTasks.length} Task${selectedTasks.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {approvalError && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>
            <strong>Error:</strong> {approvalError}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

export default ApprovalTableActions
