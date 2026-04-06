import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { WhiteboardApiService } from '../services'
import { sendWhiteboardShareNotification } from './sendWhiteboardShareNotification'
import translations from '../_i18n'

export interface ShareWhiteboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  whiteboardId: string
  whiteboardTitle: string
  currentUserId: string
  currentUserName?: string
  accessToken: string | undefined
  onShareComplete?: () => void
  'data-testid'?: string
}

type Permission = 'view' | 'edit' | 'comment'

interface SelectedUser extends EmployeeLiteOption {
  permission: Permission
}

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export const ShareWhiteboardDialog: React.FC<ShareWhiteboardDialogProps> = ({
  open,
  onOpenChange,
  whiteboardId,
  whiteboardTitle,
  currentUserId,
  currentUserName,
  accessToken,
  onShareComplete,
  'data-testid': testId = 'share-whiteboard-dialog'
}) => {
  const { t } = useTranslation(translations)
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
    const timer = window.setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchEmployees(searchQuery)
      }
    }, 300)
    return () => window.clearTimeout(timer)
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

  const updateUserPermission = useCallback((userId: string, permission: Permission) => {
    setSelectedUsers(prev => prev.map(u => (u.id === userId ? { ...u, permission } : u)))
  }, [])

  const handleShare = useCallback(async () => {
    if (!accessToken) {
      setError(t('share-failed'))
      return
    }
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
          const ok = await WhiteboardApiService.shareMany(accessToken, whiteboardId, userIds, permission as Permission)
          if (!ok) allSucceeded = false
        }
      }

      if (!allSucceeded) {
        throw new Error(t('share-some-failed'))
      }

      const notificationResult = await sendWhiteboardShareNotification(accessToken, {
        whiteboardId,
        whiteboardTitle,
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
        console.warn('[ShareWhiteboard] Notifications failed but shares succeeded')
      }

      setSentSuccess(true)
      toast.success(t('share-success-toast'), {
        description: t('share-success-description', { count: selectedUsers.length })
      })
      onShareComplete?.()
      window.setTimeout(() => onOpenChange(false), 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('share-failed')
      setError(msg)
      toast.error(t('share-failed'), { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    accessToken,
    selectedUsers,
    whiteboardId,
    whiteboardTitle,
    currentUserId,
    currentUserName,
    message,
    onShareComplete,
    onOpenChange,
    t
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('share-title')}
          </DialogTitle>
          <DialogDescription>{t('share-description', { title: whiteboardTitle })}</DialogDescription>
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
          <div className="gba:space-y-6 gba:py-4">
            <div className="gba:space-y-2">
              <Label>{t('share-default-permission')}</Label>
              <Select value={defaultPermission} onValueChange={v => setDefaultPermission(v as Permission)}>
                <SelectTrigger className="gba:w-full" data-testid={`${testId}-default-permission`}>
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

              {filteredResults.length > 0 && (
                <div className="gba:relative gba:z-50">
                  <div className="gba:max-h-40 gba:overflow-y-auto gba:border gba:rounded-md gba:bg-card">
                    <div className="gba:p-1">
                      {filteredResults.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md hover:gba:bg-muted gba:text-left"
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

              {searchQuery.length >= 2 && !isSearching && filteredResults.length === 0 && (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-2">
                  {t('share-no-results', { query: searchQuery })}
                </p>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="gba:space-y-2">
                <Label>{t('share-people-with-access', { count: selectedUsers.length })}</Label>
                <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-48 gba:overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="gba:flex gba:items-center gba:gap-3 gba:p-3">
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
                      </div>
                      <Select
                        value={user.permission}
                        onValueChange={v => updateUserPermission(user.id, v as Permission)}
                      >
                        <SelectTrigger className="gba:w-32 gba:h-8" data-testid={`${testId}-perm-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">{t('share-can-view')}</SelectItem>
                          <SelectItem value="comment">{t('share-can-comment')}</SelectItem>
                          <SelectItem value="edit">{t('share-can-edit')}</SelectItem>
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

            <div className="gba:space-y-2">
              <Label htmlFor="wb-share-message">{t('share-message-optional')}</Label>
              <Textarea
                id="wb-share-message"
                placeholder={t('share-message-placeholder')}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                data-testid={`${testId}-message-input`}
              />
            </div>

            {error && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-destructive/10 gba:text-destructive gba:rounded-md gba:text-sm">
                <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-primary/5 gba:rounded-md gba:text-sm">
              <Share2 className="gba:w-4 gba:h-4 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" />
              <p className="gba:text-muted-foreground">{t('share-info')}</p>
            </div>
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-testid={`${testId}-cancel`}
            >
              {t('share-cancel')}
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSubmitting || selectedUsers.length === 0}
              data-testid={`${testId}-submit`}
            >
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
