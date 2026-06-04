import React from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  ShareEntityDialog,
  SPREADSHEET_SHARE_PERMISSIONS,
  sendShareBlinkNotifications,
  type ShareNotificationContext,
  type SharedEntityUser
} from '@/business-apps/core/office/sharing'
import type { SharePermission } from '../types'

export interface ShareAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  appName: string
  appFilePath: string
  accessToken: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  isOwner: boolean
  currentUserPermission?: SharePermission | 'owner'
  sharedUsers: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    userAvatar?: string
    permission: SharePermission
    sharedAt: string
  }>
  onShare: (
    shares: Array<{ userId: string; permission: SharePermission }>,
    userDetails?: Array<{ userId: string; displayName: string; avatar?: string; email?: string }>
  ) => Promise<boolean>
  onUnshare: (shareId: string) => Promise<boolean>
  onRefreshShares: () => Promise<void>
  onManageAccess?: () => void
  'data-testid'?: string
}

function mapSharedUsers(sharedUsers: ShareAppDialogProps['sharedUsers']): SharedEntityUser[] {
  return sharedUsers.map(user => ({
    shareId: user.id,
    userId: user.userId,
    userName: user.userName,
    userEmail: user.userEmail,
    userAvatar: user.userAvatar,
    permission: user.permission,
    sharedAt: user.sharedAt
  }))
}

export const ShareAppDialog: React.FC<ShareAppDialogProps> = ({
  open,
  onOpenChange,
  appId,
  appName,
  appFilePath,
  accessToken,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isOwner,
  currentUserPermission,
  sharedUsers,
  onShare,
  onUnshare,
  onRefreshShares,
  onManageAccess,
  'data-testid': testId = 'share-app-dialog'
}) => {
  const sendNotifications = React.useCallback(
    (context: ShareNotificationContext) =>
      sendShareBlinkNotifications({
        ...context,
        entityType: 'spreadsheet_app',
        appTag: 'spreadsheet-share',
        titlePrefix: 'Spreadsheet Shared',
        entityUrl: buildPlatformUrl('/platform/every-office/spreadsheets', {
          appId,
          view: 'viewer',
          filePath: appFilePath
        })
      }),
    [appFilePath, appId]
  )

  return (
    <ShareEntityDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={appId}
      entityTitle={appName}
      entityType="spreadsheet_app"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      isOwner={isOwner}
      currentUserPermission={currentUserPermission}
      sharedUsers={mapSharedUsers(sharedUsers)}
      permissionOptions={SPREADSHEET_SHARE_PERMISSIONS}
      onShare={recipients =>
        onShare(
          recipients.map(recipient => ({
            userId: recipient.userId,
            permission: recipient.permission as SharePermission
          }))
        )
      }
      onUnshare={onUnshare}
      onRefreshShares={onRefreshShares}
      sendNotifications={sendNotifications}
      onManageAccess={onManageAccess}
      data-testid={testId}
    />
  )
}
