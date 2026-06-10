export { computeHasMore, NOTIFICATIONS_PAGE_SIZE } from './computeHasMore'
export { sanitizeNotificationHtml } from './sanitizeNotificationHtml'
export { extractFirstAllowedUrl } from './extractFirstAllowedUrl'
export { fetchUnreadNotificationCount } from './fetchUnreadNotificationCount'
export { formatNotificationErrorMessage } from './formatNotificationErrorMessage'
export {
  getCachedUnreadCount,
  getNotificationsRefreshDetailFromEvent,
  notifyHostRefresh,
  setCachedUnreadCount
} from './notifyHostRefresh'
export type { NotificationsRefreshDetail } from './notifyHostRefresh'
