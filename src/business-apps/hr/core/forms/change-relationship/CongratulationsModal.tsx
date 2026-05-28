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
import { SparkleIcon } from '@phosphor-icons/react'
import translations from '../../apps/employee-record/_i18n'

interface CongratulationsModalProps {
  open: boolean
  onConfirm: () => void
  dataTestId?: string
  confirmButtonTestId?: string
  generatedMessage?: string
}

export const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
  open,
  onConfirm,
  dataTestId = 'congratulations-modal',
  confirmButtonTestId = 'congratulations-modal-confirm',
  generatedMessage
}) => {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={open}>
      <DialogContent data-testid={dataTestId} showCloseButton={false}>
        <DialogHeader>
          {generatedMessage ? (
            <>
              <DialogTitle>{t('relationship-form-success-title')} 🎉</DialogTitle>
              <DialogDescription>{generatedMessage}</DialogDescription>
            </>
          ) : (
            <DialogDescription className="gba:flex gba:items-center gba:gap-2">
              <SparkleIcon size={16} className="gba:animate-pulse" />
              {t('relationship-form-success-loading-message')}
            </DialogDescription>
          )}
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
