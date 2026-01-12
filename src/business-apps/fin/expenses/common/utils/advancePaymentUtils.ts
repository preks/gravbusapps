import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'

/**
 * Formats a string value to title case (capitalizes first letter of each word)
 */
export const toTitleCase = (value?: string): string => {
  if (value === null || value === undefined) return ''
  const normalized = String(value).trim()
  if (!normalized) return ''
  if (normalized.toUpperCase() === 'N/A') return 'N/A'
  return normalized
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Gets display value for payment method, handling catalog entries and special cases
 */
export const getPaymentMethodDisplay = (method: unknown): string => {
  const notSpecified = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.not_specified', 'Not specified')

  if (!method) return notSpecified

  // Handle catalog entry object with translations/value
  if (typeof method === 'object' && method !== null && 'value' in (method as any)) {
    return getCatalogValue(method as any) || notSpecified
  }

  const raw = String(method).trim()
  if (!raw) return notSpecified

  // Handle special cases with translations
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

  // Default: format to title case
  return toTitleCase(raw)
}

/**
 * Formats expense plan display value
 */
export const getExpensePlanDisplay = (expensePlan?: { code?: string; title?: string } | null): string => {
  if (!expensePlan) {
    const noLabel = getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.query_params_no', 'No')
    const planLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_calculation_rule_details.query_params_expense_plan',
      'Expense Plan'
    )
    return `${noLabel} ${planLabel}`
  }

  return expensePlan.code || expensePlan.title || 'N/A'
}
