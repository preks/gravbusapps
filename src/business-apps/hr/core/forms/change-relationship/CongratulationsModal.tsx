import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CongratulationsModalProps {
  open: boolean
  onConfirm: () => void
  dataTestId?: string
  confirmButtonTestId?: string
}

export const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
  open,
  onConfirm,
  dataTestId = 'congratulations-modal',
  confirmButtonTestId = 'congratulations-modal-confirm'
}) => {
  return (
    <Dialog open={open}>
      <DialogContent data-testid={dataTestId} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:relationship_form.success_title', 'Congratulations! ')}🎉
          </DialogTitle>
          <DialogDescription>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:relationship_form.success_message_line1',
              'Thank you for sharing your wonderful life update with us.'
            )}
            <br />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:relationship_form.success_message_line2',
              'We are happy to celebrate this special moment with you and appreciate you keeping your information up to date.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="gba:flex gba:justify-end">
          <Button type="button" onClick={onConfirm} data-testid={confirmButtonTestId}>
            {getTranslationFromI18nKeyAndLabel('common.ok', 'OK')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
