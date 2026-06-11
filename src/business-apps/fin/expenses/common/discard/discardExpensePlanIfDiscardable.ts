import { discardExpensePlan } from './discardExpensePlanService'
import { isDiscardableExpenseEntityStatus } from './discardConstants'

export interface DiscardExpensePlanIfDiscardableParams {
  accessToken?: string
  planId?: string | null
  status?: string | null
}

export async function discardExpensePlanIfDiscardable({
  accessToken,
  planId,
  status
}: DiscardExpensePlanIfDiscardableParams): Promise<boolean> {
  if (!planId || !isDiscardableExpenseEntityStatus(status)) {
    return false
  }

  if (!accessToken?.trim()) {
    throw new Error('Access token missing')
  }

  await discardExpensePlan({
    accessToken,
    entityId: planId
  })

  return true
}
