// Data fetching logic for Team Spending Analytics

import { GET_EXPENSE_ANALYTICS_DATA } from '../../queries/analytics'
import type { AnalyticsData } from './types'

// In-flight request cache for deduplication
let inFlightRequest: Promise<AnalyticsData> | null = null
let lastRequestSignature: string | null = null

/**
 * Fetch analytics data with deduplication
 * Prevents multiple concurrent requests with the same parameters
 */
export async function fetchAnalyticsData(
  graphqlClient: any,
  variables: {
    managerId: string
    startDateTs: string | null
    endDateTs: string | null
    currencyRef?: string
  }
): Promise<AnalyticsData> {
  // Build currency filter boolean expressions conditionally
  const { currencyRef, ...restVariables } = variables

  // Only build filter objects if currencyRef is provided and not empty
  const hasCurrency = currencyRef && currencyRef !== '' && currencyRef !== 'null' && currencyRef !== 'undefined'

  const queryVariables: any = {
    ...restVariables
  }

  // Only add currency filter boolean expressions if we have a currency
  // If not provided, GraphQL will use the default empty objects {} which match everything
  if (hasCurrency) {
    queryVariables.itemCurrencyWhere = { currencyRef: { _eq: currencyRef } }
    queryVariables.reqCurrencyWhere = { currencyRef: { _eq: currencyRef } }
    queryVariables.planCurrencyWhere = { currencyRef: { _eq: currencyRef } }
    queryVariables.payCurrencyWhere = { currencyRef: { _eq: currencyRef } }
  }
  // If no currency, don't pass these variables - let GraphQL use defaults (empty objects)

  // Create signature for deduplication
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
      return {
        expenseItems: result?.expenseItems || [],
        expenseRequests: result?.expenseRequests || [],
        expensePlans: result?.expensePlans || [],
        advancePayments: result?.advancePayments || []
      }
    } finally {
      // Clear in-flight cache after request completes
      inFlightRequest = null
      lastRequestSignature = null
    }
  })()

  return inFlightRequest
}
