/**
 * ShareBoardDialog - share a board with employees (view / edit / comment).
 * Mirrors the document app's ShareDocumentDialog pattern.
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
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Share2, Search, X, CheckCircle, Eye, Pencil, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import type { BoardPermission } from '../types'
import { BoardApiService } from '../services/BoardApiService'
import { sendBoardShareNotification } from '../services/boardShareNotification'
import translations from '../_i18n'

export interface ShareBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  boardTitle: string
  currentUserId: string
  currentUserName?: string
  accessToken: string
  onShareComplete?: () => void
  'data-testid'?: string
}

interface SelectedUser extends EmployeeLiteOption {
  permission: BoardPermission
}

export const ShareBoardDialog: React.FC<ShareBoardDialogProps> = ({
  open,
  onOpenChange,
  boardId,
  boardTitle,
  currentUserId,
  currentUserName,
  accessToken,
  onShareComplete,
  'data-testid': testId = 'share-board-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [defaultPermission, setDefaultPermission] = useState<BoardPermission>('view')
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
      if (searchQuery.length >= 2) searchEmployees(searchQuery)
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
        if (prev.find(u => u.id === user.id)) return prev
        return [...prev, { ...user, permission: defaultPermission }]
      })
      setSearchQuery('')
    },
    [defaultPermission]
  )

  const removeUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }, [])

  const updateUserPermission = useCallback((userId: string, permission: BoardPermission) => {
    setSelectedUsers(prev => prev.map(u => (u.id === userId ? { ...u, permission } : u)))
  }, [])

  const getInitials = (name: string): string =>
    name
      .split(' ')
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const getAvatarUrl = (picture?: string): string | undefined => {
    if (!picture) return undefined
    return picture.startsWith('data:') ? picture : `data:image/png;base64,${picture}`
  }

  const handleSubmit = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one person to share with')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const usersByPermission: Record<BoardPermission, string[]> = { view: [], edit: [], comment: [] }
      selectedUsers.forEach(user => {
        const userId = user.userId || user.id
        if (userId) usersByPermission[user.permission].push(userId)
      })

      let allSuccess = true
      for (const [permission, userIds] of Object.entries(usersByPermission)) {
        if (userIds.length > 0) {
          const shares = userIds.map(uid => ({ userId: uid, permission: permission as BoardPermission }))
          const success = await BoardApiService.shareBoard(boardId, shares)
          if (!success) allSuccess = false
        }
      }

      if (!allSuccess) {
        setError('Failed to share with some users')
        setIsSubmitting(false)
        return
      }

      const recipients = selectedUsers
        .filter(u => Boolean(u.userId || u.id))
        .map(u => ({
          userId: (u.userId || u.id) as string,
          userName: u.displayName,
          permission: u.permission
        }))

      await sendBoardShareNotification(accessToken, t, {
        boardId,
        boardTitle,
        recipients,
        initiatorId: currentUserId,
        initiatorName: currentUserName,
        message: message.trim() || undefined
      })

      setSentSuccess(true)
      onShareComplete?.()

      const count = selectedUsers.length
      toast.success(`Board shared with ${count} ${count === 1 ? 'person' : 'people'}!`)

      setTimeout(() => onOpenChange(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share board. Please try again.')
      setIsSubmitting(false)
    }
  }, [
    selectedUsers,
    message,
    boardId,
    boardTitle,
    currentUserId,
    currentUserName,
    accessToken,
    onShareComplete,
    onOpenChange
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            Share Board
          </DialogTitle>
          <DialogDescription>Share &quot;{boardTitle}&quot; with others and set their access level.</DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Board Shared!</h3>
            <p className="gba:text-muted-foreground">
              {selectedUsers.length === 1
                ? `${selectedUsers[0].displayName} has been notified.`
                : `${selectedUsers.length} people have been notified.`}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-6 gba:py-4">
            <div className="gba:space-y-2">
              <Label>Default permission</Label>
              <Select value={defaultPermission} onValueChange={v => setDefaultPermission(v as BoardPermission)}>
                <SelectTrigger className="gba:w-full" data-testid={`${testId}-perm-select`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Eye className="gba:w-4 gba:h-4" /> Can view
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <MessageSquare className="gba:w-4 gba:h-4" /> Can comment
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Pencil className="gba:w-4 gba:h-4" /> Can edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label>Add people</Label>
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-9"
                  data-testid={`${testId}-search`}
                />
                {isSearching && (
                  <Spinner className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4" />
                )}
              </div>

              {filteredResults.length > 0 && (
                <div className="gba:border gba:rounded-md gba:max-h-40 gba:overflow-y-auto">
                  {filteredResults.map(emp => (
                    <button
                      key={emp.id}
                      className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:hover:bg-muted/50 gba:transition-colors gba:text-left"
                      onClick={() => addUser(emp)}
                      data-testid={`${testId}-result-${emp.id}`}
                    >
                      <Avatar size="sm" className="gba:h-7 gba:w-7">
                        {emp.picture && <AvatarImage src={getAvatarUrl(emp.picture)} />}
                        <AvatarFallback className="gba:text-xs">{getInitials(emp.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:min-w-0 gba:flex-1">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{emp.displayName}</p>
                        {emp.email && <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{emp.email}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="gba:space-y-2">
                <Label>Sharing with ({selectedUsers.length})</Label>
                <div className="gba:space-y-1 gba:max-h-40 gba:overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div
                      key={user.id}
                      className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded-md gba:bg-muted/30"
                    >
                      <Avatar size="sm" className="gba:h-7 gba:w-7">
                        {user.picture && <AvatarImage src={getAvatarUrl(user.picture)} />}
                        <AvatarFallback className="gba:text-xs">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:flex-1 gba:truncate">{user.displayName}</span>
                      <Select
                        value={user.permission}
                        onValueChange={v => updateUserPermission(user.id, v as BoardPermission)}
                      >
                        <SelectTrigger className="gba:w-28 gba:h-7 gba:text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="comment">Comment</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-7 gba:w-7 gba:p-0"
                        onClick={() => removeUser(user.id)}
                      >
                        <X className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="gba:space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Add a message for the recipients..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="gba:resize-none"
                rows={2}
                data-testid={`${testId}-message`}
              />
            </div>

            {error && <p className="gba:text-sm gba:text-destructive">{error}</p>}
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedUsers.length === 0}
              data-testid={`${testId}-submit`}
            >
              {isSubmitting ? (
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
              ) : (
                <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
              )}
              Share
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
