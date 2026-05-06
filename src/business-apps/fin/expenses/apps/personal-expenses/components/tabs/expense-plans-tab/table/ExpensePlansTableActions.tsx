import { Button } from '@newwork/nw-design-system'
import { CurrencyDropdown } from '../../../shared/TableSharedComponents'
import type { CurrencyStat } from '../../../../utils/tableUtils'

export function ExpensePlansPrimaryAction({
  onAddExpensePlan,
  t
}: Readonly<{ onAddExpensePlan: () => void; t: (key: string) => string }>) {
  return (
    <Button
      onClick={onAddExpensePlan}
      data-testid="add-expense-plan-button"
      className="gba:inline-flex gba:items-center gba:gap-2"
    >
      {t('expense-plans-primary-add')}
    </Button>
  )
}

export function ExpensePlansSecondaryActions({
  currencyStats,
  selectedCurrencyCode,
  onCurrencyChange
}: Readonly<{
  currencyStats: CurrencyStat[]
  selectedCurrencyCode: string
  onCurrencyChange: (code: string) => void
}>) {
  if (!currencyStats.length) {
    return undefined
  }
  return (
    <CurrencyDropdown
      currencyStats={currencyStats}
      selectedCurrencyCode={selectedCurrencyCode}
      onCurrencyChange={onCurrencyChange}
      testIdPrefix="expense-plans"
    />
  )
}
