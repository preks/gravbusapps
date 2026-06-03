import React from 'react'
import { Notifications } from '@/business-apps/core/use/apps/notifications'

export interface NotificationsPopoverContentProps {
  accessToken: string
}

export const NotificationsPopoverContent: React.FC<NotificationsPopoverContentProps> = ({ accessToken }) => {
  return (
    <Notifications
      accessToken={accessToken}
      additionalData={{ isOpen: true, enableHost: false }}
      data-testid="ide-notifications-popover"
    />
  )
}
