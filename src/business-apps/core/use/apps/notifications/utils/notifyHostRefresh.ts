export interface NotificationsRefreshDetail {
  unreadCount?: number
  /** When true, refetch the open notifications list from the server (e.g. new SSE message). */
  reloadList?: boolean
  /** User-safe list/load error message; pass null to clear. */
  listError?: string | null
}

/** Last unread count from host/badge refresh; used when the list mounts after the event fired. */
let cachedUnreadCount: number | undefined

export function getCachedUnreadCount(): number | undefined {
  return cachedUnreadCount
}

export function setCachedUnreadCount(count: number): void {
  cachedUnreadCount = count
}

export function getNotificationsRefreshDetailFromEvent(event: Event): NotificationsRefreshDetail | undefined {
  if (!(event instanceof CustomEvent)) {
    return undefined
  }

  const { detail } = event
  if (detail === null || typeof detail !== 'object') {
    return undefined
  }

  return detail as NotificationsRefreshDetail
}

export function notifyHostRefresh(detail?: number | NotificationsRefreshDetail): void {
  try {
    const normalized: NotificationsRefreshDetail | undefined =
      typeof detail === 'number' ? { unreadCount: detail } : detail

    if (typeof normalized?.unreadCount === 'number') {
      setCachedUnreadCount(normalized.unreadCount)
    }

    globalThis.window.dispatchEvent(new CustomEvent('notifications:refresh', { detail: normalized }))
  } catch {
    // ignore
  }
}
