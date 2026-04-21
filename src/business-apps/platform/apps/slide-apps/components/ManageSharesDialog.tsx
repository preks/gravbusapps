/**
 * ManageSharesDialog Component
 *
 * Dialog for viewing and managing presentation shares.
 * - Shows all users the presentation is shared with
 * - Allows changing permissions
 * - Allows removing users
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Users, Eye, Pencil, MessageSquare, Trash2, AlertCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { SlidesApiService } from '../services/SlidesApiService'
import translations from '../_i18n'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  accessToken: string | undefined
  /** Callback when a share is added/removed/updated */
  onSharesChanged?: () => void
  /** Callback to open the share dialog to add more users */
  onAddMoreUsers?: () => void
  'data-testid'?: string
}

type Permission = 'view' | 'edit' | 'comment'

interface ShareWithUserInfo {
  id: string
  userId: string
  permission: Permission
  sharedAt: string
  userName?: string
  userAvatar?: string
  isLoading?: boolean
}

/**
 * Get user initials for avatar
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Create relative date formatter using t */
function createFormatRelativeDate(t: (key: string, vars?: Record<string, unknown>) => string) {
  return (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) return t('time-just-now')
      return t('time-hours-ago', { count: diffHours })
    }
    if (diffDays === 1) return t('time-yesterday')
    if (diffDays < 7) return t('time-days-short-ago', { count: diffDays })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

/**
 * ManageSharesDialog Component
 */
export const ManageSharesDialog: React.FC<ManageSharesDialogProps> = ({
  open,
  onOpenChange,
  slideId,
  slideTitle,
  accessToken,
  onSharesChanged,
  onAddMoreUsers,
  'data-testid': testId = 'manage-shares-dialog'
}) => {
  const { t } = useTranslation(translations)
  const formatRelativeDate = createFormatRelativeDate(t)
  const [shares, setShares] = useState<ShareWithUserInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null)
  const [removingShareId, setRemovingShareId] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadShares = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const rawShares = await SlidesApiService.getSharedUsers(slideId)

      const sharesWithPlaceholder: ShareWithUserInfo[] = rawShares.map((s, idx) => ({
        id: s.id || `${s.userId}-${idx}`,
        userId: s.userId,
        permission: s.permission as Permission,
        sharedAt: s.sharedAt || new Date().toISOString(),
        userName: undefined,
        userAvatar: undefined,
        isLoading: true
      }))
      setShares(sharesWithPlaceholder)

      const userIds = rawShares.map(s => s.userId)
      if (userIds.length > 0 && graphqlClient) {
        const userInfoPromises = userIds.map(async userId => {
          try {
            const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
            const result = await graphqlClient.request<{
              Employee: Array<{
                id: string
                displayName: string
                firstName?: string
                lastName?: string
                userId: string
                pictureThumbnail?: string
              }>
            }>(query)

            const emp = result.Employee?.[0]
            if (emp) {
              return {
                userId,
                displayName: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                pictureThumbnail: emp.pictureThumbnail
              }
            }
          } catch (e) {
            console.error('Failed to fetch user info via GraphQL:', e)
          }
          return {
            userId,
            displayName: `User ${userId.slice(0, 8)}`,
            pictureThumbnail: undefined
          }
        })

        const userInfoResults = await Promise.all(userInfoPromises)

        const userInfoMap = new Map(userInfoResults.map(u => [u.userId, u]))

        setShares(prev =>
          prev.map(s => {
            const userInfo = userInfoMap.get(s.userId)
            return {
              ...s,
              userName: userInfo?.displayName,
              userAvatar: userInfo?.pictureThumbnail
                ? userInfo.pictureThumbnail.startsWith('data:')
                  ? userInfo.pictureThumbnail
                  : `data:image/png;base64,${userInfo.pictureThumbnail}`
                : undefined,
              isLoading: false
            }
          })
        )
      }
    } catch (err) {
      console.error('[ManageSharesDialog] Failed to load shares:', err)
      setError(err instanceof Error ? err.message : t('manage-load-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [slideId, graphqlClient, t])

  useEffect(() => {
    if (open && slideId) {
      loadShares()
    }
  }, [open, slideId, loadShares])

  const handleUpdatePermission = useCallback(
    async (shareId: string, newPermission: Permission) => {
      setUpdatingShareId(shareId)
      try {
        const ok = await SlidesApiService.updateSharePermission?.(slideId, shareId, newPermission)
        if (!ok) {
          throw new Error(t('manage-permission-update-failed'))
        }

        setShares(prev => prev.map(s => (s.id === shareId ? { ...s, permission: newPermission } : s)))
        toast.success(t('manage-permission-updated'))
        onSharesChanged?.()
      } catch (err) {
        console.error('[ManageSharesDialog] Failed to update permission:', err)
        toast.error(t('manage-permission-update-failed'))
      } finally {
        setUpdatingShareId(null)
      }
    },
    [slideId, onSharesChanged, t]
  )

  const handleRemoveShare = useCallback(
    async (shareId: string) => {
      if (!window.confirm(t('manage-confirm-remove'))) return

      setRemovingShareId(shareId)
      try {
        const ok = await SlidesApiService.revokeShareById?.(slideId, shareId)
        if (!ok) {
          throw new Error(t('manage-remove-failed'))
        }

        setShares(prev => prev.filter(s => s.id !== shareId))
        toast.success(t('manage-user-removed'))
        onSharesChanged?.()
      } catch (err) {
        console.error('[ManageSharesDialog] Failed to remove share:', err)
        toast.error(t('manage-remove-failed'))
      } finally {
        setRemovingShareId(null)
      }
    },
    [slideId, onSharesChanged, t]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-lg gba:max-h-[90vh] gba:flex gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:w-5 gba:h-5" />
            {t('manage-title')}
          </DialogTitle>
          <DialogDescription>{t('manage-description', { title: slideTitle })}</DialogDescription>
        </DialogHeader>

        <div className="gba:py-2 gba:overflow-y-auto gba:flex-1 gba:-mx-6 gba:px-6">
          {error && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive gba:mb-4">
              <AlertCircle className="gba:w-4 gba:h-4 gba:shrink-0" />
              <span className="gba:text-sm">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner size="lg" />
            </div>
          ) : shares.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:text-center">
              <Users className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mb-4" />
              <p className="gba:text-muted-foreground gba:mb-2">{t('manage-not-shared')}</p>
              <p className="gba:text-sm gba:text-muted-foreground">{t('manage-add-users-hint')}</p>
            </div>
          ) : (
            <div className="gba:border gba:rounded-md gba:divide-y">
              {shares.map(share => (
                <div
                  key={share.id}
                  className="gba:flex gba:items-center gba:gap-2 gba:p-2"
                  data-testid={`${testId}-share-${share.id}`}
                >
                  <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                    {share.userAvatar && <AvatarImage src={share.userAvatar} />}
                    <AvatarFallback className="gba:text-xs">
                      {share.isLoading ? <Spinner size="sm" /> : share.userName ? getInitials(share.userName) : '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:truncate">
                      {share.userName || `User ${share.userId.slice(0, 8)}`}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {t('manage-shared-at', { time: formatRelativeDate(share.sharedAt) })}
                    </p>
                  </div>

                  <Select
                    value={share.permission}
                    onValueChange={p => handleUpdatePermission(share.id, p as Permission)}
                    disabled={updatingShareId === share.id}
                  >
                    <SelectTrigger
                      size="sm"
                      className="gba:flex-shrink-0"
                      data-testid={`${testId}-permission-${share.id}`}
                    >
                      {updatingShareId === share.id ? <Spinner size="sm" /> : <SelectValue />}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Eye className="gba:w-3 gba:h-3" />
                          {t('manage-can-view')}
                        </div>
                      </SelectItem>
                      <SelectItem value="comment">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <MessageSquare className="gba:w-3 gba:h-3" />
                          {t('manage-can-comment')}
                        </div>
                      </SelectItem>
                      <SelectItem value="edit">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Pencil className="gba:w-3 gba:h-3" />
                          {t('manage-can-edit')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="gba:h-8 gba:w-8 gba:flex-shrink-0 hover:gba:bg-destructive/10 hover:gba:text-destructive"
                          onClick={() => handleRemoveShare(share.id)}
                          disabled={removingShareId === share.id}
                          data-testid={`${testId}-remove-${share.id}`}
                        >
                          {removingShareId === share.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="gba:w-4 gba:h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('manage-remove-user')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {onAddMoreUsers && (
            <Button variant="outlined" onClick={onAddMoreUsers} data-testid={`${testId}-add-users`}>
              <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('manage-add-users')}
            </Button>
          )}
          <Button variant="default" onClick={() => onOpenChange(false)}>
            {t('manage-done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ManageSharesDialog
