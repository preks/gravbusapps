/**
 * ManageSharesDialog Component
 *
 * Dialog for viewing and managing document shares.
 * - Shows all users the document is shared with
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
  SelectValue
} from '@newwork/nw-design-system'
import { Users, Eye, Pencil, MessageSquare, Trash2, AlertCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { DocumentApiService } from '../services/DocumentApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import type { DocumentShare } from '../types'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  accessToken: string
  /** Callback when a share is added/removed/updated */
  onSharesChanged?: () => void
  /** Callback to open the share dialog to add more users */
  onAddMoreUsers?: () => void
  'data-testid'?: string
}

type Permission = 'view' | 'edit' | 'comment'

interface ShareWithUserInfo extends DocumentShare {
  id: string
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
  documentId,
  documentTitle,
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

  useEffect(() => {
    DocumentApiService.setAccessToken(accessToken || null)
  }, [accessToken])

  // GraphQL client for fetching user info
  const graphqlClient = useGraphQLClient(accessToken)

  /**
   * Fetch shares when dialog opens
   */
  useEffect(() => {
    if (open && documentId) {
      loadShares()
    }
  }, [open, documentId, loadShares])

  /**
   * Load shares and enrich with user info
   */
  const loadShares = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const rawShares = await DocumentApiService.getSharedUsers(documentId)

      // Set shares first (without user info)
      const sharesWithPlaceholder: ShareWithUserInfo[] = rawShares.map(s => ({
        ...s,
        userName: undefined,
        userAvatar: undefined,
        isLoading: true
      }))
      setShares(sharesWithPlaceholder)

      // Fetch user info for each share using GraphQL (in parallel)
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
          return { userId, displayName: undefined, pictureThumbnail: undefined }
        })

        const userInfoResults = await Promise.all(userInfoPromises)
        const userInfoMap = new Map(userInfoResults.map(u => [u.userId, u]))

        // Update shares with user info
        setShares(prev =>
          prev.map(s => {
            const userInfo = userInfoMap.get(s.userId)
            return {
              ...s,
              userName: userInfo?.displayName || `User ${s.userId.slice(0, 8)}...`,
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
      console.error('Failed to load shares:', err)
      setError('Failed to load shared users')
    } finally {
      setIsLoading(false)
    }
  }, [documentId, graphqlClient])

  /**
   * Update a share's permission
   */
  const handleUpdatePermission = useCallback(
    async (shareId: string, newPermission: Permission) => {
      setUpdatingShareId(shareId)

      try {
        const success = await DocumentApiService.updateSharePermission(shareId, newPermission)
        if (success) {
          setShares(prev => prev.map(s => (s.id === shareId ? { ...s, permission: newPermission } : s)))
          toast.success('Permission updated')
          onSharesChanged?.()
        } else {
          toast.error('Failed to update permission')
        }
      } catch {
        toast.error('Failed to update permission')
      } finally {
        setUpdatingShareId(null)
      }
    },
    [onSharesChanged]
  )

  /**
   * Remove a share
   */
  const handleRemoveShare = useCallback(
    async (shareId: string, userName: string) => {
      if (!confirm(`Remove access for ${userName}?`)) return

      setRemovingShareId(shareId)

      try {
        const success = await DocumentApiService.revokeShareById(shareId)
        if (success) {
          setShares(prev => prev.filter(s => s.id !== shareId))
          toast.success(`Removed access for ${userName}`)
          onSharesChanged?.()
        } else {
          toast.error('Failed to remove access')
        }
      } catch {
        toast.error('Failed to remove access')
      } finally {
        setRemovingShareId(null)
      }
    },
    [onSharesChanged]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:w-5 gba:h-5 gba:text-primary" />
            Manage Sharing
          </DialogTitle>
          <DialogDescription>People who have access to "{documentTitle}"</DialogDescription>
        </DialogHeader>

        <div className="gba:py-4">
          {/* Loading state */}
          {isLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="lg" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:bg-destructive/10 gba:text-destructive gba:rounded-md">
              <AlertCircle className="gba:w-5 gba:h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && shares.length === 0 && (
            <div className="gba:text-center gba:py-8">
              <Users className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
              <p className="gba:text-muted-foreground gba:mb-4">This document hasn't been shared with anyone yet.</p>
              {onAddMoreUsers && (
                <Button onClick={onAddMoreUsers} variant="outline">
                  <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                  Share with someone
                </Button>
              )}
            </div>
          )}

          {/* Shares list */}
          {!isLoading && shares.length > 0 && (
            <div className="gba:space-y-1">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
                {shares.length} {shares.length === 1 ? 'person has' : 'people have'} access
              </div>

              <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-80 gba:overflow-y-auto">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:group"
                    data-testid={`${testId}-share-${share.id}`}
                  >
                    {/* Avatar */}
                    <Avatar className="gba:h-10 gba:w-10">
                      {share.userAvatar && <AvatarImage src={share.userAvatar} alt={share.userName || ''} />}
                      <AvatarFallback className="gba:text-sm">
                        {share.userName ? getInitials(share.userName) : '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* User info */}
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <p className="gba:font-medium gba:text-sm gba:truncate">
                          {share.isLoading ? <Spinner size="sm" /> : share.userName || 'Loading...'}
                        </p>
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        Shared {formatRelativeDate(share.sharedAt)}
                      </p>
                    </div>

                    {/* Permission selector */}
                    <Select
                      value={share.permission}
                      onValueChange={v => handleUpdatePermission(share.id, v as Permission)}
                      disabled={updatingShareId === share.id}
                    >
                      <SelectTrigger className="gba:w-28 gba:h-8">
                        {updatingShareId === share.id ? <Spinner size="sm" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Eye className="gba:w-3 gba:h-3" />
                            <span>View</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="comment">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <MessageSquare className="gba:w-3 gba:h-3" />
                            <span>Comment</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="edit">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Pencil className="gba:w-3 gba:h-3" />
                            <span>Edit</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity hover:gba:bg-destructive/10 hover:gba:text-destructive"
                      onClick={() => handleRemoveShare(share.id, share.userName || 'this user')}
                      disabled={removingShareId === share.id}
                      data-testid={`${testId}-remove-${share.id}`}
                    >
                      {removingShareId === share.id ? <Spinner size="sm" /> : <Trash2 className="gba:w-4 gba:h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gba:gap-2">
          {onAddMoreUsers && shares.length > 0 && (
            <Button variant="outline" onClick={onAddMoreUsers}>
              <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add more
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ManageSharesDialog
