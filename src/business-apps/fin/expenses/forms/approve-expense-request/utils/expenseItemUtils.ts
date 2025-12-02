import { ExpensePlanItem } from '../types/expenseRequestV2Types'

export interface SplitExpenseItemsResult {
  itemData: ExpensePlanItem[]
  expenseAllowances: ExpensePlanItem[]
  expenseItems: ExpensePlanItem[]
}

/**
 * Splits expense plan items into allowances and regular expense items.
 * Allowances are identified by Expense Group value 'Allowances' and sorted by expenseDate ascending.
 */
export const splitExpenseItems = (items?: ExpensePlanItem[] | null): SplitExpenseItemsResult => {
  const itemData: ExpensePlanItem[] = Array.isArray(items) ? [...items] : []

  const expenseAllowances = itemData
    .filter(item => item?.expenseGroup?.value === 'Allowances')
    .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime())

  const expenseItems = itemData.filter(item => item?.expenseGroup?.value !== 'Allowances')

  return { itemData, expenseAllowances, expenseItems }
}
