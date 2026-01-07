import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface ActionButtonsProps {
  submitting: boolean
  onApprove: () => void
  onReturn: () => void
  prefixDataTestId?: string
  t: (key: string) => string
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  submitting,
  onApprove,
  onReturn,
  prefixDataTestId = 'approve-expense-request-v2',
  t
}) => {
  return (
    <div className="gba:flex gba:justify-end gba:gap-3 gba:mb-4" data-testid={`${prefixDataTestId}-actions`}>
      <Button
        variant="outline"
        onClick={onReturn}
        disabled={submitting}
        data-testid={`${prefixDataTestId}-return-button`}
      >
        {t('action-return')}
      </Button>
      <Button
        variant="default"
        onClick={onApprove}
        disabled={submitting}
        data-testid={`${prefixDataTestId}-approve-button`}
      >
        {t('action-approve')}
      </Button>
    </div>
  )
}

export default ActionButtons
