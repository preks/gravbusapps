import { DISCARD_EXPENSE_ENTITY_REASON, DISCARD_EXPENSE_REQUEST_ENDPOINT } from './discardConstants'
import { postDiscardExpenseEntity } from './discardExpenseEntityService'

export interface DiscardExpenseRequestInput {
  accessToken: string
  entityId: string
  reason?: string
}

export async function discardExpenseRequest({
  accessToken,
  entityId,
  reason = DISCARD_EXPENSE_ENTITY_REASON
}: DiscardExpenseRequestInput): Promise<void> {
  await postDiscardExpenseEntity(accessToken, DISCARD_EXPENSE_REQUEST_ENDPOINT, {
    requestId: entityId,
    reason: reason.trim()
  })
}
