import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { toTitleCase } from './advancePaymentUtils'

/**
 * Formats payment method for list/tables, aligned with
 * `AdvancePaymentMethodCell` in personal advance payments.
 */
export function formatPaymentMethodForExpenseTables(method: unknown, emptyDisplay = '-'): string {
  if (method == null) {
    return emptyDisplay
  }

  if (typeof method === 'object' && method !== null && 'value' in (method as object)) {
    const label = getCatalogValue(method as { value?: unknown })
    if (label?.trim()) {
      return label
    }
    return emptyDisplay
  }

  if (typeof method === 'object') {
    return emptyDisplay
  }

  const raw = String(method).trim()
  if (!raw) {
    return emptyDisplay
  }

  if (raw === 'DIRECT_DEPOSIT') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
      'Direct Deposit'
    )
  }

  if (raw === 'CASH_PAYMENT') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
      'Cash Payment'
    )
  }

  return toTitleCase(raw) || emptyDisplay
}
