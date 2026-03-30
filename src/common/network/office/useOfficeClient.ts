import { officeClient } from './OfficeClient'
import { useSyncClientAccessToken } from '../useSyncClientAccessToken'

export function useOfficeClient(accessToken?: string) {
  useSyncClientAccessToken(officeClient, accessToken)
  return officeClient
}
