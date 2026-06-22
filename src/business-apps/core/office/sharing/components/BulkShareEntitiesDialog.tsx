import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { Files, ShareNetwork } from '@phosphor-icons/react'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { officeClient } from '@/common/network/office/OfficeClient'
import translations from '../_i18n'
import type { BulkShareEntity, BulkShareResult, PermissionOption, ShareInviteRecipient } from '../types'
import { ShareEntityDialogInviteSection } from './ShareEntityDialogInviteSection'
import { filterShareResults } from './shareEntityDialogUtils'

export interface BulkShareEntitiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUserId: string
  entities: BulkShareEntity[]
  permissionOptions: PermissionOption[]
  onShareComplete?: (result: BulkShareResult) => Promise<void> | void
  showShareMessage?: boolean
  'data-testid'?: string
}

export const BulkShareEntitiesDialog: React.FC<BulkShareEntitiesDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  currentUserId,
  entities,
  permissionOptions,
  onShareComplete,
  showShareMessage = false,
  'data-testid': testId = 'bulk-share-entities-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<EmployeeLiteOption[]>([])
  const [selectedPermission, setSelectedPermission] = useState(permissionOptions[0]?.id ?? 'view')
  const [message, setMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedUsers([])
      setSelectedPermission(permissionOptions[0]?.id ?? 'view')
      setMessage('')
      setError(null)
      setSentSuccess(false)
      setSuccessMessage('')
    }
  }, [open, permissionOptions])

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
        sharedUsers: []
      }),
    [currentUserId, searchResults, selectedUsers]
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

    officeClient.setAccessToken(accessToken)

    try {
      const result = await officeClient.createShareBatch<BulkShareResult>({
        entities: entities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId
        })),
        recipients,
        ...(showShareMessage && message.trim() ? { message: message.trim() } : {})
      })

      if (result.successCount === 0) {
        const firstError = result.results.find(entry => entry.error)?.error
        setError(firstError || t('share-bulk-error-all'))
        return
      }

      await onShareComplete?.(result)

      const nextSuccessMessage =
        result.failureCount === 0
          ? t('share-bulk-success-all', {
              items: result.successCount,
              people: selectedUsers.length
            })
          : t('share-bulk-success-partial', {
              successCount: result.successCount,
              failureCount: result.failureCount
            })

      setSuccessMessage(nextSuccessMessage)
      setSentSuccess(true)

      if (result.failureCount > 0) {
        const failedTitles = entities
          .filter(entity =>
            result.results.some(
              candidate =>
                candidate.entityType === entity.entityType &&
                candidate.entityId === entity.entityId &&
                !candidate.success
            )
          )
          .map(entity => entity.entityTitle)
          .slice(0, 3)

        setError(
          t('share-bulk-error-partial', {
            titles: failedTitles.join(', ')
          })
        )
      }

      window.setTimeout(() => onOpenChange(false), 1500)
    } catch {
      setError(t('share-bulk-error-all'))
    } finally {
      setIsSharing(false)
    }
  }, [
    accessToken,
    entities,
    message,
    onOpenChange,
    onShareComplete,
    selectedPermission,
    selectedUsers,
    showShareMessage,
    t
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <ShareNetwork className="gba:h-5 gba:w-5" />
            {t('share-bulk-title', { count: entities.length })}
          </DialogTitle>
          <DialogDescription>{t('share-bulk-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
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

          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <Files className="gba:h-4 gba:w-4" />
                {t('share-bulk-selected-items')}
              </Label>
              <Badge variant="secondary">{entities.length}</Badge>
            </div>

            <div className="gba:max-h-48 gba:overflow-y-auto gba:divide-y gba:rounded-lg gba:border">
              {entities.map(entity => (
                <div
                  key={`${entity.entityType}:${entity.entityId}`}
                  className="gba:flex gba:items-center gba:gap-3 gba:p-3"
                  data-testid={`${testId}-selected-${entity.entityId}`}
                >
                  <div className="gba:flex gba:h-9 gba:w-9 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-accent/50">
                    <Files className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  </div>
                  <p className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium">
                    {entity.entityTitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-done-button`}>
            {t('share-done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
