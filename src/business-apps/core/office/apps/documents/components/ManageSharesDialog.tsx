import React from 'react'
import {
  createRestSharingAdapter,
  DOCUMENT_SHARE_PERMISSIONS,
  ManageEntitySharesDialog
} from '@/business-apps/core/office/sharing'
import { DocumentApiService } from '../services/DocumentApiService'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  accessToken: string
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
  documentId,
  documentTitle,
  accessToken,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onSharesChanged,
  onAddMoreUsers,
  'data-testid': testId = 'manage-shares-dialog'
}) => {
  React.useEffect(() => {
    DocumentApiService.setAccessToken(accessToken)
  }, [accessToken])

  const adapter = React.useMemo(
    () =>
      createRestSharingAdapter({
        getSharedUsers: async entityId => {
          const shares = await DocumentApiService.getSharedUsers(entityId)
          return shares.map(share => ({
            id: share.id,
            userId: share.userId,
            permission: share.permission,
            sharedAt: share.sharedAt
          }))
        },
        updateSharePermission: (shareId, permission) =>
          DocumentApiService.updateSharePermission(shareId, permission as 'view' | 'edit' | 'comment' | 'admin'),
        revokeShare: shareId => DocumentApiService.revokeShareById(shareId)
      }),
    []
  )

  return (
    <ManageEntitySharesDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={documentId}
      entityTitle={documentTitle}
      entityType="document"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      permissionOptions={DOCUMENT_SHARE_PERMISSIONS}
      adapter={adapter}
      onSharesChanged={onSharesChanged}
      onAddMoreUsers={onAddMoreUsers}
      data-testid={testId}
    />
  )
}

export default ManageSharesDialog
