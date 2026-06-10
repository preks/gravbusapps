import React from 'react'
import {
  createRestSharingAdapter,
  ManageEntitySharesDialog,
  WHITEBOARD_SHARE_PERMISSIONS
} from '@/business-apps/core/office/sharing'
import { WhiteboardApiService } from '../services/WhiteboardApiService'

type WhiteboardPermission = 'view' | 'edit' | 'comment' | 'admin'

interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  whiteboardId: string
  whiteboardTitle?: string
  accessToken: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  onSharesChanged?: () => void
  onAddMoreUsers?: () => void
  'data-testid'?: string
}

export const ManageSharesDialog: React.FC<ManageSharesDialogProps> = ({
  open,
  onOpenChange,
  whiteboardId,
  whiteboardTitle = 'Whiteboard',
  accessToken,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onSharesChanged,
  onAddMoreUsers,
  'data-testid': testId = 'manage-shares-dialog'
}) => {
  const adapter = React.useMemo(
    () =>
      createRestSharingAdapter({
        getSharedUsers: async entityId => {
          const shares = (await WhiteboardApiService.getSharedUsers(accessToken, entityId)) as Array<{
            id?: string
            userId: string
            permission?: string
            sharedAt?: string
          }>

          return shares.map(share => ({
            id: share.id || share.userId,
            userId: share.userId,
            permission: share.permission || 'view',
            sharedAt: share.sharedAt
          }))
        },
        updateSharePermission: (shareId, permission) =>
          WhiteboardApiService.updateSharePermission(accessToken, shareId, permission as WhiteboardPermission),
        revokeShare: shareId => WhiteboardApiService.revokeShareById(accessToken, shareId)
      }),
    [accessToken]
  )

  return (
    <ManageEntitySharesDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={whiteboardId}
      entityTitle={whiteboardTitle}
      entityType="whiteboard"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      permissionOptions={WHITEBOARD_SHARE_PERMISSIONS}
      adapter={adapter}
      onSharesChanged={onSharesChanged}
      onAddMoreUsers={onAddMoreUsers}
      data-testid={testId}
    />
  )
}
