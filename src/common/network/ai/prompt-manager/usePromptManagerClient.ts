import { promptManagerClient } from './PromptManagerClient'
import { useSyncClientAccessToken } from '../../useSyncClientAccessToken'

export const usePromptManagerClient = (accessToken: string) => {
  useSyncClientAccessToken(promptManagerClient, accessToken)

  return promptManagerClient
}
