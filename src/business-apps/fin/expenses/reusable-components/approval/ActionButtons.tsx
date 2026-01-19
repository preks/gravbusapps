import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ActionButtonsProps {
  submitting: boolean
  onApprove: () => void
  onReturn: () => void
  prefixDataTestId?: string
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  submitting,
  onApprove,
  onReturn,
  prefixDataTestId = 'approve-expense'
}) => {
  return (
    <div className="gba:flex gba:justify-end gba:gap-3 gba:mb-4" data-testid={`${prefixDataTestId}-actions`}>
      <Button
        variant="outline"
        onClick={onReturn}
        disabled={submitting}
        data-testid={`${prefixDataTestId}-return-button`}
      >
        {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reject_button', 'Return')}
      </Button>
      <Button
        variant="default"
        onClick={onApprove}
        disabled={submitting}
        data-testid={`${prefixDataTestId}-approve-button`}
      >
        {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.approve_button', 'Approve')}
      </Button>
    </div>
  )
}

export default ActionButtons
