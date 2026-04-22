import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { chatClient } from './ChatClient'

export function useChatClient(accessToken?: string) {
  useSyncClientAccessToken(chatClient, accessToken)
  return chatClient
}
