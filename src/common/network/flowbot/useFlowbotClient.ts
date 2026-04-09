import { useSyncClientAccessToken } from '@/common/network/useSyncClientAccessToken'
import { flowbotClient } from './FlowbotClient'

export function useFlowbotClient(accessToken?: string) {
  useSyncClientAccessToken(flowbotClient, accessToken)
  return flowbotClient
}
