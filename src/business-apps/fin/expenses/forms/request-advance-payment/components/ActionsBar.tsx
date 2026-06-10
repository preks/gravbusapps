import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)

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
        {t('action-cancel')}
      </Button>

      <Button
        variant="default"
        onClick={onSubmit}
        disabled={isSubmitting || isSubmitDisabled}
        className="gba:px-6 gba:py-2 gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 disabled:gba:opacity-50"
        data-testid="request-advance-payment-submit-button"
      >
        {t('action-submit')}
      </Button>
    </div>
  )
}

export default ActionsBar
