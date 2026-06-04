import React, { useCallback, useEffect, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { Trash, UserPlus, UsersThree } from '@phosphor-icons/react'
import { toast } from 'sonner'
import translations from '../_i18n'
import { useShareUsersEnrichment } from '../hooks/useShareUsersEnrichment'
import type { EntitySharingAdapter, PermissionOption, SharedEntityUser } from '../types'
import { formatRelativeDate, getEntityLabelKey, getInitials } from './shareEntityDialogUtils'
import { RemoveShareConfirmDialog } from './RemoveShareConfirmDialog'

export interface ManageEntitySharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  entityTitle: string
  entityType: 'note' | 'spreadsheet_app' | 'slide' | 'document' | 'whiteboard'
  accessToken: string | undefined
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  permissionOptions: PermissionOption[]
  adapter: EntitySharingAdapter
  onSharesChanged?: () => void
  onAddMoreUsers?: () => void
  'data-testid'?: string
}

export const ManageEntitySharesDialog: React.FC<ManageEntitySharesDialogProps> = ({
  open,
  onOpenChange,
  entityId,
  entityTitle,
  entityType,
  accessToken,
  currentUserId = '',
  currentUserName,
  currentUserAvatar,
  permissionOptions,
  adapter,
  onSharesChanged,
  onAddMoreUsers,
  'data-testid': testId = 'manage-entity-shares-dialog'
}) => {
  const { t } = useTranslation(translations)
  const entityLabel = t(getEntityLabelKey(entityType))
  const [sharedUsers, setSharedUsers] = useState<SharedEntityUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null)
  const [removingShareId, setRemovingShareId] = useState<string | null>(null)
  const [pendingRemovalUser, setPendingRemovalUser] = useState<SharedEntityUser | null>(null)
  const { sharedUsers: resolvedSharedUsers } = useShareUsersEnrichment({
    accessToken: accessToken || '',
    open,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    sharedUsers
  })

  const loadShares = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const results = await adapter.getSharedUsers(entityId)
      setSharedUsers(
        results.map(share => ({
          shareId: share.id,
          userId: share.userId,
          permission: share.permission,
          sharedAt: share.sharedAt
        }))
      )
    } catch {
      setError(t('manage-load-failed'))
      setSharedUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [adapter, entityId, t])

  useEffect(() => {
    if (open && entityId) {
      void loadShares()
    }
  }, [entityId, loadShares, open])

  const handlePermissionChange = useCallback(
    async (shareId: string, permission: string) => {
      setUpdatingShareId(shareId)
      try {
        const success = await adapter.updateSharePermission(shareId, permission)
        if (!success) throw new Error('update-failed')
        setSharedUsers(prev => prev.map(user => (user.shareId === shareId ? { ...user, permission } : user)))
        toast.success(t('manage-update-success'))
        try {
          onSharesChanged?.()
        } catch (error) {
          console.warn('[ManageEntitySharesDialog] Permission updated but parent refresh failed:', error)
        }
      } catch {
        toast.error(t('manage-update-failed'))
      } finally {
        setUpdatingShareId(null)
      }
    },
    [adapter, onSharesChanged, t]
  )

  const handleRemove = useCallback(
    async (user: SharedEntityUser) => {
      if (!user.shareId) return

      setRemovingShareId(user.shareId)
      try {
        const success = await adapter.revokeShare(user.shareId)
        if (!success) throw new Error('remove-failed')
        setSharedUsers(prev => prev.filter(entry => entry.shareId !== user.shareId))
        toast.success(t('manage-remove-success'))
        try {
          onSharesChanged?.()
        } catch (error) {
          console.warn('[ManageEntitySharesDialog] Share removed but parent refresh failed:', error)
        }
      } catch {
        toast.error(t('manage-remove-failed'))
      } finally {
        setRemovingShareId(null)
      }
    },
    [adapter, onSharesChanged, t]
  )

  const confirmRemove = useCallback(async () => {
    if (!pendingRemovalUser) return
    await handleRemove(pendingRemovalUser)
    setPendingRemovalUser(null)
  }, [handleRemove, pendingRemovalUser])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-lg gba:max-h-[90vh] gba:flex gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <UsersThree className="gba:h-5 gba:w-5" />
            {t('manage-title')}
          </DialogTitle>
          <DialogDescription>{t('manage-description', { title: entityTitle })}</DialogDescription>
        </DialogHeader>

        <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto">
          {isLoading && (
            <div className="gba:flex gba:justify-center gba:py-8" data-testid={`${testId}-loading`}>
              <Spinner />
            </div>
          )}
          {!isLoading && error && (
            <div
              className="gba:rounded-md gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive"
              data-testid={`${testId}-error`}
            >
              {error}
            </div>
          )}
          {!isLoading && !error && resolvedSharedUsers.length === 0 && (
            <div
              className="gba:rounded-md gba:border gba:border-dashed gba:p-4 gba:text-sm gba:text-muted-foreground"
              data-testid={`${testId}-empty`}
            >
              {t('manage-not-shared', { entityLabel })}
            </div>
          )}
          {!isLoading &&
            !error &&
            resolvedSharedUsers.map(user => {
              return (
                <div
                  key={user.shareId || user.userId}
                  className="gba:flex gba:items-center gba:gap-3 gba:rounded-md gba:border gba:p-3"
                  data-testid={`${testId}-user-${user.userId}`}
                >
                  <Avatar className="gba:h-9 gba:w-9">
                    {user.userAvatar && <AvatarImage src={user.userAvatar} />}
                    <AvatarFallback>{getInitials(user.userName || user.userEmail || '?')}</AvatarFallback>
                  </Avatar>
                  <div className="gba:min-w-0 gba:flex-1">
                    <div className="gba:font-medium">{user.userName || user.userEmail || ''}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {user.sharedAt ? t('manage-shared-at', { date: formatRelativeDate(user.sharedAt, t) }) : ''}
                    </div>
                  </div>
                  <Select
                    value={user.permission}
                    onValueChange={value => void handlePermissionChange(user.shareId || '', value)}
                    disabled={updatingShareId === user.shareId}
                  >
                    <SelectTrigger className="gba:w-36" data-testid={`${testId}-permission-${user.userId}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingRemovalUser(user)}
                    disabled={removingShareId === user.shareId}
                    aria-label={t('manage-remove-user')}
                    data-testid={`${testId}-remove-${user.userId}`}
                  >
                    <Trash className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
              )
            })}
        </div>

        <DialogFooter className="gba:justify-between">
          <div>
            {onAddMoreUsers && (
              <Button type="button" variant="outline" onClick={onAddMoreUsers} data-testid={`${testId}-add-users`}>
                <UserPlus className="gba:mr-2 gba:h-4 gba:w-4" />
                {t('manage-add-users')}
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-done`}>
            {t('manage-done')}
          </Button>
        </DialogFooter>
      </DialogContent>
      <RemoveShareConfirmDialog
        open={pendingRemovalUser !== null}
        onOpenChange={open => {
          if (!open) setPendingRemovalUser(null)
        }}
        userName={pendingRemovalUser?.userName || pendingRemovalUser?.userEmail || t('manage-user-generic')}
        onConfirm={() => {
          void confirmRemove()
        }}
        isSubmitting={Boolean(pendingRemovalUser?.shareId && removingShareId === pendingRemovalUser.shareId)}
        t={t}
        data-testid={`${testId}-remove-share-confirm`}
      />
    </Dialog>
  )
}
