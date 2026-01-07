import { env } from '@/common/env/EnvUtils'

/**
 * API client for fetching service requests from custom-flow-engine
 */

/**
 * Services app catalog identifier for filtering service requests
 * This ensures only requests from the Services app are shown
 */
const SERVICES_APP_TAG = 'AppCatalog:1:SVC'

const getApiBase = (): string => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set')
  }
  return `${baseUrl}/flow-engine/api`
}

const API_BASE = getApiBase()

/**
 * Fetch list of flows initiated by a user
 * Filters by Services app tag to show only service portal requests
 */
export async function fetchUserFlows(userId: string, accessToken: string): Promise<any[]> {
  const listResponse = await fetch(
    `${API_BASE}/flows/user/${userId}/initiated?limit=50&offset=0&tag.app=${SERVICES_APP_TAG}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!listResponse.ok) {
    throw new Error(`Failed to fetch requests: ${listResponse.status} ${listResponse.statusText}`)
  }

  const listData = await listResponse.json()
  return listData.data?.flows || listData.flows || []
}

/**
 * Fetch detailed information for a specific flow
 */
export async function fetchFlowDetails(flowId: string, accessToken: string): Promise<any | null> {
  try {
    const detailResponse = await fetch(`${API_BASE}/flows/${flowId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!detailResponse.ok) {
      return null
    }

    return await detailResponse.json()
  } catch {
    return null
  }
}
