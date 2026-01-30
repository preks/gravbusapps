/**
 * ShareDocumentDialog Component
 *
 * Dialog for sharing a document with other users.
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
import { getCanonicalContentUrl } from '@/common/utils/navigationUtils'

export interface ShareDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  currentUserId: string
  currentUserName?: string
  accessToken: string
  /** Function to share document with users */
  shareDocument: (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
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
    documentId: string
    documentTitle: string
    recipients: Array<{ userId: string; userName: string; permission: Permission }>
    initiatorId: string
    initiatorName?: string
    message?: string
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const timestamp = Date.now()
    const blinkGroupId = `doc_share_${timestamp}_${payload.initiatorId}`

    // Build the document URL using canonical URL
    const documentUrl = getCanonicalContentUrl('document', { docId: payload.documentId, view: 'editor' })

    for (const recipient of payload.recipients) {
      const { userId, permission } = recipient

      // Permission label for the message
      const permissionLabel = permission === 'edit' ? 'edit' : permission === 'comment' ? 'view and comment on' : 'view'

      // Build entity link
      const entityLink = {
        name: payload.documentTitle,
        url: `${globalThis.location?.origin || ''}${documentUrl}`,
        type: 'entity:document',
        metadata: {
          entityType: 'document',
          entityId: payload.documentId
        }
      }

      // Build tags
      const tags: Record<string, string> = {
        app: 'document-share',
        blinkGroupId,
        assignedUserId: userId,
        entityType: 'document',
        entityId: payload.documentId,
        entityName: payload.documentTitle,
        entityDisplayUrl: documentUrl,
        permission
      }

      // Build the message
      const baseMessage = `${payload.initiatorName || 'Someone'} shared the document "${payload.documentTitle}" with you. You can ${permissionLabel} this document.`
      const taskMessage = payload.message ? `${baseMessage}\n\nMessage: ${payload.message}` : baseMessage

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Document Shared: ${payload.documentTitle}`,
          description: `Document sharing notification`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Document Shared: ${payload.documentTitle}`,
              message: taskMessage,
              form: [],
              links: [entityLink],
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: null,
                allowReassignment: false
              },
              dueInMinutes: 4320 // 3 days
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
        console.error('[ShareDocument] Failed to send notification:', response.status)
        // Continue with other notifications even if one fails
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[ShareDocument] Error sending notifications:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send notifications' }
  }
}

/**
 * ShareDocumentDialog Component
 */
export const ShareDocumentDialog: React.FC<ShareDocumentDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  currentUserId,
  currentUserName,
  accessToken,
  shareDocument,
  onShareComplete,
  'data-testid': testId = 'share-document-dialog'
}) => {
  // Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [defaultPermission, setDefaultPermission] = useState<Permission>('view')
  const [message, setMessage] = useState('')

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)

  // Employee search
  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)

  // Reset form when dialog opens/closes
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchEmployees(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchEmployees])

  // Filter out already selected users and current user
  const filteredResults = useMemo(() => {
    if (!searchResults || searchQuery.length < 2) return []

    const selectedIds = new Set(selectedUsers.map(u => u.id))
    return searchResults.filter(emp => emp.userId !== currentUserId && !selectedIds.has(emp.id))
  }, [searchResults, selectedUsers, currentUserId, searchQuery])

  /**
   * Add user to selection
   */
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

  /**
   * Remove user from selection
   */
  const removeUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }, [])

  /**
   * Update user permission
   */
  const updateUserPermission = useCallback((userId: string, permission: Permission) => {
    setSelectedUsers(prev => prev.map(u => (u.id === userId ? { ...u, permission } : u)))
  }, [])

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
   * Get avatar image URL from base64 data
   */
  const getAvatarUrl = (picture?: string): string | undefined => {
    if (!picture) return undefined
    if (picture.startsWith('data:')) return picture
    return `data:image/png;base64,${picture}`
  }

  /**
   * Submit share request
   */
  const handleSubmit = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one person to share with')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Group users by permission
      const usersByPermission: Record<Permission, string[]> = {
        view: [],
        edit: [],
        comment: []
      }

      selectedUsers.forEach(user => {
        const userId = user.userId || user.id
        if (userId) {
          usersByPermission[user.permission].push(userId)
        }
      })

      // Share document with each permission group
      let allSuccess = true
      for (const [permission, userIds] of Object.entries(usersByPermission)) {
        if (userIds.length > 0) {
          const success = await shareDocument(documentId, userIds, permission as Permission)
          if (!success) {
            allSuccess = false
          }
        }
      }

      if (!allSuccess) {
        setError('Failed to share with some users')
        setIsSubmitting(false)
        return
      }

      // Send notifications to all users
      const recipients = selectedUsers
        .filter(u => Boolean(u.userId || u.id))
        .map(u => ({
          userId: (u.userId || u.id) as string,
          userName: u.displayName,
          permission: u.permission
        }))

      await sendShareNotification(accessToken, {
        documentId,
        documentTitle,
        recipients,
        initiatorId: currentUserId,
        initiatorName: currentUserName,
        message: message.trim() || undefined
      })

      setSentSuccess(true)
      onShareComplete?.()

      const count = selectedUsers.length
      toast.success(`Document shared with ${count} ${count === 1 ? 'person' : 'people'}!`)

      // Close dialog after showing success
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error('[ShareDocument] Submit failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to share document. Please try again.')
      setIsSubmitting(false)
    }
  }, [
    selectedUsers,
    message,
    documentId,
    documentTitle,
    currentUserId,
    currentUserName,
    accessToken,
    shareDocument,
    onShareComplete,
    onOpenChange
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            Share Document
          </DialogTitle>
          <DialogDescription>Share "{documentTitle}" with others and set their access level.</DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Document Shared!</h3>
            <p className="gba:text-muted-foreground">
              {selectedUsers.length === 1
                ? `${selectedUsers[0].displayName} has been notified and can now access this document.`
                : `${selectedUsers.length} people have been notified and can now access this document.`}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-6 gba:py-4">
            {/* Default permission selector */}
            <div className="gba:space-y-2">
              <Label>Default permission for new users</Label>
              <Select value={defaultPermission} onValueChange={v => setDefaultPermission(v as Permission)}>
                <SelectTrigger className="gba:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Eye className="gba:w-4 gba:h-4" />
                      <span>Can view</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <MessageSquare className="gba:w-4 gba:h-4" />
                      <span>Can comment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Pencil className="gba:w-4 gba:h-4" />
                      <span>Can edit</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search input */}
            <div className="gba:space-y-2">
              <Label>Add people</Label>
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder="Search for people..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-10"
                  data-testid={`${testId}-search-input`}
                />
                {isSearching && (
                  <Spinner size="sm" className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2" />
                )}
              </div>

              {/* Search results dropdown */}
              {filteredResults.length > 0 && (
                <div className="gba:relative gba:z-50">
                  <div className="gba:max-h-40 gba:overflow-y-auto gba:border gba:rounded-md gba:bg-card gba:shadow-lg">
                    <div className="gba:p-1">
                      {filteredResults.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md hover:gba:bg-muted gba:transition-colors gba:text-left"
                          onClick={() => addUser(user)}
                          data-testid={`${testId}-user-option-${user.id}`}
                        >
                          <Avatar className="gba:h-8 gba:w-8">
                            {user.pictureThumbnail && (
                              <AvatarImage src={getAvatarUrl(user.pictureThumbnail)} alt={user.displayName} />
                            )}
                            <AvatarFallback className="gba:text-xs">{getInitials(user.displayName)}</AvatarFallback>
                          </Avatar>
                          <div className="gba:flex-1 gba:min-w-0">
                            <p className="gba:font-medium gba:text-sm gba:truncate">{user.displayName}</p>
                            {(user.jobPositionName || user.organizationalUnitName) && (
                              <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                {[user.jobPositionName, user.organizationalUnitName].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No results message */}
              {searchQuery.length >= 2 && !isSearching && filteredResults.length === 0 && (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-2">
                  No people found matching "{searchQuery}"
                </p>
              )}
            </div>

            {/* Selected users list */}
            {selectedUsers.length > 0 && (
              <div className="gba:space-y-2">
                <Label>People with access ({selectedUsers.length})</Label>
                <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-48 gba:overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="gba:flex gba:items-center gba:gap-3 gba:p-3">
                      <Avatar className="gba:h-8 gba:w-8">
                        {user.pictureThumbnail && (
                          <AvatarImage src={getAvatarUrl(user.pictureThumbnail)} alt={user.displayName} />
                        )}
                        <AvatarFallback className="gba:text-xs">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:font-medium gba:text-sm gba:truncate">{user.displayName}</p>
                        {(user.jobPositionName || user.organizationalUnitName) && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            {[user.jobPositionName, user.organizationalUnitName].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <Select
                        value={user.permission}
                        onValueChange={v => updateUserPermission(user.id, v as Permission)}
                      >
                        <SelectTrigger className="gba:w-32 gba:h-8">
                          <SelectValue />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8 hover:gba:bg-destructive/10 hover:gba:text-destructive"
                        onClick={() => removeUser(user.id)}
                        data-testid={`${testId}-remove-user-${user.id}`}
                      >
                        <X className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message section */}
            <div className="gba:space-y-2">
              <Label htmlFor="share-message">Message (optional)</Label>
              <Textarea
                id="share-message"
                placeholder="Add a message for the recipients..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                data-testid={`${testId}-message-input`}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-destructive/10 gba:text-destructive gba:rounded-md gba:text-sm">
                <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Info box */}
            <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-primary/5 gba:rounded-md gba:text-sm">
              <Share2 className="gba:w-4 gba:h-4 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" />
              <div className="gba:text-muted-foreground">
                <p>
                  People you share with will receive a notification and can access the document based on their
                  permission level.
                </p>
              </div>
            </div>
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || selectedUsers.length === 0}>
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
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ShareDocumentDialog
