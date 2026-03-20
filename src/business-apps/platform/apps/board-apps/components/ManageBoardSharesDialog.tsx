/**
 * ManageBoardSharesDialog - unified share management for boards.
 * Shows inherited collection members and direct shares with full CRUD.
 */

import React from 'react'
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
import type { BoardPermission } from '../types'
import { useBoardSharesData } from '../hooks/useBoardSharesData'
import { InheritedMembersSection } from './InheritedMembersSection'

export interface ManageBoardSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  boardTitle: string
  accessToken: string
  collectionId?: string | null
  collectionName?: string
  onSharesChanged?: () => void
  onAddMoreUsers?: () => void
  'data-testid'?: string
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
  collectionId,
  collectionName,
  onSharesChanged,
  onAddMoreUsers,
  'data-testid': testId = 'manage-board-shares-dialog'
}) => {
  const {
    shares,
    inheritedMembers,
    setInheritedMembers,
    isLoading,
    error,
    updatingShareId,
    removingShareId,
    overriddenUserIds,
    handleUpdatePermission,
    handleRemoveShare
  } = useBoardSharesData({ open, boardId, accessToken, collectionId, onSharesChanged })

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

          {!isLoading && !error && shares.length === 0 && inheritedMembers.length === 0 && (
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

          {!isLoading && (
            <InheritedMembersSection
              members={inheritedMembers}
              collectionId={collectionId}
              collectionName={collectionName}
              overriddenUserIds={overriddenUserIds}
              onMembersChanged={setInheritedMembers}
              onSharesChanged={onSharesChanged}
              data-testid={`${testId}-inherited`}
            />
          )}

          {!isLoading && shares.length > 0 && (
            <div className="gba:space-y-1">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
                {shares.length} direct {shares.length === 1 ? 'share' : 'shares'}
                {inheritedMembers.length > 0 && ' (overrides space permissions)'}
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

        <DialogFooter className="gba:flex gba:justify-between gba:gap-2">
          {onAddMoreUsers ? (
            <Button variant="outline" onClick={onAddMoreUsers} data-testid={`${testId}-add-more`}>
              <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Share with someone
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={() => onOpenChange(false)} data-testid={`${testId}-done`}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
