import { getPaymentMethodDisplay } from './advancePaymentUtils'

/**
 * Formats payment method for list/tables and reports.
 * Delegates to {@link getPaymentMethodDisplay} when `t` is provided (Fluent keys in common `_i18n`).
 */
export function formatPaymentMethodForExpenseTables(
  method: unknown,
  emptyDisplay = '-',
  t?: (key: string) => string
): string {
  if (t) {
    return getPaymentMethodDisplay(method, t, { emptyDisplay })
  }

  if (method == null) {
    return emptyDisplay
  }

  const raw = typeof method === 'string' ? method.trim() : String(method).trim()
  if (!raw) {
    return emptyDisplay
  }

  if (raw === 'DIRECT_DEPOSIT') {
    return 'Direct Deposit'
  }

  if (raw === 'CASH_PAYMENT') {
    return 'Cash Payment'
  }

  return raw
}

export { getPaymentMethodDisplay } from './advancePaymentUtils'
