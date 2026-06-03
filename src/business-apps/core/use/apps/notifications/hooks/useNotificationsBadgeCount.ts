import { useEffect, useState } from 'react'
import { getCachedUnreadCount, getNotificationsRefreshDetailFromEvent } from '../utils'

export function useNotificationsBadgeCount(): number {
  const [unreadCount, setUnreadCount] = useState(() => getCachedUnreadCount() ?? 0)

  useEffect(() => {
    const handleRefresh: EventListener = event => {
      const detail = getNotificationsRefreshDetailFromEvent(event)
      if (typeof detail?.unreadCount === 'number') {
        setUnreadCount(detail.unreadCount)
      }
    }

    globalThis.window.addEventListener('notifications:refresh', handleRefresh)
    return () => {
      globalThis.window.removeEventListener('notifications:refresh', handleRefresh)
    }
  }, [])

  return unreadCount
}
