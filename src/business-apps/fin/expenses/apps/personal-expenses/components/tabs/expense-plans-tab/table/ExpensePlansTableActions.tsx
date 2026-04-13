import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CurrencyDropdown } from '../../../shared/TableSharedComponents'
import type { CurrencyStat } from '../../../../utils/tableUtils'

export function ExpensePlansPrimaryAction({ onAddExpensePlan }: Readonly<{ onAddExpensePlan: () => void }>) {
  return (
    <Button
      onClick={onAddExpensePlan}
      data-testid="add-expense-plan-button"
      className="gba:inline-flex gba:items-center gba:gap-2"
    >
      {getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
        'Add'
      )}
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
