/**
 * SendForApprovalDialog Component
 *
 * Dialog for sending a document through an approval workflow.
 * Uses Flow Engine to create approval tasks for selected approvers.
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
  Badge,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Checkbox
} from '@newwork/nw-design-system'
import { Send, Search, User, X, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { env } from '@/common/env/EnvUtils'

export interface SendForApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  documentPath?: string
  currentUserId: string
  currentUserName?: string
  accessToken: string
  onApprovalSent?: (approverIds: string[], approverWorkflows?: ApproverWorkflow[]) => void
  shareDocument?: (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
  'data-testid'?: string
}

// Export the type for use elsewhere
export type { ApproverWorkflow }

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
 * Send approval request via Flow Engine
 */
interface ApproverWorkflow {
  userId: string
  userName: string
  userPicture?: string
  workflowId: string
}

interface ApproverInfo {
  userId: string
  userName: string
  userPicture?: string
}

const sendApprovalRequest = async (
  accessToken: string,
  payload: {
    documentId: string
    documentTitle: string
    documentPath?: string
    approvers: ApproverInfo[]
    initiatorId: string
    initiatorName?: string
    message?: string
    dueDate?: string
  }
): Promise<{ success: boolean; workflowIds?: string[]; approverWorkflows?: ApproverWorkflow[]; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const timestamp = Date.now()
    const blinkGroupId = `doc_approval_${timestamp}_${payload.initiatorId}`

    const workflowIds: string[] = []
    const approverWorkflows: ApproverWorkflow[] = []

    // Build the document URL
    const documentUrl = `/platform/apps/document-apps?docId=${payload.documentId}&view=editor`

    // Calculate due date in minutes from now (default 3 days = 4320 minutes)
    let dueInMinutes = 4320
    if (payload.dueDate) {
      const dueDateTime = new Date(payload.dueDate)
      const now = new Date()
      const diffMs = dueDateTime.getTime() - now.getTime()
      dueInMinutes = Math.max(60, Math.ceil(diffMs / 60000)) // Minimum 1 hour
    }

    for (const approver of payload.approvers) {
      const { userId, userName, userPicture } = approver

      // Build entity link for the links array (displayed in task inbox)
      const entityLink = {
        name: payload.documentTitle,
        url: `${globalThis.location?.origin || ''}${documentUrl}`,
        type: 'entity:document',
        metadata: {
          entityType: 'document',
          entityId: payload.documentId
        }
      }

      // Build tags object (for outbox list display)
      const tags: Record<string, string> = {
        app: 'document-approval',
        blinkGroupId,
        assignedUserId: userId,
        entityType: 'document',
        entityId: payload.documentId,
        entityName: payload.documentTitle,
        entityDisplayUrl: documentUrl
      }

      // Build the message
      const taskMessage = payload.message
        ? `${payload.initiatorName || 'Someone'} requested your approval for the document "${payload.documentTitle}".\n\nMessage: ${payload.message}\n\nClick the link below to review and approve or reject.`
        : `${payload.initiatorName || 'Someone'} requested your approval for the document "${payload.documentTitle}". Click the link below to review and approve or reject.`

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Document Approval: ${payload.documentTitle}`,
          description: `Document Approval Request: ${payload.documentTitle}`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Document Approval: ${payload.documentTitle}`,
              message: taskMessage,
              form: [],
              links: [entityLink],
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: null,
                allowReassignment: false
              },
              dueInMinutes
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
        const errorText = await response.text()
        console.error('[SendForApproval] Failed to create approval task:', response.status, errorText)
        throw new Error(`Failed to create approval task: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.data?.workflowId) {
        workflowIds.push(data.data.workflowId)
        approverWorkflows.push({
          userId,
          userName,
          userPicture,
          workflowId: data.data.workflowId
        })
      }
    }

    return { success: true, workflowIds, approverWorkflows }
  } catch (err) {
    console.error('[SendForApproval] Error sending approval request:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send approval request' }
  }
}

/**
 * SendForApprovalDialog Component
 */
export const SendForApprovalDialog: React.FC<SendForApprovalDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  documentPath,
  currentUserId,
  currentUserName,
  accessToken,
  onApprovalSent,
  shareDocument,
  'data-testid': testId = 'send-approval-dialog'
}) => {
  // Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<EmployeeLiteOption[]>([])
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)

  // Employee search using the shared hook
  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedUsers([])
      setMessage('')
      setDueDate('')
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
   * Toggle user selection
   */
  const toggleUser = useCallback((user: EmployeeLiteOption) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id)
      if (exists) {
        return prev.filter(u => u.id !== user.id)
      } else {
        return [...prev, user]
      }
    })
  }, [])

  /**
   * Remove user from selection
   */
  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
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
   * Submit approval request
   */
  const handleSubmit = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one approver')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Build approvers with full user info
      const approvers = selectedUsers
        .filter(u => Boolean(u.userId || u.id))
        .map(u => ({
          userId: (u.userId || u.id) as string,
          userName: u.displayName,
          userPicture: u.pictureThumbnail
        }))

      if (approvers.length === 0) {
        setError('No valid users selected')
        return
      }

      const approverUserIds = approvers.map(a => a.userId)

      // First, share the document with all approvers so they can access it
      if (shareDocument) {
        const shareSuccess = await shareDocument(documentId, approverUserIds, 'view')
        if (!shareSuccess) {
          console.warn(
            '[SendForApproval] Failed to share document with approvers, but continuing with approval request'
          )
        }
      }

      const result = await sendApprovalRequest(accessToken, {
        documentId,
        documentTitle,
        documentPath,
        approvers,
        initiatorId: currentUserId,
        initiatorName: currentUserName,
        message: message.trim() || undefined,
        dueDate: dueDate || undefined
      })

      if (result.success) {
        setSentSuccess(true)
        onApprovalSent?.(approverUserIds, result.approverWorkflows)

        const count = selectedUsers.length
        toast.success(`Approval request sent to ${count} ${count === 1 ? 'person' : 'people'}!`)

        // Close dialog after a short delay
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        setError(result.error || 'Failed to send approval request')
      }
    } catch (err) {
      console.error('[SendForApproval] Submit failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to send for approval. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedUsers,
    message,
    dueDate,
    documentId,
    documentTitle,
    documentPath,
    currentUserId,
    currentUserName,
    accessToken,
    onApprovalSent,
    onOpenChange,
    shareDocument
  ])

  // Calculate minimum date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Send className="gba:w-5 gba:h-5 gba:text-primary" />
            Send for Approval
          </DialogTitle>
          <DialogDescription>Select approvers for "{documentTitle}" and send it for review.</DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Approval Request Sent!</h3>
            <p className="gba:text-muted-foreground">
              The selected approvers will be notified and can review your document.
            </p>
          </div>
        ) : (
          <div className="gba:space-y-6 gba:py-4">
            {/* Approvers section */}
            <div className="gba:space-y-3">
              <Label>Approvers *</Label>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-2">
                  {selectedUsers.map(user => (
                    <Badge key={user.id} variant="secondary" className="gba:gap-1 gba:pr-1">
                      <User className="gba:w-3 gba:h-3" />
                      {user.displayName}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-4 gba:w-4 gba:ml-1 hover:gba:bg-destructive/20"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        <X className="gba:w-3 gba:h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder="Search for approvers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-10"
                />
                {isSearching && (
                  <Spinner size="sm" className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2" />
                )}
              </div>

              {/* Search results */}
              {filteredResults.length > 0 && (
                <div className="gba:relative gba:z-50">
                  <div className="gba:max-h-40 gba:overflow-y-auto gba:border gba:rounded-md gba:bg-card gba:shadow-lg">
                    <div className="gba:p-1">
                      {filteredResults.map(user => {
                        const isSelected = selectedUsers.some(u => u.id === user.id)
                        return (
                          <button
                            key={user.id}
                            type="button"
                            className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md hover:gba:bg-muted gba:transition-colors gba:text-left"
                            onClick={() => toggleUser(user)}
                          >
                            <Checkbox checked={isSelected} className="gba:pointer-events-none" />
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
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* No results message */}
              {searchQuery.length >= 2 && !isSearching && filteredResults.length === 0 && (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                  No users found matching "{searchQuery}"
                </p>
              )}
            </div>

            {/* Message section */}
            <div className="gba:space-y-2">
              <Label htmlFor="approval-message">Message (optional)</Label>
              <Textarea
                id="approval-message"
                placeholder="Add a message for the approvers..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Due date section */}
            <div className="gba:space-y-2">
              <Label htmlFor="due-date" className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:w-4 gba:h-4" />
                Due Date (optional)
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={minDate}
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
              <CheckCircle className="gba:w-4 gba:h-4 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" />
              <div className="gba:text-muted-foreground">
                <p>Approvers will receive a task in their inbox to review and approve or reject the document.</p>
                <p className="gba:mt-1">You'll be notified when a decision is made.</p>
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
                  Sending...
                </>
              ) : (
                <>
                  <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                  Send for Approval
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SendForApprovalDialog
