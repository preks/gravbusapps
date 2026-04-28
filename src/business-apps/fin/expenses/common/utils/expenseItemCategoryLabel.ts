import { getCatalogValue } from '@/common/utils/windowUtils'

export type ExpenseItemPositionForCategory = {
  expenseGroup?: {
    value?: string | null
    translations?: Array<{ value?: string | null; localeCode?: string | null }> | null
  } | null
}

/**
 * Category for manager expense *item* reports: walks `expensePosition` in order
 * and returns the first resolvable `expenseGroup` label (locale via {@link getCatalogValue},
 * same pattern as personal expense dashboard).
 */
export function getExpenseItemCategoryLabel(
  item: { expensePosition?: ExpenseItemPositionForCategory[] | null },
  whenMissing: string
): string {
  const positions = item.expensePosition
  if (!Array.isArray(positions) || positions.length === 0) {
    return whenMissing
  }
  for (const pos of positions) {
    const g = pos?.expenseGroup
    if (g == null) {
      continue
    }
    const label = getCatalogValue(g)
    if (label.trim()) {
      return label.trim()
    }
  }
  return whenMissing
}
