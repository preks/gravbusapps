import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { globalSearchClient } from './GlobalSearchClient'

export function useGlobalSearchClient(accessToken?: string) {
  useSyncClientAccessToken(globalSearchClient, accessToken)
  return globalSearchClient
}
