import React from 'react'
import { Notifications } from '@/business-apps/core/use/apps/notifications'

export interface NotificationsPopoverContentProps {
  accessToken: string
  isOpen: boolean
  unreadCount: number
}

export const NotificationsPopoverContent: React.FC<NotificationsPopoverContentProps> = ({
  accessToken,
  isOpen,
  unreadCount
}) => {
  return (
    <Notifications
      accessToken={accessToken}
      additionalData={{ isOpen, enableHost: false, seedUnreadCount: unreadCount }}
      data-testid="ide-notifications-popover"
    />
  )
}
