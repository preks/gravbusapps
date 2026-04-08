import { Alert, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX } from './expenseItemColumns'

interface ExpenseItemsTableErrorStateProps {
  error: string
  onRetry: () => void
}

export function ExpenseItemsTableErrorState({ error, onRetry }: Readonly<ExpenseItemsTableErrorStateProps>) {
  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
      data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-error-state`}
    >
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:text-lg gba:font-medium gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.error_loading_expense_items',
            'Error Loading Expense Items'
          )}
        </div>
        <div className="gba:text-gray-600">{error}</div>
      </Alert>
      <Button
        variant="default"
        onClick={onRetry}
        data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-retry-button`}
      >
        {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.retry', 'Retry')}
      </Button>
    </div>
  )
}
