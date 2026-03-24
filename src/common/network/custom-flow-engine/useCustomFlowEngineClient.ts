import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { customFlowEngineClient } from './CustomFlowEngineClient'

export function useCustomFlowEngineClient(accessToken?: string) {
  useSyncClientAccessToken(customFlowEngineClient, accessToken)
  return customFlowEngineClient
}
