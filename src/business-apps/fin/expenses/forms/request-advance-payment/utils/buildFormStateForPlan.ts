import { FormData, FormValidationState } from '../types/FormTypes'
import { ExpensePlan } from '../hooks/useRequestAdvancePaymentData'

export const EMPTY_ADVANCE_PAYMENT_FORM: FormData = {
  expensePlanId: '',
  amount: 0,
  currency: '',
  costCenter: '',
  paymentMethod: '',
  notes: ''
}

export const INITIAL_VALIDATION_STATE: FormValidationState = {
  isValid: false,
  errors: [],
  validationError: null
}

export function buildFormStateForPlan(planId: string, plans: ExpensePlan[]): FormData {
  if (!planId) {
    return { ...EMPTY_ADVANCE_PAYMENT_FORM }
  }

  const selected = plans.find(plan => plan.id === planId)

  return {
    expensePlanId: planId,
    amount: 0,
    currency: selected?.currency?.code ?? '',
    costCenter: selected?.costCenterId ?? '',
    paymentMethod: '',
    notes: ''
  }
}

/**
 * Applies plan currency/cost center when details load async (preserves user-entered amount, etc.).
 */
export function mergePlanCurrencyAndCostCenter(prev: FormData, plan: ExpensePlan | undefined): FormData | null {
  if (!plan) {
    return null
  }

  const nextCurrency = plan.currency?.code ?? ''
  const nextCostCenter = plan.costCenterId ?? ''
  const shouldUpdateCurrency = Boolean(nextCurrency) && prev.currency !== nextCurrency
  const shouldUpdateCostCenter = Boolean(nextCostCenter) && prev.costCenter !== nextCostCenter

  if (!shouldUpdateCurrency && !shouldUpdateCostCenter) {
    return null
  }

  return {
    ...prev,
    currency: shouldUpdateCurrency ? nextCurrency : prev.currency,
    costCenter: shouldUpdateCostCenter ? nextCostCenter : prev.costCenter
  }
}
