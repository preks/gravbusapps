/**
 * ManageBoardSharesDialog - view / update / revoke board shares.
 * Mirrors the document app's ManageSharesDialog pattern.
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
import { BoardApiService } from '../services/BoardApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import type { BoardPermission, BoardShare } from '../types'

export interface ManageBoardSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  boardTitle: string
  accessToken: string
  onSharesChanged?: () => void
  onAddMoreUsers?: () => void
  'data-testid'?: string
}

interface ShareWithUserInfo extends BoardShare {
  userAvatar?: string
  isLoading?: boolean
}

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    return diffHours === 0 ? 'Just now' : `${diffHours}h ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const ManageBoardSharesDialog: React.FC<ManageBoardSharesDialogProps> = ({
  open,
  onOpenChange,
  boardId,
  boardTitle,
  accessToken,
  onSharesChanged,
  onAddMoreUsers,
  'data-testid': testId = 'manage-board-shares-dialog'
}) => {
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
      const rawShares = await BoardApiService.getBoardSharedUsers(boardId)

      const placeholder: ShareWithUserInfo[] = rawShares.map(s => ({
        ...s,
        userAvatar: undefined,
        isLoading: true
      }))
      setShares(placeholder)

      const userIds = rawShares.map(s => s.userId)
      if (userIds.length > 0 && graphqlClient) {
        const results = await Promise.all(
          userIds.map(async userId => {
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
            } catch {
              // fallback below
            }
            return { userId, displayName: undefined, pictureThumbnail: undefined }
          })
        )

        const infoMap = new Map(results.map(u => [u.userId, u]))
        setShares(prev =>
          prev.map(s => {
            const info = infoMap.get(s.userId)
            return {
              ...s,
              userName: info?.displayName || `User ${s.userId.slice(0, 8)}...`,
              userAvatar: info?.pictureThumbnail
                ? info.pictureThumbnail.startsWith('data:')
                  ? info.pictureThumbnail
                  : `data:image/png;base64,${info.pictureThumbnail}`
                : undefined,
              isLoading: false
            }
          })
        )
      }
    } catch {
      setError('Failed to load shared users')
    } finally {
      setIsLoading(false)
    }
  }, [boardId, graphqlClient])

  useEffect(() => {
    if (open && boardId) loadShares()
  }, [open, boardId, loadShares])

  const handleUpdatePermission = useCallback(
    async (shareId: string, newPermission: BoardPermission) => {
      setUpdatingShareId(shareId)
      try {
        const success = await BoardApiService.updateBoardSharePermission(shareId, newPermission)
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

  const handleRemoveShare = useCallback(
    async (shareId: string, userName: string) => {
      if (!confirm(`Remove access for ${userName}?`)) return
      setRemovingShareId(shareId)
      try {
        const success = await BoardApiService.revokeBoardShare(shareId)
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
          <DialogDescription>People who have access to &quot;{boardTitle}&quot;</DialogDescription>
        </DialogHeader>

        <div className="gba:py-4">
          {isLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="lg" />
            </div>
          )}

          {error && !isLoading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:bg-destructive/10 gba:text-destructive gba:rounded-md">
              <AlertCircle className="gba:w-5 gba:h-5" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && shares.length === 0 && (
            <div className="gba:text-center gba:py-8">
              <Users className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
              <p className="gba:text-muted-foreground gba:mb-4">This board hasn&apos;t been shared with anyone yet.</p>
              {onAddMoreUsers && (
                <Button onClick={onAddMoreUsers} variant="outline" data-testid={`${testId}-add-first`}>
                  <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                  Share with someone
                </Button>
              )}
            </div>
          )}

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
                    <Avatar className="gba:h-10 gba:w-10">
                      {share.userAvatar && <AvatarImage src={share.userAvatar} alt={share.userName || ''} />}
                      <AvatarFallback className="gba:text-sm">
                        {share.userName ? getInitials(share.userName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:font-medium gba:text-sm gba:truncate">
                        {share.isLoading ? <Spinner size="sm" /> : share.userName || 'Loading...'}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        Shared {formatRelativeDate(share.sharedAt)}
                      </p>
                    </div>
                    <Select
                      value={share.permission}
                      onValueChange={v => handleUpdatePermission(share.id, v as BoardPermission)}
                      disabled={updatingShareId === share.id}
                    >
                      <SelectTrigger className="gba:w-28 gba:h-8">
                        {updatingShareId === share.id ? <Spinner size="sm" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Eye className="gba:w-3 gba:h-3" /> View
                          </div>
                        </SelectItem>
                        <SelectItem value="comment">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <MessageSquare className="gba:w-3 gba:h-3" /> Comment
                          </div>
                        </SelectItem>
                        <SelectItem value="edit">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Pencil className="gba:w-3 gba:h-3" /> Edit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:hover:bg-destructive/10 gba:hover:text-destructive"
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
            <Button variant="outline" onClick={onAddMoreUsers} data-testid={`${testId}-add-more`}>
              <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add more
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} data-testid={`${testId}-done`}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
