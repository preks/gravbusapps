import type { ExpensePlan } from '../hooks/useRequestAdvancePaymentData'

export function getExpensePlanRequestTypeLabel(plan: ExpensePlan | undefined): string | undefined {
  if (!plan?.requestType) {
    return undefined
  }

  const translated = plan.requestType.translations?.[0]?.value
  if (translated) {
    return translated
  }

  return plan.requestType.value
}
