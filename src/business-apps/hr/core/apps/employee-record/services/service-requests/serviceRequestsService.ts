/**
 * Service Requests Adapter
 * Main entry point for fetching and transforming service requests
 * This is a lightweight implementation with minimal dependencies
 */

import { fetchUserFlows, fetchFlowDetails } from './serviceRequestsApi'
import { transformFlowToServiceRequest } from './serviceRequestsTransformers'
import type { SubmittedRequest } from './serviceRequestsTypes'

// Re-export types for convenience
export type { SubmittedRequest, StepInstance } from './serviceRequestsTypes'

/**
 * Fetch service requests initiated by a specific user
 * @param userId - The user ID
 * @param accessToken - Authentication token
 * @returns Array of service requests
 */
export async function getUserRequests(userId: string, accessToken: string): Promise<SubmittedRequest[]> {
  try {
    // Step 1: Get list of flows initiated by the user
    const flows = await fetchUserFlows(userId, accessToken)

    // Step 2: Get detailed information for each flow in parallel
    const detailPromises = flows.map(async (flow: any) => {
      const flowId = flow.flowId || flow.id
      const detailData = await fetchFlowDetails(flowId, accessToken)

      if (!detailData) {
        return null
      }

      return transformFlowToServiceRequest(detailData)
    })

    const detailedFlows = await Promise.all(detailPromises)
    const validFlows = detailedFlows.filter((flow): flow is SubmittedRequest => flow !== null)

    return validFlows
  } catch (error) {
    throw new Error(`Failed to fetch user requests: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
