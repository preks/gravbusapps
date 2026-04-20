import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ActionsBarProps {
  onCancel: () => void
  onSubmit: () => void
  isSubmitting: boolean
  isSubmitDisabled: boolean
  'data-testid'?: string
}

const ActionsBar: React.FC<ActionsBarProps> = ({
  onCancel,
  onSubmit,
  isSubmitting,
  isSubmitDisabled,
  'data-testid': dataTestId = 'request-advance-payment-actions'
}) => {
  return (
    <div
      className="gba:flex gba:justify-between gba:gap-3 gba:pt-6 gba:border-t gba:border-border"
      data-testid={dataTestId}
    >
      <Button
        variant="outline"
        onClick={onCancel}
        className="gba:px-6 gba:py-2"
        data-testid="request-advance-payment-cancel-button"
      >
        {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.cancel_button', 'Cancel')}
      </Button>

      <Button
        variant="default"
        onClick={onSubmit}
        disabled={isSubmitting || isSubmitDisabled}
        className="gba:px-6 gba:py-2 gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 disabled:gba:opacity-50"
        data-testid="request-advance-payment-submit-button"
      >
        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
      </Button>
    </div>
  )
}

export default ActionsBar
