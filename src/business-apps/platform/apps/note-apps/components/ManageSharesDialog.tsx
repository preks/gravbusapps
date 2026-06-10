import React from 'react'
import {
  createRestSharingAdapter,
  ManageEntitySharesDialog,
  NOTE_SHARE_PERMISSIONS
} from '@/business-apps/core/office/sharing'
import { NoteApiService } from '../services/NoteApiService'
import type { NotePermission } from '../types'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string
  noteTitle: string
  accessToken: string
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  onSharesChanged?: () => void
  'data-testid'?: string
}

export const ManageSharesDialog: React.FC<ManageSharesDialogProps> = ({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  accessToken,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onSharesChanged,
  'data-testid': testId = 'manage-shares-dialog'
}) => {
  const adapter = React.useMemo(
    () =>
      createRestSharingAdapter({
        getSharedUsers: async entityId => {
          const shares = await NoteApiService.getSharedUsers(entityId)
          return shares.map(share => ({
            id: share.id,
            userId: share.userId,
            permission: share.permission,
            sharedAt: share.sharedAt
          }))
        },
        updateSharePermission: (shareId, permission) =>
          NoteApiService.updateSharePermission(shareId, permission as NotePermission),
        revokeShare: shareId => NoteApiService.revokeShareById(shareId)
      }),
    []
  )

  return (
    <ManageEntitySharesDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={noteId}
      entityTitle={noteTitle}
      entityType="note"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      permissionOptions={NOTE_SHARE_PERMISSIONS}
      adapter={adapter}
      onSharesChanged={onSharesChanged}
      data-testid={testId}
    />
  )
}

export default ManageSharesDialog
