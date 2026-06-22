import React from 'react'
import {
  DOCUMENT_SHARE_PERMISSIONS,
  ShareEntityDialog,
  type SharedEntityUser
} from '@/business-apps/core/office/sharing'
import type { DocumentSharedUser } from '../hooks/useDocumentShareEnrichment'

export interface ShareDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  accessToken: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  isOwner: boolean
  currentUserPermission?: 'owner' | 'view' | 'edit' | 'comment' | 'admin'
  sharedUsers: DocumentSharedUser[]
  onShare: (shares: Array<{ userId: string; permission: 'view' | 'edit' | 'comment' | 'admin' }>) => Promise<boolean>
  onUnshare: (shareId: string) => Promise<boolean>
  onRefreshShares: () => Promise<void>
  onManageAccess?: () => void
  'data-testid'?: string
}

function mapSharedUsers(sharedUsers: DocumentSharedUser[]): SharedEntityUser[] {
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

export const ShareDocumentDialog: React.FC<ShareDocumentDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
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
  'data-testid': testId = 'share-document-dialog'
}) => {
  return (
    <ShareEntityDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={documentId}
      entityTitle={documentTitle}
      entityType="document"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      isOwner={isOwner}
      currentUserPermission={currentUserPermission}
      sharedUsers={mapSharedUsers(sharedUsers)}
      permissionOptions={DOCUMENT_SHARE_PERMISSIONS}
      onShare={recipients =>
        onShare(
          recipients.map(recipient => ({
            userId: recipient.userId,
            permission: recipient.permission as 'view' | 'edit' | 'comment' | 'admin'
          }))
        )
      }
      onUnshare={onUnshare}
      onRefreshShares={onRefreshShares}
      onManageAccess={onManageAccess}
      data-testid={testId}
    />
  )
}

export default ShareDocumentDialog
