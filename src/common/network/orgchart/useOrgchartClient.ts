import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { orgchartClient } from './OrgchartClient'

export function useOrgchartClient(accessToken?: string) {
  useSyncClientAccessToken(orgchartClient, accessToken)
  return orgchartClient
}
