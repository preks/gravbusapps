/**
 * SendForApprovalDialog Component
 *
 * Dialog for sending a document through an approval workflow.
 * Uses Flow Engine to create approval tasks for selected approvers.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
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
  AvatarFallback
} from '@newwork/nw-design-system'
import { Send, Search, User, X, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { officeClient } from '@/common/network/office/OfficeClient'
import translations from '../_i18n'
import { getApproverUserIdsNeedingShare } from './sendForApprovalPermissions'

export interface SendForApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  documentPath?: string
  currentUserId: string
  currentUserName?: string
  accessToken: string
  onApprovalSent?: (approverIds: string[]) => void
  shareDocument?: (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
  'data-testid'?: string
}

/**
 * SendForApprovalDialog Component
 */
export const SendForApprovalDialog: React.FC<SendForApprovalDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  currentUserId,
  accessToken,
  onApprovalSent,
  shareDocument,
  'data-testid': testId = 'send-approval-dialog'
}) => {
  const { t } = useTranslation(translations)
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
      setError(t('approval-dialog-error-select'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const approvers = selectedUsers.filter(u => Boolean(u.userId || u.id))

      if (approvers.length === 0) {
        setError(t('approval-dialog-error-valid'))
        return
      }

      const approverUserIds = approvers.map(user => (user.userId || user.id) as string)
      officeClient.setAccessToken(accessToken)

      // Share only approvers who do not already have direct document access.
      if (shareDocument) {
        let approverUserIdsNeedingShare = approverUserIds

        try {
          const existingShares =
            await officeClient.getSharingForDocument<Array<{ userId: string; permission: string }>>(documentId)
          approverUserIdsNeedingShare = getApproverUserIdsNeedingShare(approverUserIds, existingShares ?? [])
        } catch (shareLookupError) {
          console.warn(
            '[SendForApproval] Failed to load existing shares, falling back to view sharing',
            shareLookupError
          )
        }

        if (approverUserIdsNeedingShare.length > 0) {
          const shareSuccess = await shareDocument(documentId, approverUserIdsNeedingShare, 'view')
          if (!shareSuccess) {
            console.warn(
              '[SendForApproval] Failed to share document with approvers, but continuing with approval request'
            )
          }
        }
      }

      await officeClient.documents.submitForApproval(documentId, {
        approvers: approverUserIds.map(userId => ({ userId })),
        message: message.trim() || undefined,
        dueDate: dueDate || undefined
      })
      setSentSuccess(true)
      onApprovalSent?.(approverUserIds)

      const count = selectedUsers.length
      toast.success(t('approval-dialog-toast', { count }))

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error('[SendForApproval] Submit failed:', err)
      setError(err instanceof Error ? err.message : t('approval-dialog-error-send'))
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedUsers, message, dueDate, documentId, accessToken, onApprovalSent, onOpenChange, shareDocument, t])

  // Calculate minimum date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Send className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('approval-dialog-title')}
          </DialogTitle>
          <DialogDescription>{t('approval-dialog-description', { title: documentTitle })}</DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('approval-dialog-success-title')}</h3>
            <p className="gba:text-muted-foreground">{t('approval-dialog-success-message')}</p>
          </div>
        ) : (
          <div className="gba:space-y-6 gba:py-4">
            {/* Approvers section */}
            <div className="gba:space-y-3">
              <Label>{t('approval-dialog-approvers')}</Label>

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
                  placeholder={t('approval-dialog-search-placeholder')}
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
                      {filteredResults.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md hover:gba:bg-muted gba:transition-colors gba:text-left"
                          onClick={() => toggleUser(user)}
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
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                  {t('approval-dialog-no-users', { query: searchQuery })}
                </p>
              )}
            </div>

            {/* Message section */}
            <div className="gba:space-y-2">
              <Label htmlFor="approval-message">{t('approval-dialog-message-label')}</Label>
              <Textarea
                id="approval-message"
                placeholder={t('approval-dialog-message-placeholder')}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Due date section */}
            <div className="gba:space-y-2">
              <Label htmlFor="due-date" className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:w-4 gba:h-4" />
                {t('approval-dialog-due-date')}
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
                <p>{t('approval-dialog-info-1')}</p>
                <p className="gba:mt-1">{t('approval-dialog-info-2')}</p>
              </div>
            </div>
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common-cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || selectedUsers.length === 0}>
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  {t('approval-dialog-sending')}
                </>
              ) : (
                <>
                  <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('approval-dialog-send-button')}
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
