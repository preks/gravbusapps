import { Badge } from '@newwork/nw-design-system'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { NotificationItem } from '../types'
import { extractFirstAllowedUrl, sanitizeNotificationHtml } from '../utils'
import { formatNotificationRelativeTime } from '../utils/formatNotificationRelativeTime'
import { getNotificationToneBadgeVariant, resolveNotificationTone } from '../utils/notificationPresentation'
import { NotificationStatusControl } from './NotificationStatusControl'

interface NotificationListItemProps {
  notification: NotificationItem
  markAsReadLabel: string
  markAsUnreadLabel: string
  onToggleRead: (id: string, currentlyUnread: boolean) => void
}

function navigateToNotificationUrl(targetUrl: string): void {
  try {
    const url = new URL(targetUrl, globalThis.window.location.origin)
    if (url.origin === globalThis.window.location.origin) {
      navigateTo(`${url.pathname}${url.search}${url.hash}`)
      return
    }
    globalThis.window.open(url.href, '_self')
  } catch {
    globalThis.window.open(targetUrl, '_self')
  }
}

export function NotificationListItem({
  notification,
  markAsReadLabel,
  markAsUnreadLabel,
  onToggleRead
}: Readonly<NotificationListItemProps>) {
  const unread = notification.userNotification?.read === false
  const targetUrl = extractFirstAllowedUrl(notification.userNotification?.body)
  const tone = resolveNotificationTone(notification.classification, notification.type)
  const title = notification.userNotification?.title ?? notification.type ?? ''
  const relativeTime = formatNotificationRelativeTime(notification.createdAt)

  const handleActivate = () => {
    if (!targetUrl) {
      return
    }
    navigateToNotificationUrl(targetUrl)
  }

  const mainContent = (
    <div className="gba:min-w-0 gba:flex-1">
      <p
        className={[
          'gba:text-sm gba:leading-snug gba:break-words',
          unread ? 'gba:font-semibold gba:text-info' : 'gba:font-normal gba:text-muted-foreground'
        ].join(' ')}
      >
        {title}
      </p>

      {notification.userNotification?.body && (
        <div
          className="gba:mt-0.5 gba:text-xs gba:leading-relaxed gba:text-muted-foreground gba:break-words [&_a]:gba:break-all [&_a]:gba:text-primary [&_a]:gba:underline"
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(notification.userNotification.body)
          }}
        />
      )}

      <div className="gba:mt-1.5 gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
        {notification.classification && (
          <Badge variant={getNotificationToneBadgeVariant(tone)} size="xs">
            {notification.classification}
          </Badge>
        )}
        {relativeTime && <span className="gba:text-xs gba:text-muted-foreground">{relativeTime}</span>}
      </div>
    </div>
  )

  return (
    <li
      className={[
        'gba:border-l-4 gba:bg-background gba:transition-colors',
        unread ? 'gba:border-l-info' : 'gba:border-l-transparent',
        targetUrl ? 'hover:gba:bg-accent/25' : ''
      ].join(' ')}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="gba:flex gba:items-start gba:gap-2 gba:px-3 gba:py-2.5 gba:min-w-0">
        {targetUrl ? (
          <button
            type="button"
            className="gba:min-w-0 gba:flex-1 gba:cursor-pointer gba:border-0 gba:bg-transparent gba:p-0 gba:text-left"
            onClick={handleActivate}
            data-testid={`notification-item-link-${notification.id}`}
          >
            {mainContent}
          </button>
        ) : (
          mainContent
        )}

        <NotificationStatusControl
          notificationId={notification.id}
          unread={unread}
          markAsReadLabel={markAsReadLabel}
          markAsUnreadLabel={markAsUnreadLabel}
          onToggleRead={onToggleRead}
        />
      </div>
    </li>
  )
}
