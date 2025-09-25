import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface AffectedExpensesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
}

const AffectedExpensesModal: React.FC<AffectedExpensesModalProps> = ({ open, onOpenChange, total }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="ccr-affected-expenses-modal" onOpenAutoFocus={(e) => { e.preventDefault(); }} className="gba:gap-1 gba:max-w-[30vw] gba:w-[30vw]">
        <DialogHeader>
          <DialogTitle data-testid="ccr-affected-expenses-title" className='gba:leading-[1.2]'>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.affected_expenses_text',
              `${total} number of expense requests/plans/items are affected by this rule, it cannot be deleted.`,
              {
                expensesNumber: total,
                interpolation: { escapeValue: false }
              }
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="gba:flex gba:justify-center gba:mt-4">
          <Button
            variant="default"
            className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
            style={{ borderRadius: '22px', height: '40px' }}
            data-testid="ccr-affected-expenses-back-button"
            onClick={() => onOpenChange(false)}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.back_btn', 'Back')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AffectedExpensesModal;


