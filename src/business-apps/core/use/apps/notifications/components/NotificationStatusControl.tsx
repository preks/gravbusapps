interface NotificationStatusControlProps {
  notificationId: string
  unread: boolean
  markAsReadLabel: string
  markAsUnreadLabel: string
  onToggleRead: (id: string, unread: boolean) => void
}

export function NotificationStatusControl({
  notificationId,
  unread,
  markAsReadLabel,
  markAsUnreadLabel,
  onToggleRead
}: Readonly<NotificationStatusControlProps>) {
  return (
    <button
      type="button"
      title={unread ? markAsReadLabel : markAsUnreadLabel}
      aria-label={unread ? markAsReadLabel : markAsUnreadLabel}
      className={[
        'gba:box-border gba:m-0 gba:h-3 gba:w-3 gba:shrink-0 gba:rounded-full gba:border gba:border-offline',
        'gba:p-0 gba:leading-none gba:appearance-none hover:gba:bg-accent/40',
        unread ? 'gba:bg-info' : 'gba:bg-transparent'
      ].join(' ')}
      onClick={event => {
        event.stopPropagation()
        onToggleRead(notificationId, unread)
      }}
      data-testid={unread ? `notification-mark-read-${notificationId}` : `notification-mark-unread-${notificationId}`}
    />
  )
}
