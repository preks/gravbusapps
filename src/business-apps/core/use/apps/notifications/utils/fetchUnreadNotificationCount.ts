import type { NotificationClient } from '@/common/network/notification/NotificationClient'

/** Server total of unread notifications (minimal page fetch). */
export async function fetchUnreadNotificationCount(client: NotificationClient): Promise<number> {
  const resp = await client.getNotifications({
    read: false,
    page: 0,
    size: 1,
    sortDirection: 'DESC'
  })
  return resp.totalCount ?? 0
}
