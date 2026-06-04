import React from 'react'
import {
  createRestSharingAdapter,
  ManageEntitySharesDialog,
  SPREADSHEET_SHARE_PERMISSIONS
} from '@/business-apps/core/office/sharing'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  appName: string
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
  appId,
  appName,
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
          const shares = await SpreadsheetApiService.getSharedUsers(entityId)
          return shares.map(share => ({
            id: share.id,
            userId: share.userId,
            permission: share.permission,
            sharedAt: share.sharedAt
          }))
        },
        updateSharePermission: (shareId, permission) =>
          SpreadsheetApiService.updateSharePermission(shareId, permission),
        revokeShare: shareId => SpreadsheetApiService.revokeShare(shareId)
      }),
    []
  )

  return (
    <ManageEntitySharesDialog
      open={open}
      onOpenChange={onOpenChange}
      entityId={appId}
      entityTitle={appName}
      entityType="spreadsheet_app"
      accessToken={accessToken}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      permissionOptions={SPREADSHEET_SHARE_PERMISSIONS}
      adapter={adapter}
      onSharesChanged={onSharesChanged}
      onAddMoreUsers={onAddMoreUsers}
      data-testid={testId}
    />
  )
}
