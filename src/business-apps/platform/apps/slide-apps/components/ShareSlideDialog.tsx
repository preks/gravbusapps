import React from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  ShareEntityDialog,
  SLIDE_SHARE_PERMISSIONS,
  sendShareBlinkNotifications,
  type ShareNotificationContext,
  type SharedEntityUser
} from '@/business-apps/core/office/sharing'
import { SlidesApiService } from '../services/SlidesApiService'

type SlidePermission = 'view' | 'edit' | 'comment' | 'admin'

export interface ShareSlideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  accessToken: string | undefined
  isOwner?: boolean
  currentUserPermission?: 'view' | 'edit' | 'comment' | 'owner' | 'admin'
  shareSlide: (id: string, userIds: string[], permission: SlidePermission) => Promise<boolean>
  onShareComplete?: () => void
  'data-testid'?: string
}

function mapSharedUsers(
  users: Array<{
    id: string
    userId: string
    userName?: string
    userAvatar?: string
    permission: string
    sharedAt: string
  }>
): SharedEntityUser[] {
  return users.map(user => ({
    shareId: user.id,
    userId: user.userId,
    userName: user.userName,
    userAvatar: user.userAvatar,
    permission: user.permission,
    sharedAt: user.sharedAt
  }))
}

export const ShareSlideDialog: React.FC<ShareSlideDialogProps> = ({
  open,
  onOpenChange,
  slideId,
  slideTitle,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  accessToken,
  isOwner = false,
  currentUserPermission,
  shareSlide,
  onShareComplete,
  'data-testid': testId = 'share-slide-dialog'
}) => {
  const [sharedUsers, setSharedUsers] = React.useState<SharedEntityUser[]>([])

  const refreshShares = React.useCallback(async () => {
    if (!slideId) return
    try {
      setSharedUsers(mapSharedUsers(await SlidesApiService.getSharedUsers(slideId)))
    } catch {
      setSharedUsers([])
    }
  }, [slideId])

  React.useEffect(() => {
    if (open) {
      void refreshShares()
    }
  }, [open, refreshShares])

  const sendNotifications = React.useCallback(
    (context: ShareNotificationContext) =>
      sendShareBlinkNotifications({
        ...context,
        entityType: 'slide',
        appTag: 'slide-share',
        titlePrefix: 'Slide Shared',
        entityUrl: buildPlatformUrl('/platform/every-office/slides', {
          slideId,
          view: 'editor'
        })
      }),
    [slideId]
  )

  return (
    <ShareEntityDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={slideId}
      entityTitle={slideTitle}
      entityType="slide"
      accessToken={accessToken || ''}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      isOwner={isOwner}
      currentUserPermission={currentUserPermission}
      sharedUsers={sharedUsers}
      permissionOptions={SLIDE_SHARE_PERMISSIONS}
      onShare={async recipients => {
        const success = await shareSlide(
          slideId,
          recipients.map(recipient => recipient.userId),
          (recipients[0]?.permission || 'view') as SlidePermission
        )
        if (success) onShareComplete?.()
        return success
      }}
      onUnshare={shareId => SlidesApiService.revokeShareById(slideId, shareId)}
      onRefreshShares={refreshShares}
      sendNotifications={sendNotifications}
      showShareMessage
      data-testid={testId}
    />
  )
}

export default ShareSlideDialog
