import { GET_EXPENSE_ANALYTICS_DATA } from '../../queries/analytics'
import type { AnalyticsData } from './types'
import { buildCurrencyQueryVariables, mapAnalyticsResult } from './shared'

let inFlightRequest: Promise<AnalyticsData> | null = null
let lastRequestSignature: string | null = null

export async function fetchAnalyticsData(
  graphqlClient: any,
  variables: {
    managerId: string
    startDateTs: string | null
    endDateTs: string | null
    currencyRef?: string
  }
): Promise<AnalyticsData> {
  const { currencyRef, ...restVariables } = variables
  const queryVariables: any = {
    ...restVariables,
    ...buildCurrencyQueryVariables(currencyRef)
  }

  const signature = JSON.stringify(queryVariables)

  // If same request is in flight, return the existing promise
  if (inFlightRequest && lastRequestSignature === signature) {
    return inFlightRequest
  }

  // Clear cache and make new request
  lastRequestSignature = signature
  inFlightRequest = (async () => {
    try {
      const result = await graphqlClient.request(GET_EXPENSE_ANALYTICS_DATA, queryVariables)
      return mapAnalyticsResult(result)
    } finally {
      // Clear in-flight cache after request completes
      inFlightRequest = null
      lastRequestSignature = null
    }
  })()

  return inFlightRequest
}
