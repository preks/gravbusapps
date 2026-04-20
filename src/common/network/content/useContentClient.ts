import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { contentClient } from './ContentClient'

export function useContentClient(accessToken?: string) {
  useSyncClientAccessToken(contentClient, accessToken)
  return contentClient
}
