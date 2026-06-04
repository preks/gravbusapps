import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { ShareNetwork } from '@phosphor-icons/react'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import translations from '../_i18n'
import { useShareUsersEnrichment } from '../hooks/useShareUsersEnrichment'
import type { PermissionOption, ShareInviteRecipient, ShareNotificationContext, SharedEntityUser } from '../types'
import { getShareCapabilities } from '../shareCapabilities'
import { buildPermissionMap, filterShareResults, getEntityLabelKey, getShareIdentifier } from './shareEntityDialogUtils'
import { ShareEntityDialogInviteSection } from './ShareEntityDialogInviteSection'
import { ShareEntityDialogAccessSection } from './ShareEntityDialogAccessSection'
import { RemoveShareConfirmDialog } from './RemoveShareConfirmDialog'

export interface ShareEntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  entityTitle: string
  entityType: 'note' | 'spreadsheet_app' | 'slide' | 'document' | 'whiteboard'
  accessToken: string
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  isOwner: boolean
  currentUserPermission?: string
  sharedUsers: SharedEntityUser[]
  permissionOptions: PermissionOption[]
  onShare: (recipients: ShareInviteRecipient[]) => Promise<boolean>
  onUnshare: (shareId: string) => Promise<boolean>
  onRefreshShares: () => Promise<void>
  sendNotifications?: (context: ShareNotificationContext) => Promise<{ success: boolean; error?: string }>
  showShareMessage?: boolean
  onManageAccess?: () => void
  'data-testid'?: string
}

export const ShareEntityDialog: React.FC<ShareEntityDialogProps> = ({
  open,
  onOpenChange,
  entityId,
  entityTitle,
  entityType,
  accessToken,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isOwner,
  currentUserPermission,
  sharedUsers,
  permissionOptions,
  onShare,
  onUnshare,
  onRefreshShares,
  sendNotifications,
  showShareMessage = false,
  onManageAccess,
  'data-testid': testId = 'share-entity-dialog'
}) => {
  const { t } = useTranslation(translations)
  const entityLabel = t(getEntityLabelKey(entityType))
  const defaultPermission = permissionOptions[0]?.id ?? 'view'
  const permissionMap = useMemo(() => buildPermissionMap(permissionOptions), [permissionOptions])
  const capabilities = useMemo(
    () => getShareCapabilities({ isOwner, permission: currentUserPermission }),
    [currentUserPermission, isOwner]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<EmployeeLiteOption[]>([])
  const [selectedPermission, setSelectedPermission] = useState(defaultPermission)
  const [message, setMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [pendingRemovalUser, setPendingRemovalUser] = useState<SharedEntityUser | null>(null)
  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)
  const { owner, sharedUsers: resolvedSharedUsers } = useShareUsersEnrichment({
    accessToken,
    open,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    sharedUsers
  })

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedUsers([])
      setSelectedPermission(defaultPermission)
      setMessage('')
      setError(null)
      setSentSuccess(false)
      setSuccessMessage('')
      setPendingRemovalUser(null)
    }
  }, [defaultPermission, open])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchEmployees(searchQuery)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchEmployees, searchQuery])

  const filteredResults = useMemo(
    () =>
      filterShareResults({
        currentUserId,
        searchResults,
        selectedUsers,
        sharedUsers: resolvedSharedUsers
      }),
    [currentUserId, resolvedSharedUsers, searchResults, selectedUsers]
  )

  const toggleUser = useCallback((user: EmployeeLiteOption) => {
    setSelectedUsers(prev =>
      prev.some(selectedUser => selectedUser.userId === user.userId)
        ? prev.filter(selectedUser => selectedUser.userId !== user.userId)
        : [...prev, user]
    )
  }, [])

  const removeUser = useCallback((userId?: string) => {
    if (!userId) return
    setSelectedUsers(prev => prev.filter(user => user.userId !== userId))
  }, [])

  const handleShare = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError(t('share-error-select'))
      return
    }

    setIsSharing(true)
    setError(null)

    const recipients = selectedUsers.map<ShareInviteRecipient>(user => ({
      userId: user.userId,
      permission: selectedPermission
    }))

    try {
      const success = await onShare(recipients)
      if (!success) {
        setError(t('share-error-general', { entityLabel }))
        return
      }

      const nextSuccessMessage =
        selectedUsers.length === 1
          ? t('share-success-single', {
              name: selectedUsers[0]?.displayName || t('manage-user-generic'),
              entityLabel
            })
          : t('share-success-multi', {
              count: selectedUsers.length,
              entityLabel
            })

      if (sendNotifications) {
        await sendNotifications({
          accessToken,
          entityId,
          entityTitle,
          recipients: recipients.map(recipient => {
            const user = selectedUsers.find(entry => entry.userId === recipient.userId)
            return {
              ...recipient,
              userName: user?.displayName
            }
          }),
          initiatorId: currentUserId,
          initiatorName: currentUserName,
          message: showShareMessage ? message.trim() || undefined : undefined
        })
      }

      await onRefreshShares()
      setSuccessMessage(nextSuccessMessage)
      setSentSuccess(true)
      setSelectedUsers([])
      setSearchQuery('')
      window.setTimeout(() => onOpenChange(false), 1500)
    } catch {
      setError(t('share-error-general', { entityLabel }))
    } finally {
      setIsSharing(false)
    }
  }, [
    accessToken,
    currentUserId,
    currentUserName,
    entityId,
    entityLabel,
    entityTitle,
    message,
    onOpenChange,
    onRefreshShares,
    onShare,
    selectedPermission,
    selectedUsers,
    sendNotifications,
    showShareMessage,
    t
  ])

  const handleUnshare = useCallback(
    async (shareId?: string) => {
      if (!shareId) return
      const success = await onUnshare(shareId)
      if (success) {
        await onRefreshShares()
      }
    },
    [onRefreshShares, onShare, onUnshare]
  )

  const confirmUnshare = useCallback(async () => {
    const shareId = pendingRemovalUser ? getShareIdentifier(pendingRemovalUser) : undefined
    if (!shareId) return
    await handleUnshare(shareId)
    setPendingRemovalUser(null)
  }, [handleUnshare, pendingRemovalUser])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <ShareNetwork className="gba:h-5 gba:w-5" />
            {t('share-title', { title: entityTitle })}
          </DialogTitle>
          <DialogDescription>{t('share-description', { entityLabel })}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {capabilities.canManageSharing && (
            <ShareEntityDialogInviteSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              filteredResults={filteredResults}
              selectedUsers={selectedUsers}
              toggleUser={toggleUser}
              removeUser={removeUser}
              selectedPermission={selectedPermission}
              setSelectedPermission={setSelectedPermission}
              permissionOptions={permissionOptions}
              showShareMessage={showShareMessage}
              message={message}
              setMessage={setMessage}
              sentSuccess={sentSuccess}
              successMessage={successMessage}
              error={error}
              isSharing={isSharing}
              onShare={() => void handleShare()}
              testId={testId}
              t={t}
            />
          )}

          <ShareEntityDialogAccessSection
            owner={owner}
            resolvedSharedUsers={resolvedSharedUsers}
            permissionMap={permissionMap}
            canManageSharing={capabilities.canManageSharing}
            onRequestUnshare={setPendingRemovalUser}
            onManageAccess={onManageAccess}
            entityLabel={entityLabel}
            testId={testId}
            t={t}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-done-button`}>
            {t('share-done')}
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
          void confirmUnshare()
        }}
        t={t}
        data-testid={`${testId}-remove-share-confirm`}
      />
    </Dialog>
  )
}
