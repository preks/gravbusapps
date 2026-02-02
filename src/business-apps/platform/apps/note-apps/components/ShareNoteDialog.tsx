/**
 * Share Note Dialog Component
 *
 * Allows users to share notes with other users and manage existing shares.
 * Matches the spreadsheet sharing UX.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox
} from '@newwork/nw-design-system'
import { Share2, Users, X, Search, Trash2, Eye, Pencil, MessageSquare, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { env } from '@/common/env/EnvUtils'
import { getCanonicalContentUrl } from '@/common/utils/navigationUtils'
import type { NotePermission } from '../types'
import { useShareUsersEnrichment } from '../hooks/useShareUsersEnrichment'

export interface SharedNoteUser {
  shareId?: string
  userId: string
  userName: string
  userEmail?: string
  userAvatar?: string
  permission: NotePermission
  sharedAt?: string
}

export interface ShareNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string
  noteTitle: string
  accessToken: string
  currentUserId: string
  currentUserName?: string
  isOwner: boolean
  sharedUsers: SharedNoteUser[]
  onShare: (userIds: string[], permission: NotePermission) => Promise<boolean>
  onUnshare: (userId: string, shareId?: string) => Promise<boolean>
  onRefreshShares: () => Promise<void>
  'data-testid'?: string
}

/**
 * Permission icons and labels
 */
const PERMISSION_CONFIG: Record<NotePermission, { icon: React.ElementType; label: string; description: string }> = {
  view: {
    icon: Eye,
    label: 'Can View',
    description: 'Can view but not make changes'
  },
  comment: {
    icon: MessageSquare,
    label: 'Can Comment',
    description: 'Can view and add comments'
  },
  edit: {
    icon: Pencil,
    label: 'Can Edit',
    description: 'Can view and edit content'
  },
  owner: {
    icon: Share2,
    label: 'Owner',
    description: 'Full access including sharing'
  }
}

/**
 * Helper function to create standard assignment targets structure
 */
const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

/**
 * Send Blink notifications to users when sharing a note
 */
const sendBlinkNotifications = async (
  accessToken: string,
  payload: {
    noteTitle: string
    noteId: string
    assigneeUserIds: string[]
    initiatorId: string
    initiatorName?: string
  }
): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const timestamp = Date.now()
    const blinkGroupId = `blink_group_${timestamp}_${payload.initiatorId}`

    const workflowIds: string[] = []

    // Build the note URL using canonical URL
    const noteUrl = getCanonicalContentUrl('note', { noteId: payload.noteId, view: 'editor' })

    for (const userId of payload.assigneeUserIds) {
      const entityLink = {
        name: payload.noteTitle || 'Untitled Note',
        url: `${globalThis.location?.origin || ''}${noteUrl}`,
        type: 'entity:note',
        metadata: {
          entityType: 'note',
          entityId: payload.noteId
        }
      }

      const tags: Record<string, string> = {
        app: 'quick-task',
        blinkGroupId,
        assignedUserId: userId,
        entityType: 'note',
        entityId: payload.noteId,
        entityName: payload.noteTitle || 'Untitled Note',
        entityDisplayUrl: noteUrl
      }

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Note Shared: ${payload.noteTitle}`,
          description: `Quick Task: Note Shared: ${payload.noteTitle}`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Note Shared: ${payload.noteTitle}`,
              message: `${payload.initiatorName || 'Someone'} shared the note "${payload.noteTitle}" with you. Click the link below to open it.`,
              form: [],
              links: [entityLink],
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: null,
                allowReassignment: false
              },
              dueInMinutes: 4320
            }
          ],
          tags
        },
        initiatorId: payload.initiatorId,
        stepAssignments: {
          step_0: {
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: createAssignmentTargets([userId]),
              allowReassignment: false
            }
          }
        }
      }

      const response = await fetch(`${baseUrl}/api/templates/execute-dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        throw new Error(`Failed to create blink: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.data?.workflowId) {
        workflowIds.push(data.data.workflowId)
      }
    }

    return { success: true, count: workflowIds.length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send blink' }
  }
}

export const ShareNoteDialog: React.FC<ShareNoteDialogProps> = ({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  accessToken,
  currentUserId,
  currentUserName,
  isOwner,
  sharedUsers,
  onShare,
  onUnshare,
  onRefreshShares,
  'data-testid': testId = 'share-note-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPermission, setSelectedPermission] = useState<NotePermission>('view')
  const [isSharing, setIsSharing] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<EmployeeLiteOption[]>([])
  const [sentSuccess, setSentSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Employee search
  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)

  const { owner, sharedUsers: resolvedSharedUsers } = useShareUsersEnrichment({
    accessToken,
    open,
    currentUserId,
    currentUserName,
    sharedUsers
  })

  // Trigger search when search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEmployees(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchEmployees])

  // Filter out already shared users, selected users, and current user
  const filteredResults = useMemo(() => {
    if (!searchResults || !Array.isArray(searchResults)) {
      return []
    }

    const currentResolvedSharedUsers = resolvedSharedUsers || []
    const currentSelectedUsers = selectedUsers || []

    const safeSelectedUsers = Array.isArray(currentSelectedUsers) ? currentSelectedUsers : []
    const safeResolvedSharedUsers = Array.isArray(currentResolvedSharedUsers) ? currentResolvedSharedUsers : []

    const selectedIds = new Set(safeSelectedUsers.map(u => u.userId))
    const sharedIds = new Set(safeResolvedSharedUsers.map(u => u.userId))

    return searchResults.filter(
      emp => emp.userId !== currentUserId && !sharedIds.has(emp.userId) && !selectedIds.has(emp.userId)
    )
  }, [searchResults, selectedUsers, resolvedSharedUsers, currentUserId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedUsers([])
      setSelectedPermission('view')
      setError(null)
      setSentSuccess(false)
    }
  }, [open])

  /**
   * Toggle user selection
   */
  const toggleUser = useCallback((user: EmployeeLiteOption) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.userId === user.userId)
      if (exists) {
        return prev.filter(u => u.userId !== user.userId)
      } else {
        return [...prev, user]
      }
    })
  }, [])

  /**
   * Remove user from selection
   */
  const removeUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.userId !== userId))
  }, [])

  /**
   * Handle sharing with selected users
   */
  const handleShare = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to share with')
      return
    }

    setIsSharing(true)
    setError(null)

    try {
      const userIds = selectedUsers.map(u => u.userId || u.id).filter(Boolean) as string[]
      const success = await onShare(userIds, selectedPermission)

      if (success) {
        // Send Blink notifications
        const assigneeUserIds = selectedUsers.map(u => u.userId || u.id).filter(Boolean) as string[]
        if (assigneeUserIds.length > 0) {
          const blinkResult = await sendBlinkNotifications(accessToken, {
            noteTitle: noteTitle || 'Untitled Note',
            noteId,
            assigneeUserIds,
            initiatorId: currentUserId,
            initiatorName: owner.name
          })

          if (!blinkResult.success) {
            console.warn('[ShareNoteDialog] Failed to send Blink notifications:', blinkResult.error)
          }
        }

        setSentSuccess(true)
        setSelectedUsers([])
        setSearchQuery('')
        await onRefreshShares()

        const count = selectedUsers.length
        toast.success(`Shared "${noteTitle || 'Untitled Note'}" with ${count} ${count === 1 ? 'person' : 'people'}!`)

        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        setError('Failed to share note. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share note')
    } finally {
      setIsSharing(false)
    }
  }, [
    selectedUsers,
    selectedPermission,
    onShare,
    onRefreshShares,
    accessToken,
    noteTitle,
    noteId,
    currentUserId,
    currentUserName,
    onOpenChange
  ])

  /**
   * Handle removing a share
   */
  const handleUnshare = useCallback(
    async (userId: string, shareId?: string) => {
      try {
        const success = await onUnshare(userId, shareId)
        if (success) {
          await onRefreshShares()
        }
      } catch (err) {
        console.error('Failed to remove share:', err)
      }
    },
    [onUnshare, onRefreshShares]
  )

  /**
   * Get initials from name
   */
  const getInitials = (name: string | undefined): string => {
    return (name || '?')
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            Share "{noteTitle || 'Untitled Note'}"
          </DialogTitle>
          <DialogDescription>
            Share this note with team members. They'll be able to collaborate in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {/* Add People Section */}
          {isOwner && (
            <div className="gba:space-y-3">
              <Label className="gba:text-sm gba:font-medium">Add People</Label>

              {/* Search Input */}
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value)
                  }}
                  className="gba:pl-10"
                  data-testid="share-search-input"
                />
              </div>

              {/* Search Results */}
              {searchQuery.length >= 2 && (
                <div className="gba:border gba:rounded-md gba:max-h-48 gba:overflow-y-auto">
                  {isSearching ? (
                    <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">Searching...</div>
                  ) : filteredResults.length > 0 ? (
                    <div className="gba:divide-y">
                      {filteredResults.map(employee => {
                        const isSelected = selectedUsers.some(u => u.userId === employee.userId)
                        return (
                          <button
                            key={employee.id || employee.userId}
                            onClick={() => toggleUser(employee)}
                            className="gba:w-full gba:p-3 gba:flex gba:items-center gba:gap-3 hover:gba:bg-accent gba:text-left gba:transition-colors"
                            data-testid={`share-user-option-${employee.userId}`}
                          >
                            <Checkbox checked={isSelected} className="gba:pointer-events-none" />
                            <Avatar className="gba:h-8 gba:w-8">
                              {employee.pictureThumbnail ? (
                                <AvatarImage
                                  src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                                  alt={employee.displayName}
                                />
                              ) : (
                                <AvatarFallback>{getInitials(employee.displayName)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div className="gba:flex-1 gba:min-w-0">
                              <p className="gba:text-sm gba:font-medium gba:truncate">{employee.displayName}</p>
                              <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                {employee.organizationalUnitName || employee.jobPositionName || ''}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">No users found</div>
                  )}
                </div>
              )}

              {/* Selected Users & Permission */}
              {selectedUsers.length > 0 && (
                <div className="gba:space-y-2">
                  <Label className="gba:text-xs gba:text-muted-foreground">Selected ({selectedUsers.length})</Label>
                  <div className="gba:space-y-2 gba:max-h-32 gba:overflow-y-auto">
                    {selectedUsers.map(user => (
                      <div
                        key={user.userId}
                        className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:bg-accent/50 gba:rounded-lg"
                      >
                        <Avatar className="gba:h-8 gba:w-8">
                          {user.pictureThumbnail ? (
                            <AvatarImage
                              src={`data:image/jpeg;base64,${user.pictureThumbnail}`}
                              alt={user.displayName}
                            />
                          ) : (
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:text-sm gba:font-medium gba:truncate">{user.displayName}</p>
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            {user.organizationalUnitName || user.jobPositionName || ''}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUser(user.userId)}
                          className="gba:h-6 gba:w-6 gba:p-0"
                        >
                          <X className="gba:w-3 gba:h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Label className="gba:text-xs">Permission:</Label>
                    <Select
                      value={selectedPermission}
                      onValueChange={val => setSelectedPermission(val as NotePermission)}
                    >
                      <SelectTrigger className="gba:w-40" data-testid="share-permission-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERMISSION_CONFIG)
                          .filter(([key]) => key !== 'owner')
                          .map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <config.icon className="gba:w-4 gba:h-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {sentSuccess && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-success-secondary/20 gba:rounded-lg gba:text-success-foreground">
                  <CheckCircle className="gba:w-5 gba:h-5" />
                  <p className="gba:text-sm gba:font-medium">Shared successfully! Blink notifications sent.</p>
                </div>
              )}

              {/* Error Message */}
              {error && <p className="gba:text-sm gba:text-destructive">{error}</p>}

              {/* Share Button */}
              {selectedUsers.length > 0 && !sentSuccess && (
                <Button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="gba:w-full"
                  data-testid="share-confirm-button"
                >
                  <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isSharing
                    ? 'Sharing...'
                    : `Share with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}`}
                </Button>
              )}
            </div>
          )}

          {/* Shared With Section */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
                <Users className="gba:w-4 gba:h-4" />
                People with access
              </Label>
              <Badge variant="secondary">{(resolvedSharedUsers?.length || 0) + 1}</Badge>
            </div>

            <div className="gba:border gba:rounded-lg gba:divide-y gba:max-h-64 gba:overflow-y-auto">
              {/* Owner */}
              <div className="gba:p-3 gba:flex gba:items-center gba:gap-3 gba:bg-accent/30">
                <Avatar className="gba:h-10 gba:w-10">
                  {owner.avatarUrl && <AvatarImage src={owner.avatarUrl} alt={owner.name} />}
                  <AvatarFallback>{getInitials(isOwner ? owner.name : 'Owner')}</AvatarFallback>
                </Avatar>
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">{isOwner ? 'You' : 'Owner'}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">Owner</p>
                </div>
                <Badge variant="outline">Owner</Badge>
              </div>

              {/* Shared Users */}
              {Array.isArray(resolvedSharedUsers) &&
                resolvedSharedUsers.map(user => {
                  const permConfig = PERMISSION_CONFIG[user.permission] || PERMISSION_CONFIG.view
                  const PermIcon = permConfig.icon

                  return (
                    <div
                      key={user.userId}
                      className="gba:p-3 gba:flex gba:items-center gba:gap-3"
                      data-testid={`shared-user-${user.userId}`}
                    >
                      <Avatar className="gba:h-10 gba:w-10">
                        {user.userAvatar && <AvatarImage src={user.userAvatar} alt={user.userName} />}
                        <AvatarFallback>{getInitials(user.userName)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{user.userName}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{user.userEmail || ''}</p>
                      </div>
                      <Badge variant="outline" className="gba:gap-1">
                        <PermIcon className="gba:w-3 gba:h-3" />
                        {permConfig.label}
                      </Badge>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnshare(user.userId, user.shareId)}
                          className="gba:text-destructive hover:gba:text-destructive"
                          data-testid={`unshare-button-${user.userId}`}
                        >
                          <Trash2 className="gba:w-4 gba:h-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}

              {/* Empty State */}
              {(!resolvedSharedUsers || resolvedSharedUsers.length === 0) && (
                <div className="gba:p-6 gba:text-center gba:text-sm gba:text-muted-foreground">
                  <Users className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                  <p>Not shared with anyone yet</p>
                  {isOwner && <p className="gba:text-xs gba:mt-1">Add people above to share this note</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareNoteDialog
