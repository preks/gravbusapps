export interface NotificationsRefreshDetail {
  unreadCount?: number
  /** When true, refetch the open notifications list from the server (e.g. new SSE message). */
  reloadList?: boolean
  /** User-safe list/load error message; pass null to clear. */
  listError?: string | null
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

    globalThis.window.dispatchEvent(new CustomEvent('notifications:refresh', { detail: normalized }))
  } catch {
    // ignore
  }
}
