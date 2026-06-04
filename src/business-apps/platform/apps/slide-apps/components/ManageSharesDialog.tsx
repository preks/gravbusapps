import React from 'react'
import {
  createRestSharingAdapter,
  ManageEntitySharesDialog,
  SLIDE_SHARE_PERMISSIONS
} from '@/business-apps/core/office/sharing'
import { SlidesApiService } from '../services/SlidesApiService'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  accessToken: string | undefined
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  onSharesChanged?: () => void
  onAddMoreUsers?: () => void
  'data-testid'?: string
}

export const ManageSharesDialog: React.FC<ManageSharesDialogProps> = ({
  open,
  onOpenChange,
  slideId,
  slideTitle,
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
          const shares = await SlidesApiService.getSharedUsers(entityId, { throwOnError: true })
          return shares.map(share => ({
            id: share.id,
            userId: share.userId,
            permission: share.permission,
            sharedAt: share.sharedAt
          }))
        },
        updateSharePermission: (shareId, permission) =>
          SlidesApiService.updateSharePermission(slideId, shareId, permission),
        revokeShare: shareId => SlidesApiService.revokeShareById(slideId, shareId)
      }),
    [slideId]
  )

  return (
    <ManageEntitySharesDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={slideId}
      entityTitle={slideTitle}
      entityType="slide"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      permissionOptions={SLIDE_SHARE_PERMISSIONS}
      adapter={adapter}
      onSharesChanged={onSharesChanged}
      onAddMoreUsers={onAddMoreUsers}
      data-testid={testId}
    />
  )
}

export default ManageSharesDialog
