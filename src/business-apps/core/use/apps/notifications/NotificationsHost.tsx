import { useNotificationClient } from '@/common/network/notification'
import { useNotificationsHostState } from './hooks'

export interface NotificationsHostProps {
  accessToken: string
}

/**
 * Keeps SSE + unread badge in sync while the notifications popover is closed.
 * Mount once at app shell level (e.g. BusinessAppIDE).
 */
export function NotificationsHost({ accessToken }: NotificationsHostProps) {
  const client = useNotificationClient(accessToken)
  useNotificationsHostState({ client, accessToken })
  return null
}
