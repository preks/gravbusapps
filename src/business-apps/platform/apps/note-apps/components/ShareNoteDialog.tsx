import React from 'react'
import { NOTE_SHARE_PERMISSIONS, ShareEntityDialog, type SharedEntityUser } from '@/business-apps/core/office/sharing'
import type { NotePermission } from '../types'

export interface SharedNoteUser {
  shareId?: string
  userId: string
  userName: string
  userEmail?: string
  userAvatar?: string
  permission: NotePermission
  sharedAt?: string
}

export interface ShareNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string
  noteTitle: string
  accessToken: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  isOwner: boolean
  currentUserPermission?: NotePermission | 'owner'
  sharedUsers: SharedNoteUser[]
  onShare: (userIds: string[], permission: NotePermission) => Promise<boolean>
  onUnshare: (userId: string, shareId?: string) => Promise<boolean>
  onRefreshShares: () => Promise<void>
  onManageAccess?: () => void
  'data-testid'?: string
}

function mapSharedUsers(sharedUsers: SharedNoteUser[]): SharedEntityUser[] {
  return sharedUsers.map(user => ({
    shareId: user.shareId,
    userId: user.userId,
    userName: user.userName,
    userEmail: user.userEmail,
    userAvatar: user.userAvatar,
    permission: user.permission,
    sharedAt: user.sharedAt
  }))
}

export const ShareNoteDialog: React.FC<ShareNoteDialogProps> = ({
  open,
  onOpenChange,
  noteId,
  noteTitle,
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
  'data-testid': testId = 'share-note-dialog'
}) => {
  return (
    <ShareEntityDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={noteId}
      entityTitle={noteTitle}
      entityType="note"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      isOwner={isOwner}
      currentUserPermission={currentUserPermission}
      sharedUsers={mapSharedUsers(sharedUsers)}
      permissionOptions={NOTE_SHARE_PERMISSIONS}
      onShare={async recipients =>
        onShare(
          recipients.map(recipient => recipient.userId),
          recipients[0]?.permission as NotePermission
        )
      }
      onUnshare={shareId => onUnshare('', shareId)}
      onRefreshShares={onRefreshShares}
      onManageAccess={onManageAccess}
      data-testid={testId}
    />
  )
}

export default ShareNoteDialog
