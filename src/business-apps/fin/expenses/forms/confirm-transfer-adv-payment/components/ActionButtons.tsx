import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ActionButtonsProps {
  onConfirm: () => void
  isLoading: boolean
  confirmationChecked: boolean
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onConfirm, isLoading, confirmationChecked }) => {
  return (
    <div className="gba:flex gba:justify-end gba:mt-8 gba:pt-4 gba:border-t gba:border-border">
      <Button
        onClick={onConfirm}
        disabled={isLoading || !confirmationChecked}
        data-testid="confirm-transfer-adv-payment-confirm-button"
      >
        {isLoading ? <Spinner size="sm" className="gba:mr-2" /> : null}
        {getTranslationFromI18nKeyAndLabel('lowcoder:common.confirm', 'Confirm')}
      </Button>
    </div>
  )
}

export default ActionButtons
