import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DeleteRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  blocked: boolean
  onConfirm: () => void
}

const DeleteRuleDialog: React.FC<DeleteRuleDialogProps> = ({ open, onOpenChange, blocked, onConfirm }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`expense-calculation-rules-delete-modal`} className="gba:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.delete_title',
              'Delete Calculation Rule'
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="gba:py-2 gba:text-[14px]">
          {blocked
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.delete_blocked_message',
                "This rule is already used in an expense. It cannot be deleted. Please update the 'Valid To' field."
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.delete_message',
                'Are you sure you want to delete the rule?'
              )}
        </div>
        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-4">
          {blocked ? (
            <Button
              variant="default"
              onClick={() => onOpenChange(false)}
              data-testid={`expense-calculation-rules-delete-confirm`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_config_calculation_rule_list:ok', 'OK')}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid={`expense-calculation-rules-delete-no`}
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.no_button',
                  'No'
                )}
              </Button>
              <Button variant="destructive" data-testid={`expense-calculation-rules-delete-yes`} onClick={onConfirm}>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.yes_button',
                  'Yes'
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteRuleDialog
