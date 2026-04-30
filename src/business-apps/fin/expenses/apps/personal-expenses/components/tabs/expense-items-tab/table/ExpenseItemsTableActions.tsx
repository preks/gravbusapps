import { Button, useTranslation } from '@newwork/nw-design-system'
import { CurrencyDropdown } from '../../../../../../common/components/CurrencyDropdown'
import personalTranslations from '../../../../_i18n'

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
  const { t } = useTranslation(personalTranslations)
  return (
    <Button onClick={onAddExpenseItem} size="sm" variant="default" data-testid="add-expense-item-button" type="button">
      {t('expense-items-btn-add')}
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
  const { t } = useTranslation(personalTranslations)
  return (
    <>
      {availableCurrencyCodes.length > 0 && (
        <CurrencyDropdown
          availableCurrencies={availableCurrencyCodes}
          selectedCurrency={selectedCurrencyCode === 'ALL' ? null : selectedCurrencyCode}
          onCurrencyChange={onCurrencyChange}
          testIdPrefix="expense-items"
          currencyLabelText={t('expense-items-currency-label')}
          allCurrenciesOptionText={t('expense-items-currency-all')}
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
            {t('expense-items-create-expense-request')} ({selectedCount})
          </Button>
          <Button
            variant="destructive"
            data-testid="delete-selection-btn"
            onClick={onDeleteSelection}
            className="gba:inline-flex gba:items-center gba:gap-2"
          >
            {t('expense-items-delete-selection')} ({selectedCount})
          </Button>
        </>
      )}
    </>
  )
}
