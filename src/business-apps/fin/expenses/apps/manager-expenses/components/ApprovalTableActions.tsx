import React from 'react'
import { Button, Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { ApprovalRequest } from '../types'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)

  const approveButtonLabel = isApproving
    ? t('approvals-approving')
    : t('approvals-approve-selected-tasks', { count: selectedTasks.length })

  return (
    <>
      {validationError && (
        <Alert className="gba:mb-4" data-testid={`${dataTestIdPrefix}-validation-error-alert`}>
          <AlertDescription>
            <strong>{t('approvals-selection-error-title')}</strong> {validationError}
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
            {approveButtonLabel}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {approvalError && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>
            <strong>{t('approvals-error-title')}</strong> {approvalError}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

export default ApprovalTableActions
