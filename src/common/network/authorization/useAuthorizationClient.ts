import { authorizationClient } from './AuthorizationClient'
import { useSyncClientAccessToken } from '../useSyncClientAccessToken'

export const useAuthorizationClient = (accessToken: string) => {
  useSyncClientAccessToken(authorizationClient, accessToken)

  return authorizationClient
}
