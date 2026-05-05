import { Alert, Button, useTranslation } from '@newwork/nw-design-system'
import { EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX } from './expenseItemColumns'
import personalTranslations from '../../../../_i18n'

interface ExpenseItemsTableErrorStateProps {
  error: string
  onRetry: () => void
}

export function ExpenseItemsTableErrorState({ error, onRetry }: Readonly<ExpenseItemsTableErrorStateProps>) {
  const { t } = useTranslation(personalTranslations)

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
      data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-error-state`}
    >
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:text-lg gba:font-medium gba:mb-2">{t('expense-items-error-loading-title')}</div>
        <div className="gba:text-gray-600">{error}</div>
      </Alert>
      <Button
        variant="default"
        onClick={onRetry}
        data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-retry-button`}
      >
        {t('expense-items-retry')}
      </Button>
    </div>
  )
}
