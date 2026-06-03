import { useSyncClientAccessToken } from '@/common/network/useSyncClientAccessToken'
import { FunctionsServiceClient } from './FunctionsServiceClient'

let functionsServiceClient: FunctionsServiceClient | undefined

function getFunctionsServiceClient(): FunctionsServiceClient {
  if (!functionsServiceClient) {
    functionsServiceClient = new FunctionsServiceClient()
  }
  return functionsServiceClient
}

export function useFunctionsServiceClient(accessToken?: string) {
  const client = getFunctionsServiceClient()
  useSyncClientAccessToken(client, accessToken)
  return client
}
