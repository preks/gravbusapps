/**
 * ShareSlideDialog Component
 *
 * Dialog for sharing a presentation with other users.
 * - Allows selecting users to share with
 * - Allows selecting permission level (view/edit/comment)
 * - Sends notification via Blink after sharing
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
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
import { Share2, Search, X, CheckCircle, AlertCircle, Eye, Pencil, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { env } from '@/common/env/EnvUtils'

export interface ShareSlideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  currentUserId: string
  currentUserName?: string
  accessToken: string
  /** Function to share slide with users */
  shareSlide: (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
  /** Callback when sharing is complete */
  onShareComplete?: () => void
  'data-testid'?: string
}

type Permission = 'view' | 'edit' | 'comment'

interface SelectedUser extends EmployeeLiteOption {
  permission: Permission
}

/**
 * Helper to create assignment targets for Flow Engine
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
 * Send notification via Blink
 */
const sendShareNotification = async (
  accessToken: string,
  payload: {
    slideId: string
    slideTitle: string
    recipients: Array<{ userId: string; userName: string; permission: Permission }>
    initiatorId: string
    initiatorName?: string
    message?: string
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const timestamp = Date.now()
    const blinkGroupId = `slide_share_${timestamp}_${payload.initiatorId}`

    const slideUrl = `/platform/apps/slide-apps?slideId=${payload.slideId}&view=editor`

    for (const recipient of payload.recipients) {
      const { userId, permission } = recipient

      const permissionLabel = permission === 'edit' ? 'edit' : permission === 'comment' ? 'view and comment on' : 'view'

      const entityLink = {
        name: payload.slideTitle,
        url: `${globalThis.location?.origin || ''}${slideUrl}`,
        type: 'entity:slide',
        metadata: {
          entityType: 'slide',
          entityId: payload.slideId
        }
      }

      const tags: Record<string, string> = {
        app: 'slide-share',
        blinkGroupId,
        assignedUserId: userId,
        entityType: 'slide',
        entityId: payload.slideId,
        entityName: payload.slideTitle,
        entityDisplayUrl: slideUrl,
        permission
      }

      const baseMessage = `${payload.initiatorName || 'Someone'} shared the presentation "${payload.slideTitle}" with you. You can ${permissionLabel} this presentation.`
      const taskMessage = payload.message ? `${baseMessage}\n\nMessage: ${payload.message}` : baseMessage

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Presentation Shared: ${payload.slideTitle}`,
          description: `Presentation sharing notification`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Presentation Shared: ${payload.slideTitle}`,
              message: taskMessage,
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
        console.error('[ShareSlide] Failed to send notification:', response.status)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[ShareSlide] Error sending notifications:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send notifications' }
  }
}

/**
 * ShareSlideDialog Component
 */
export const ShareSlideDialog: React.FC<ShareSlideDialogProps> = ({
  open,
  onOpenChange,
  slideId,
  slideTitle,
  currentUserId,
  currentUserName,
  accessToken,
  shareSlide,
  onShareComplete,
  'data-testid': testId = 'share-slide-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [defaultPermission, setDefaultPermission] = useState<Permission>('view')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)

  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedUsers([])
      setDefaultPermission('view')
      setMessage('')
      setError(null)
      setSentSuccess(false)
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchEmployees(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchEmployees])

  const filteredResults = useMemo(() => {
    if (!searchResults || searchQuery.length < 2) return []
    const selectedIds = new Set(selectedUsers.map(u => u.id))
    return searchResults.filter(emp => emp.userId !== currentUserId && !selectedIds.has(emp.id))
  }, [searchResults, selectedUsers, currentUserId, searchQuery])

  const addUser = useCallback(
    (user: EmployeeLiteOption) => {
      setSelectedUsers(prev => {
        const exists = prev.find(u => u.id === user.id)
        if (exists) return prev
        return [...prev, { ...user, permission: defaultPermission }]
      })
      setSearchQuery('')
    },
    [defaultPermission]
  )

  const removeUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }, [])

  const updateUserPermission = useCallback((userId: string, permission: Permission) => {
    setSelectedUsers(prev => prev.map(u => (u.id === userId ? { ...u, permission } : u)))
  }, [])

  const handleShare = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const userIdsByPermission: Record<Permission, string[]> = {
        view: selectedUsers.filter(u => u.permission === 'view').map(u => u.userId),
        edit: selectedUsers.filter(u => u.permission === 'edit').map(u => u.userId),
        comment: selectedUsers.filter(u => u.permission === 'comment').map(u => u.userId)
      }

      let allSucceeded = true
      for (const [permission, userIds] of Object.entries(userIdsByPermission)) {
        if (userIds.length > 0) {
          const ok = await shareSlide(slideId, userIds, permission as Permission)
          if (!ok) allSucceeded = false
        }
      }

      if (!allSucceeded) {
        throw new Error('Some shares failed')
      }

      const notificationResult = await sendShareNotification(accessToken, {
        slideId,
        slideTitle,
        recipients: selectedUsers.map(u => ({
          userId: u.userId,
          userName: u.displayName,
          permission: u.permission
        })),
        initiatorId: currentUserId,
        initiatorName: currentUserName,
        message
      })

      if (!notificationResult.success) {
        console.warn('[ShareSlide] Notifications failed but shares succeeded')
      }

      setSentSuccess(true)
      toast.success('Presentation shared', {
        description: `Shared with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}`
      })

      onShareComplete?.()

      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share presentation'
      setError(message)
      toast.error('Share failed', { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedUsers,
    slideId,
    slideTitle,
    currentUserId,
    currentUserName,
    message,
    accessToken,
    shareSlide,
    onShareComplete,
    onOpenChange
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5" />
            Share presentation
          </DialogTitle>
          <DialogDescription>
            Share "{slideTitle}" with others and send them a notification
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {error && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive">
              <AlertCircle className="gba:w-4 gba:h-4 gba:shrink-0" />
              <span className="gba:text-sm">{error}</span>
            </div>
          )}

          {sentSuccess && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-success/10 gba:text-success">
              <CheckCircle className="gba:w-4 gba:h-4 gba:shrink-0" />
              <span className="gba:text-sm">Presentation shared successfully!</span>
            </div>
          )}

          <div className="gba:space-y-2">
            <Label htmlFor="user-search">Search users</Label>
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-9"
                data-testid={`${testId}-search`}
              />
              {isSearching && (
                <Spinner size="sm" className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2" />
              )}
            </div>

            {filteredResults.length > 0 && (
              <div className="gba:border gba:rounded-lg gba:max-h-48 gba:overflow-y-auto">
                {filteredResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => addUser(user)}
                    className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 hover:gba:bg-muted/50 gba:transition-colors"
                    data-testid={`${testId}-user-${user.id}`}
                  >
                    <Avatar className="gba:w-8 gba:h-8">
                      {user.avatar && <AvatarImage src={user.avatar} />}
                      <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:text-left">
                      <p className="gba:text-sm gba:font-medium">{user.displayName}</p>
                      {user.email && <p className="gba:text-xs gba:text-muted-foreground">{user.email}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="gba:space-y-2">
              <Label>Selected users ({selectedUsers.length})</Label>
              <div className="gba:space-y-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/50"
                  >
                    <Avatar className="gba:w-8 gba:h-8">
                      {user.avatar && <AvatarImage src={user.avatar} />}
                      <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:truncate">{user.displayName}</p>
                      {user.email && <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{user.email}</p>}
                    </div>
                    <Select
                      value={user.permission}
                      onValueChange={p => updateUserPermission(user.id, p as Permission)}
                    >
                      <SelectTrigger className="gba:w-32">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUser(user.id)}
                      data-testid={`${testId}-remove-${user.id}`}
                    >
                      <X className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="gba:space-y-2">
            <Label htmlFor="default-permission">Default permission</Label>
            <Select value={defaultPermission} onValueChange={v => setDefaultPermission(v as Permission)}>
              <SelectTrigger id="default-permission" data-testid={`${testId}-default-permission`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Can view</SelectItem>
                <SelectItem value="comment">Can comment</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              data-testid={`${testId}-message`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSubmitting || selectedUsers.length === 0} data-testid={`${testId}-share-button`}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                Share
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareSlideDialog
