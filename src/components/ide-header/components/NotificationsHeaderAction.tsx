import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { BellSimpleIcon } from '@phosphor-icons/react'
import { IDEHeaderActionButton, NOTIFICATIONS_POPOVER_CLASS } from './IDEHeaderActionButton'
import { NotificationsPopoverContent } from './NotificationsPopoverContent'

export interface NotificationsHeaderActionProps {
  accessToken: string
  unreadCount: number
}

export const NotificationsHeaderAction = React.memo(function NotificationsHeaderAction({
  accessToken,
  unreadCount
}: NotificationsHeaderActionProps) {
  return (
    <IDEHeaderActionButton
      id="notifications"
      icon={
        <div className="gba:relative">
          <BellSimpleIcon size={18} />
          {unreadCount > 0 && (
            <Badge variant="action" size="xs" className="gba:absolute gba:-right-2 gba:-top-2">
              {unreadCount}
            </Badge>
          )}
        </div>
      }
      label="Notifications"
      popoverClassName={NOTIFICATIONS_POPOVER_CLASS}
      popoverContent={<NotificationsPopoverContent accessToken={accessToken} />}
    />
  )
})

NotificationsHeaderAction.displayName = 'NotificationsHeaderAction'
