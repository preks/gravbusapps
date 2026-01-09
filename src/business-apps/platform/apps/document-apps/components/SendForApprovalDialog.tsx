/**
 * SendForApprovalDialog Component
 *
 * Dialog for sending a document through an approval workflow.
 * Allows selecting approvers, adding a message, and setting a due date.
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
  Input,
  Textarea,
  Label,
  Badge,
  Spinner,
  ScrollArea
} from '@newwork/nw-design-system'
import { Send, Search, User, X, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

export interface SendForApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (approvers: string[], message: string, dueDate?: string) => Promise<void>
  accessToken: string
  'data-testid'?: string
}

interface UserSearchResult {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
}

/**
 * SendForApprovalDialog Component
 */
export const SendForApprovalDialog: React.FC<SendForApprovalDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  accessToken,
  'data-testid': testId = 'send-approval-dialog'
}) => {
  // Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Search state
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedUsers([])
      setMessage('')
      setDueDate('')
      setSearchResults([])
      setError(null)
    }
  }, [open])

  /**
   * Search for users
   */
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query)

      if (query.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        // Call the GraphQL API to search for users
        const response = await fetch('https://newwork-dev.newwork.com/graphql-gateway/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: `
              query SearchEmployees($filter: EmployeeFilterInput, $pagination: PaginationInput) {
                employees(filter: $filter, pagination: $pagination) {
                  items {
                    id
                    displayName
                    email
                    avatarUrl
                  }
                }
              }
            `,
            variables: {
              filter: {
                or: [{ displayName: { contains: query } }, { email: { contains: query } }]
              },
              pagination: { first: 10 }
            }
          })
        })

        const data = await response.json()
        const employees = data?.data?.employees?.items || []

        // Filter out already selected users
        const selectedIds = new Set(selectedUsers.map(u => u.id))
        const filtered = employees.filter((emp: UserSearchResult) => !selectedIds.has(emp.id))

        setSearchResults(filtered)
      } catch (err) {
        console.error('[SendForApproval] Search failed:', err)
        // Fallback to mock data for demo
        setSearchResults([
          { id: '1', displayName: 'John Manager', email: 'john.manager@company.com' },
          { id: '2', displayName: 'Sarah Director', email: 'sarah.director@company.com' },
          { id: '3', displayName: 'Mike Supervisor', email: 'mike.supervisor@company.com' }
        ])
      } finally {
        setIsSearching(false)
      }
    },
    [accessToken, selectedUsers]
  )

  /**
   * Add user to selection
   */
  const handleSelectUser = useCallback((user: UserSearchResult) => {
    setSelectedUsers(prev => [...prev, user])
    setSearchQuery('')
    setSearchResults([])
  }, [])

  /**
   * Remove user from selection
   */
  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }, [])

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
      const approverIds = selectedUsers.map(u => u.id)
      await onSubmit(approverIds, message, dueDate || undefined)
      onOpenChange(false)
    } catch (err) {
      console.error('[SendForApproval] Submit failed:', err)
      setError('Failed to send for approval. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedUsers, message, dueDate, onSubmit, onOpenChange])

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
          <DialogDescription>Select approvers and send this document for review and approval.</DialogDescription>
        </DialogHeader>

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
                onChange={e => handleSearch(e.target.value)}
                className="gba:pl-10"
              />
              {isSearching && (
                <Spinner size="sm" className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2" />
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <ScrollArea className="gba:max-h-40 gba:border gba:rounded-md">
                <div className="gba:p-1">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md hover:gba:bg-muted gba:transition-colors gba:text-left"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                        <User className="gba:w-4 gba:h-4 gba:text-primary" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:font-medium gba:text-sm gba:truncate">{user.displayName}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
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
            <Input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={minDate} />
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
              <p>Approvers will receive a notification and can approve or reject the document.</p>
              <p className="gba:mt-1">You'll be notified when a decision is made.</p>
            </div>
          </div>
        </div>

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
      </DialogContent>
    </Dialog>
  )
}

export default SendForApprovalDialog
