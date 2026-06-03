import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { notificationClient } from './NotificationClient'

export function useNotificationClient(accessToken?: string) {
  useSyncClientAccessToken(notificationClient, accessToken)
  return notificationClient
}
