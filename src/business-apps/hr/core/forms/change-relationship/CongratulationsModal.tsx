import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../apps/employee-record/_i18n'

export type CongratulationsModalVariant = 'child' | 'marriage'

interface CongratulationsModalProps {
  open: boolean
  onConfirm: () => void
  dataTestId?: string
  confirmButtonTestId?: string
  variant?: CongratulationsModalVariant
}

const MESSAGE_BY_VARIANT: Record<CongratulationsModalVariant, { line1Key: string; line2Key?: string }> = {
  child: {
    line1Key: 'relationship-form-success-child-message-line1',
    line2Key: 'relationship-form-success-child-message-line2'
  },
  marriage: {
    line1Key: 'relationship-form-success-marriage-message'
  }
}

export const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
  open,
  onConfirm,
  dataTestId = 'congratulations-modal',
  confirmButtonTestId = 'congratulations-modal-confirm',
  variant = 'child'
}) => {
  const { t } = useTranslation(translations)
  const message = MESSAGE_BY_VARIANT[variant]

  return (
    <Dialog open={open}>
      <DialogContent data-testid={dataTestId} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('relationship-form-success-title')} 🎉</DialogTitle>
          <DialogDescription>
            {message.line2Key ? (
              <>
                {t(message.line1Key)}
                <br />
                {t(message.line2Key)}
              </>
            ) : (
              t(message.line1Key)
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="gba:flex gba:justify-end">
          <Button type="button" onClick={onConfirm} data-testid={confirmButtonTestId}>
            {t('relationship-form-success-ok')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
