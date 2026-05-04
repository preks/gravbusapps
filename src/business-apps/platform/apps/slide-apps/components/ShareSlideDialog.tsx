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
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Share2, Search, X, CheckCircle, AlertCircle, Eye, Pencil, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '../_i18n'

export interface ShareSlideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string
  slideTitle: string
  currentUserId: string
  currentUserName?: string
  accessToken: string | undefined
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
    const baseUrl = CUSTOM_FLOW_ENGINE_API_URL
    const timestamp = Date.now()
    const blinkGroupId = `slide_share_${timestamp}_${payload.initiatorId}`

    const slideUrl = buildPlatformUrl('/platform/every-office/slides', {
      slideId: payload.slideId,
      view: 'editor'
    })

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

      const baseMessage = `${payload.initiatorName || 'Someone'} shared the slide "${payload.slideTitle}" with you. You can ${permissionLabel} this slide.`
      const taskMessage = payload.message ? `${baseMessage}\n\nMessage: ${payload.message}` : baseMessage

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Slide Shared: ${payload.slideTitle}`,
          description: `Slide sharing notification`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Slide Shared: ${payload.slideTitle}`,
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

      const response = await fetch(`${baseUrl}/templates/execute-dynamic`, {
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
    return { success: false, error: err instanceof Error ? err.message : 'share-notifications-failed' }
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
  const { t } = useTranslation(translations)
  const resolvedSlideTitle = slideTitle || t('title-untitled-slide')
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
      setError(t('share-select-one'))
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
        throw new Error(t('share-some-failed'))
      }

      const notificationResult = await sendShareNotification(accessToken, {
        slideId,
        slideTitle: resolvedSlideTitle,
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
      toast.success(t('share-success-toast'), {
        description: t('share-success-description', { count: selectedUsers.length })
      })

      onShareComplete?.()

      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('share-failed')
      setError(message)
      toast.error(t('share-failed'), { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedUsers,
    slideId,
    resolvedSlideTitle,
    currentUserId,
    currentUserName,
    message,
    accessToken,
    shareSlide,
    onShareComplete,
    onOpenChange,
    t
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-lg gba:max-h-[90vh] gba:flex gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('share-title')}
          </DialogTitle>
          <DialogDescription>{t('share-description', { title: resolvedSlideTitle })}</DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('share-success-title')}</h3>
            <p className="gba:text-muted-foreground">
              {selectedUsers.length === 1
                ? t('share-notified-single', { name: selectedUsers[0].displayName })
                : t('share-notified-multiple', { count: selectedUsers.length })}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-5 gba:py-2 gba:overflow-y-auto gba:flex-1 gba:-mx-6 gba:px-6">
            {/* Default permission selector */}
            <div className="gba:space-y-2">
              <Label>{t('share-default-permission')}</Label>
              <Select value={defaultPermission} onValueChange={v => setDefaultPermission(v as Permission)}>
                <SelectTrigger className="gba:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Eye className="gba:w-4 gba:h-4" />
                      <span>{t('share-can-view')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <MessageSquare className="gba:w-4 gba:h-4" />
                      <span>{t('share-can-comment')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Pencil className="gba:w-4 gba:h-4" />
                      <span>{t('share-can-edit')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search input */}
            <div className="gba:space-y-2">
              <Label>{t('share-add-people')}</Label>
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder={t('share-search-placeholder')}
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
                              <AvatarImage
                                src={
                                  user.pictureThumbnail.startsWith('data:')
                                    ? user.pictureThumbnail
                                    : `data:image/png;base64,${user.pictureThumbnail}`
                                }
                                alt={user.displayName}
                              />
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
                  {t('share-no-results', { query: searchQuery })}
                </p>
              )}
            </div>

            {/* Selected users list */}
            {selectedUsers.length > 0 && (
              <div className="gba:space-y-2">
                <Label>{t('share-people-with-access', { count: selectedUsers.length })}</Label>
                <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-48 gba:overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="gba:flex gba:items-center gba:gap-2 gba:p-2">
                      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                        {user.pictureThumbnail && (
                          <AvatarImage
                            src={
                              user.pictureThumbnail.startsWith('data:')
                                ? user.pictureThumbnail
                                : `data:image/png;base64,${user.pictureThumbnail}`
                            }
                            alt={user.displayName}
                          />
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
                        <SelectTrigger size="sm" className="gba:flex-shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Eye className="gba:w-3 gba:h-3" />
                              <span>{t('share-can-view')}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="comment">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <MessageSquare className="gba:w-3 gba:h-3" />
                              <span>{t('share-can-comment')}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Pencil className="gba:w-3 gba:h-3" />
                              <span>{t('share-can-edit')}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8 gba:flex-shrink-0 hover:gba:bg-destructive/10 hover:gba:text-destructive"
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
              <Label htmlFor="share-message">{t('share-message-optional')}</Label>
              <Textarea
                id="share-message"
                placeholder={t('share-message-placeholder')}
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
                <p>{t('share-info')}</p>
              </div>
            </div>
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('share-cancel')}
            </Button>
            <Button onClick={handleShare} disabled={isSubmitting || selectedUsers.length === 0}>
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  {t('share-sharing')}
                </>
              ) : (
                <>
                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('share-button')}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ShareSlideDialog
