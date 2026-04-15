import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CurrencyDropdown } from '../../../../../../common/components/CurrencyDropdown'

interface ExpenseItemsPrimaryActionProps {
  onAddExpenseItem: () => void
}

interface ExpenseItemsSecondaryActionsProps {
  availableCurrencyCodes: string[]
  selectedCurrencyCode: string
  onCurrencyChange: (code: string | null) => void
  selectedCount: number
  onCreateExpenseRequest: () => void
  onDeleteSelection: () => void
}

export function ExpenseItemsPrimaryAction({ onAddExpenseItem }: Readonly<ExpenseItemsPrimaryActionProps>) {
  return (
    <Button onClick={onAddExpenseItem} size="sm" variant="default" data-testid="add-expense-item-button" type="button">
      {getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule_details.calculation_allowance_setup_list.calculation_allowance_setup_modal.btn_add',
        'Add'
      )}
    </Button>
  )
}

export function ExpenseItemsSecondaryActions({
  availableCurrencyCodes,
  selectedCurrencyCode,
  onCurrencyChange,
  selectedCount,
  onCreateExpenseRequest,
  onDeleteSelection
}: Readonly<ExpenseItemsSecondaryActionsProps>) {
  return (
    <>
      {availableCurrencyCodes.length > 0 && (
        <CurrencyDropdown
          availableCurrencies={availableCurrencyCodes}
          selectedCurrency={selectedCurrencyCode === 'ALL' ? null : selectedCurrencyCode}
          onCurrencyChange={onCurrencyChange}
          testIdPrefix="expense-items"
        />
      )}
      {selectedCount > 0 && (
        <>
          <Button
            variant="default"
            data-testid="create-expense-request-btn"
            onClick={onCreateExpenseRequest}
            className="gba:inline-flex gba:items-center gba:gap-2"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_list.flows_button.create_expense_request',
              'Create Expense Request'
            )}{' '}
            ({selectedCount})
          </Button>
          <Button
            variant="destructive"
            data-testid="delete-selection-btn"
            onClick={onDeleteSelection}
            className="gba:inline-flex gba:items-center gba:gap-2"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.delete_selection', 'Delete Selection')} (
            {selectedCount})
          </Button>
        </>
      )}
    </>
  )
}
