import React from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  ShareEntityDialog,
  WHITEBOARD_SHARE_PERMISSIONS,
  sendShareBlinkNotifications,
  type ShareNotificationContext,
  type SharedEntityUser
} from '@/business-apps/core/office/sharing'
import { WhiteboardApiService } from '../services/WhiteboardApiService'

type WhiteboardPermission = 'view' | 'edit' | 'comment' | 'admin'

export interface ShareWhiteboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  whiteboardId: string
  whiteboardTitle: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  accessToken: string | undefined
  isOwner?: boolean
  currentUserPermission?: 'view' | 'edit' | 'comment' | 'owner' | 'admin'
  onShareComplete?: () => void
  onManageAccess?: () => void
  'data-testid'?: string
}

function mapSharedUsers(
  users: Array<{ id?: string; userId: string; userName?: string; permission?: string; sharedAt?: string }>
): SharedEntityUser[] {
  return users.map(user => ({
    shareId: user.id,
    userId: user.userId,
    userName: user.userName,
    permission: user.permission || 'view',
    sharedAt: user.sharedAt
  }))
}

export const ShareWhiteboardDialog: React.FC<ShareWhiteboardDialogProps> = ({
  open,
  onOpenChange,
  whiteboardId,
  whiteboardTitle,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  accessToken,
  isOwner = false,
  currentUserPermission,
  onShareComplete,
  onManageAccess,
  'data-testid': testId = 'share-whiteboard-dialog'
}) => {
  const [sharedUsers, setSharedUsers] = React.useState<SharedEntityUser[]>([])

  const refreshShares = React.useCallback(async () => {
    if (!whiteboardId || !accessToken) return
    try {
      setSharedUsers(
        mapSharedUsers((await WhiteboardApiService.getSharedUsers(accessToken, whiteboardId)) as Array<any>)
      )
    } catch {
      setSharedUsers([])
    }
  }, [accessToken, whiteboardId])

  React.useEffect(() => {
    if (open) {
      void refreshShares()
    }
  }, [open, refreshShares])

  const sendNotifications = React.useCallback(
    (context: ShareNotificationContext) =>
      sendShareBlinkNotifications({
        ...context,
        entityType: 'whiteboard',
        appTag: 'whiteboard-share',
        titlePrefix: 'Whiteboard Shared',
        entityUrl: buildPlatformUrl('/platform/every-office/whiteboards', {
          whiteboardId
        })
      }),
    [whiteboardId]
  )

  return (
    <ShareEntityDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={whiteboardId}
      entityTitle={whiteboardTitle}
      entityType="whiteboard"
      accessToken={accessToken || ''}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      isOwner={isOwner}
      currentUserPermission={currentUserPermission}
      sharedUsers={sharedUsers}
      permissionOptions={WHITEBOARD_SHARE_PERMISSIONS}
      onShare={async recipients => {
        if (!accessToken) return false
        const groups = recipients.reduce<Record<WhiteboardPermission, string[]>>(
          (result, recipient) => {
            result[recipient.permission as WhiteboardPermission].push(recipient.userId)
            return result
          },
          { view: [], edit: [], comment: [], admin: [] }
        )

        const results = await Promise.all(
          Object.entries(groups).map(([permission, userIds]) =>
            userIds.length > 0
              ? WhiteboardApiService.shareMany(accessToken, whiteboardId, userIds, permission as WhiteboardPermission)
              : Promise.resolve(true)
          )
        )

        const success = results.every(Boolean)
        if (success) onShareComplete?.()
        return success
      }}
      onUnshare={shareId =>
        accessToken ? WhiteboardApiService.revokeShareById(accessToken, shareId) : Promise.resolve(false)
      }
      onRefreshShares={refreshShares}
      sendNotifications={sendNotifications}
      showShareMessage
      onManageAccess={onManageAccess}
      data-testid={testId}
    />
  )
}
