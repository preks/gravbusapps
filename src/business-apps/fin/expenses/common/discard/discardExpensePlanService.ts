import { DISCARD_EXPENSE_ENTITY_REASON, DISCARD_EXPENSE_PLAN_ENDPOINT } from './discardConstants'
import { postDiscardExpenseEntity } from './discardExpenseEntityService'

export interface DiscardExpensePlanInput {
  accessToken: string
  entityId: string
  reason?: string
}

export async function discardExpensePlan({
  accessToken,
  entityId,
  reason = DISCARD_EXPENSE_ENTITY_REASON
}: DiscardExpensePlanInput): Promise<void> {
  await postDiscardExpenseEntity(accessToken, DISCARD_EXPENSE_PLAN_ENDPOINT, {
    planId: entityId,
    reason: reason.trim()
  })
}
