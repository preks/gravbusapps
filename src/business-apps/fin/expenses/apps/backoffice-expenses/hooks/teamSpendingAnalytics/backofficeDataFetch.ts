import { GET_BACKOFFICE_ANALYTICS_DATA } from '../../queries/backofficeAnalytics'
import type { AnalyticsData } from '../../../manager-expenses/hooks/teamSpendingAnalytics/types'
import {
  buildCurrencyQueryVariables,
  mapAnalyticsResult
} from '../../../manager-expenses/hooks/teamSpendingAnalytics/shared'

const inFlightRequests = new Map<string, Promise<AnalyticsData>>()
const clientIds = new WeakMap<object, number>()
let clientIdCounter = 0

const getClientId = (graphqlClient: any): number => {
  if (!graphqlClient || (typeof graphqlClient !== 'object' && typeof graphqlClient !== 'function')) {
    return 0
  }
  const clientObject = graphqlClient as object
  const existing = clientIds.get(clientObject)
  if (existing) return existing
  clientIdCounter += 1
  clientIds.set(clientObject, clientIdCounter)
  return clientIdCounter
}

export async function fetchBackofficeAnalyticsData(
  graphqlClient: any,
  variables: {
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

  const signature = JSON.stringify({
    clientId: getClientId(graphqlClient),
    queryVariables
  })
  const existingInFlight = inFlightRequests.get(signature)
  if (existingInFlight) {
    return existingInFlight
  }

  const requestPromise = (async () => {
    try {
      const result = await graphqlClient.request(GET_BACKOFFICE_ANALYTICS_DATA, queryVariables)
      return mapAnalyticsResult(result)
    } finally {
      inFlightRequests.delete(signature)
    }
  })()

  inFlightRequests.set(signature, requestPromise)
  return requestPromise
}
