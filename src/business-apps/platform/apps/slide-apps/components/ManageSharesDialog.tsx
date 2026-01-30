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
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Users, Eye, Pencil, MessageSquare, Trash2, AlertCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { SlidesApiService } from '../services/SlidesApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  accessToken: string
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

/**
 * Format date to relative time
 */
const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      return 'Just now'
    }
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  const [shares, setShares] = useState<ShareWithUserInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null)
  const [removingShareId, setRemovingShareId] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (open && slideId) {
      loadShares()
    }
  }, [open, slideId, loadShares])

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
      setError(err instanceof Error ? err.message : 'Failed to load shares')
    } finally {
      setIsLoading(false)
    }
  }, [slideId, graphqlClient])

  const handleUpdatePermission = useCallback(
    async (shareId: string, newPermission: Permission) => {
      setUpdatingShareId(shareId)
      try {
        const ok = await SlidesApiService.updateSharePermission?.(slideId, shareId, newPermission)
        if (!ok) {
          throw new Error('Failed to update permission')
        }

        setShares(prev => prev.map(s => (s.id === shareId ? { ...s, permission: newPermission } : s)))
        toast.success('Permission updated')
        onSharesChanged?.()
      } catch (err) {
        console.error('[ManageSharesDialog] Failed to update permission:', err)
        toast.error('Failed to update permission')
      } finally {
        setUpdatingShareId(null)
      }
    },
    [slideId, onSharesChanged]
  )

  const handleRemoveShare = useCallback(
    async (shareId: string) => {
      if (!window.confirm('Remove access for this user?')) return

      setRemovingShareId(shareId)
      try {
        const ok = await SlidesApiService.revokeShareById?.(slideId, shareId)
        if (!ok) {
          throw new Error('Failed to remove share')
        }

        setShares(prev => prev.filter(s => s.id !== shareId))
        toast.success('User removed')
        onSharesChanged?.()
      } catch (err) {
        console.error('[ManageSharesDialog] Failed to remove share:', err)
        toast.error('Failed to remove user')
      } finally {
        setRemovingShareId(null)
      }
    },
    [slideId, onSharesChanged]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:w-5 gba:h-5" />
            Manage shares
          </DialogTitle>
          <DialogDescription>
            Manage who can access "{slideTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="gba:py-4">
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
              <p className="gba:text-muted-foreground gba:mb-2">Not shared with anyone yet</p>
              <p className="gba:text-sm gba:text-muted-foreground">Click "Add users" to share this presentation</p>
            </div>
          ) : (
            <div className="gba:space-y-2 gba:max-h-96 gba:overflow-y-auto">
              {shares.map(share => (
                <div
                  key={share.id}
                  className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/30 gba:border"
                  data-testid={`${testId}-share-${share.id}`}
                >
                  {share.isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <Avatar className="gba:w-10 gba:h-10">
                      {share.userAvatar && <AvatarImage src={share.userAvatar} />}
                      <AvatarFallback>{share.userName ? getInitials(share.userName) : '?'}</AvatarFallback>
                    </Avatar>
                  )}

                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:truncate">
                      {share.userName || `User ${share.userId.slice(0, 8)}`}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Shared {formatRelativeDate(share.sharedAt)}
                    </p>
                  </div>

                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Select
                      value={share.permission}
                      onValueChange={p => handleUpdatePermission(share.id, p as Permission)}
                      disabled={updatingShareId === share.id}
                    >
                      <SelectTrigger className="gba:w-32" data-testid={`${testId}-permission-${share.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Eye className="gba:w-3 gba:h-3" />
                            Can view
                          </div>
                        </SelectItem>
                        <SelectItem value="comment">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <MessageSquare className="gba:w-3 gba:h-3" />
                            Can comment
                          </div>
                        </SelectItem>
                        <SelectItem value="edit">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Pencil className="gba:w-3 gba:h-3" />
                            Can edit
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
                            onClick={() => handleRemoveShare(share.id)}
                            disabled={removingShareId === share.id}
                            data-testid={`${testId}-remove-${share.id}`}
                          >
                            {removingShareId === share.id ? <Spinner size="sm" /> : <Trash2 className="gba:w-4 gba:h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove user</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {onAddMoreUsers && (
            <Button variant="outlined" onClick={onAddMoreUsers} data-testid={`${testId}-add-users`}>
              <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add users
            </Button>
          )}
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ManageSharesDialog
