export interface PsiInitialParameters {
  expensePlan?: string | { id?: string } | null
}

export interface PsiTaskPayload {
  psi_initialParameters?: PsiInitialParameters | null
}

export interface AdditionalDataLike {
  expensePlanId?: string
  planId?: string
  psi_taskPayload?: PsiTaskPayload | null
}

/**
 * Extracts an Expense Plan ID from heterogeneous additionalData shapes.
 * Single-responsibility, pure function for reuse and testability.
 */
export const extractExpensePlanIdFromAdditionalData = (additionalData: unknown): string | undefined => {
  const data = (additionalData || {}) as AdditionalDataLike

  if (data.expensePlanId && typeof data.expensePlanId === 'string') return data.expensePlanId
  if (data.planId && typeof data.planId === 'string') return data.planId

  const initialParams = data.psi_taskPayload?.psi_initialParameters
  const plan = initialParams?.expensePlan
  if (!plan) return undefined
  if (typeof plan === 'string') return plan
  if (typeof plan === 'object' && plan.id && typeof plan.id === 'string') return plan.id
  return undefined
}
