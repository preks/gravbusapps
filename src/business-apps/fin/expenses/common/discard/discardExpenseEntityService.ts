import { RestClient } from '@/common/network/rest/RestClient'
import { PROCESSES_ENDPOINT } from '@/business-apps/fin/expenses/utils/constants'

export async function postDiscardExpenseEntity(
  accessToken: string,
  endpoint: string,
  payload: Record<string, string>
): Promise<void> {
  if (!accessToken.trim()) {
    throw new Error('Access token missing')
  }

  const restClient = new RestClient(PROCESSES_ENDPOINT)
  await restClient.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  })
}
