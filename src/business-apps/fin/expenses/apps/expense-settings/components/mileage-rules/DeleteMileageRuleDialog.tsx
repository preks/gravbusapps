import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DeleteMileageRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  blocked: boolean
  onConfirm: () => void
}

const DeleteMileageRuleDialog: React.FC<DeleteMileageRuleDialogProps> = ({
  open,
  onOpenChange,
  blocked,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mileage-rules-delete-modal" className="gba:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.deleteModal.title', 'Delete Mileage Rule')}
          </DialogTitle>
        </DialogHeader>
        <div className="gba:py-2 gba:text-[14px]">
          {blocked
            ? getTranslationFromI18nKeyAndLabel(
                'expenseSettings.mileageRules.deleteModal.blockedMessage',
                "This rule is already used in calculations. It cannot be deleted. Please update the 'Valid To' field."
              )
            : getTranslationFromI18nKeyAndLabel(
                'expenseSettings.mileageRules.deleteModal.confirmMessage',
                'Are you sure you want to delete this mileage rule?'
              )}
        </div>
        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-4">
          {blocked ? (
            <Button variant="default" onClick={() => onOpenChange(false)} data-testid="mileage-rules-delete-ok">
              {getTranslationFromI18nKeyAndLabel('common.ok', 'OK')}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="mileage-rules-delete-no">
                {getTranslationFromI18nKeyAndLabel('common.no', 'No')}
              </Button>
              <Button variant="destructive" data-testid="mileage-rules-delete-yes" onClick={onConfirm}>
                {getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteMileageRuleDialog
