export type { NotificationItem, NotificationsListResponse } from '@/common/network/notification/types'

export interface NotificationsAdditionalData {
  /**
   * When true, load the notification list. Defaults to true when omitted so published
   * platform popovers fetch without the shell passing additionalData.
   */
  isOpen?: boolean
  /**
   * When false, do not mount background SSE/unread host (IDE already mounts NotificationsHost).
   */
  enableHost?: boolean
  /** Unread count from shell badge; seeds panel header before list hooks receive refresh events. */
  seedUnreadCount?: number
}
