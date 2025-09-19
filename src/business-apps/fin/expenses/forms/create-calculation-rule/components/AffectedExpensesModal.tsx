import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import AffectedExpensesTable from '../components/AffectedExpensesTable';

interface AffectedExpensesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: any[];
  page: number;
  total: number;
  sort: { field: 'createdAt' | 'title' | 'requestType' | 'type'; order: 'asc' | 'desc' } | null;
  onPageChange: (page: number) => void;
  onSortChange: (next: { field: 'createdAt' | 'title' | 'requestType' | 'type'; order: 'asc' | 'desc' } | null) => void;
}

const AffectedExpensesModal: React.FC<AffectedExpensesModalProps> = ({ open, onOpenChange, rows, page, total, sort, onPageChange, onSortChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="ccr-affected-expenses-modal" onOpenAutoFocus={(e) => { e.preventDefault(); }} className="gba:max-w-[60vw] gba:w-[60vw]">
        <DialogHeader>
          <DialogTitle data-testid="ccr-affected-expenses-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.affected_expenses_title', 'Affected Expenses')}
          </DialogTitle>
        </DialogHeader>
        <AffectedExpensesTable
          data={rows}
          page={page}
          pageSize={5}
          totalCount={total}
          onPageChange={onPageChange}
          sort={sort}
          onSortChange={onSortChange}
          dataTestId="ccr-affected-expenses"
        />
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


