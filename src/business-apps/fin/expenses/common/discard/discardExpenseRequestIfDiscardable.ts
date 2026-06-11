import { discardExpenseRequest } from './discardExpenseRequestService'
import { isDiscardableExpenseEntityStatus } from './discardConstants'

export interface DiscardExpenseRequestIfDiscardableParams {
  accessToken?: string
  requestId?: string | null
  status?: string | null
}

export async function discardExpenseRequestIfDiscardable({
  accessToken,
  requestId,
  status
}: DiscardExpenseRequestIfDiscardableParams): Promise<boolean> {
  if (!requestId || !isDiscardableExpenseEntityStatus(status)) {
    return false
  }

  if (!accessToken?.trim()) {
    throw new Error('Access token missing')
  }

  await discardExpenseRequest({
    accessToken,
    entityId: requestId
  })

  return true
}
