import { Alert, AlertDescription, AlertTitle, Button, useTranslation } from '@newwork/nw-design-system'
import { BellSimpleIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { NotificationItem } from '../types'
import { NotificationListItem } from './NotificationListItem'
import translations from '../_i18n'

interface NotificationsPanelProps {
  className?: string
  'data-testid'?: string
  notifications: NotificationItem[]
  hasMore: boolean
  isLoadingList: boolean
  unreadOnly: boolean
  listTotalCount: number
  unreadTotalCount: number
  listError: string | null
  actionError: string | null
  onUnreadOnlyChange: (unreadOnly: boolean) => void
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
  onRetry: () => void
  onMarkAllAsRead: () => void
  onToggleRead: (id: string, currentlyUnread: boolean) => void
}

export function NotificationsPanel({
  className,
  'data-testid': dataTestId,
  notifications,
  hasMore,
  isLoadingList,
  unreadOnly,
  listTotalCount,
  unreadTotalCount,
  listError,
  actionError,
  onUnreadOnlyChange,
  scrollContainerRef,
  onScroll,
  onRetry,
  onMarkAllAsRead,
  onToggleRead
}: Readonly<NotificationsPanelProps>) {
  const { t } = useTranslation(translations)
  const unreadSummaryCount = unreadOnly ? listTotalCount : unreadTotalCount
  const showListError = Boolean(listError) && notifications.length === 0 && !isLoadingList
  const showEmptyState = notifications.length === 0 && !isLoadingList && !showListError

  const emptyTitle = unreadOnly ? t('notifications-empty-unread-title') : t('notifications-empty-title')
  const emptyDescription = unreadOnly
    ? t('notifications-empty-unread-description')
    : t('notifications-empty-description')

  return (
    <div
      className={[
        'gba:box-border gba:flex gba:h-96 gba:w-full gba:min-w-full gba:max-w-full gba:flex-col gba:max-h-96 gba:overflow-hidden gba:bg-background',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={dataTestId}
    >
      <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3 gba:py-2.5">
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2.5">
            <div className="gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-info/10">
              <BellSimpleIcon className="gba:h-4 gba:w-4 gba:text-info" weight="fill" />
            </div>
            <div className="gba:min-w-0 gba:flex-1">
              <div className="gba:text-sm gba:font-semibold gba:text-foreground">{t('notifications-title')}</div>
              <div className="gba:min-h-4 gba:text-xs gba:text-muted-foreground">
                {!unreadOnly && unreadSummaryCount > 0 && !listError && (
                  <span data-testid="notifications-unread-summary">
                    {t('notifications-unread-summary', { count: String(unreadSummaryCount) })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('notifications-mark-all-as-read')}
            onClick={onMarkAllAsRead}
            className="gba:shrink-0 gba:gap-1.5 gba:px-2"
            data-testid="notifications-mark-all-read"
            disabled={listError !== null || (unreadOnly ? listTotalCount === 0 : unreadTotalCount === 0)}
          >
            <CheckCircleIcon className="gba:h-4 gba:w-4 gba:shrink-0" />
            <span className="gba:text-xs gba:font-medium">{t('notifications-mark-all-short')}</span>
          </Button>
        </div>

        {actionError ? (
          <div className="gba:px-3 gba:pb-2">
            <Alert variant="destructive" data-testid="notifications-action-error">
              <AlertTitle>{t('notifications-error-action-title')}</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="gba:flex gba:min-h-9 gba:items-center gba:gap-2 gba:border-t gba:border-border gba:px-3 gba:py-2">
          <Button
            type="button"
            variant={unreadOnly ? 'secondary' : 'ghost'}
            size="sm"
            className="gba:h-7 gba:shrink-0 gba:px-2.5 gba:text-xs"
            aria-pressed={unreadOnly}
            data-testid="notifications-filter-unread-only"
            onClick={() => onUnreadOnlyChange(!unreadOnly)}
            disabled={Boolean(listError) && notifications.length === 0}
          >
            {t('notifications-filter-unread-only')}
          </Button>
          <span
            className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-xs gba:text-muted-foreground"
            data-testid="notifications-unread-filter-summary"
          >
            {unreadOnly && listTotalCount > 0
              ? t('notifications-unread-summary', { count: String(listTotalCount) })
              : '\u00a0'}
          </span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="gba:min-h-0 gba:flex-1 gba:w-full gba:min-w-0 gba:overflow-y-auto gba:bg-background"
        onScroll={onScroll}
        data-testid="notifications-list-scroll"
      >
        {showListError ? (
          <div className="gba:px-3 gba:py-4" data-testid="notifications-list-error">
            <Alert variant="destructive">
              <AlertTitle>{t('notifications-error-load-title')}</AlertTitle>
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gba:mt-3"
              data-testid="notifications-retry"
              onClick={onRetry}
            >
              {t('notifications-error-retry')}
            </Button>
          </div>
        ) : null}

        {showEmptyState ? (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-4 gba:py-10 gba:text-center"
            data-testid={unreadOnly ? 'notifications-empty-unread-state' : 'notifications-empty-state'}
          >
            <div className="gba:flex gba:h-11 gba:w-11 gba:items-center gba:justify-center gba:rounded-full gba:bg-background gba:text-muted-foreground gba:ring-1 gba:ring-border">
              <BellSimpleIcon className="gba:h-5 gba:w-5" />
            </div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{emptyTitle}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : null}

        {notifications.length > 0 ? (
          <ul className="gba:divide-y gba:divide-border">
            {notifications.map(notification => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                markAsReadLabel={t('notifications-mark-as-read')}
                markAsUnreadLabel={t('notifications-mark-as-unread')}
                onToggleRead={onToggleRead}
              />
            ))}
            {isLoadingList && (
              <li className="gba:px-3 gba:py-2 gba:text-center gba:text-xs gba:text-muted-foreground">
                {t('notifications-loading')}
              </li>
            )}
            {!hasMore && notifications.length > 0 && !isLoadingList && (
              <li className="gba:py-1 gba:text-center gba:text-xs gba:text-muted-foreground">
                {t('notifications-end-of-notifications')}
              </li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
