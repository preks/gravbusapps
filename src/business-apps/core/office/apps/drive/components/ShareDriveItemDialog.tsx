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
import {
  Share2,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  Pencil,
  MessageSquare,
  Link2,
  Copy,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { DriveApiService } from '../services/DriveApiService'
import type { ShareInfo, ShareLinkInfo } from '../types/drive.types'

type Permission = 'view' | 'comment' | 'edit' | 'admin'

interface SelectedUser extends EmployeeLiteOption {
  permission: Permission
}

interface ResolvedShare extends ShareInfo {
  displayName?: string
  pictureThumbnail?: string
  initials: string
}

export interface ShareDriveItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: string
  entityId: string
  entityName: string
  accessToken: string
  currentUserId: string
  t: (key: string, vars?: Record<string, string | number>) => string
  'data-testid'?: string
}

export const ShareDriveItemDialog: React.FC<ShareDriveItemDialogProps> = ({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  accessToken,
  currentUserId,
  t,
  'data-testid': testId = 'share-drive-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [defaultPermission, setDefaultPermission] = useState<Permission>('view')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [resolvedShares, setResolvedShares] = useState<ResolvedShare[]>([])
  const [loadingShares, setLoadingShares] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLinkInfo[]>([])
  const [creatingLink, setCreatingLink] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken || '')
  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)

  const resolveShareUsers = useCallback(
    async (shares: ShareInfo[]) => {
      const resolved: ResolvedShare[] = []
      for (const share of shares) {
        try {
          const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(share.userId)
          const result = await graphqlClient.request<{
            Employee: Array<{ displayName?: string; firstName?: string; lastName?: string; pictureThumbnail?: string }>
          }>(query)
          const emp = result.Employee?.[0]
          const name =
            emp?.displayName || `${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`.trim() || share.userId.slice(0, 8)
          const initials =
            name
              .split(' ')
              .map((p: string) => p[0])
              .filter(Boolean)
              .join('')
              .toUpperCase()
              .slice(0, 2) || '??'
          resolved.push({ ...share, displayName: name, pictureThumbnail: emp?.pictureThumbnail, initials })
        } catch {
          resolved.push({ ...share, displayName: share.userId.slice(0, 8) + '…', initials: '??' })
        }
      }
      return resolved
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedUsers([])
      setDefaultPermission('view')
      setError(null)
      setSentSuccess(false)
      setLoadingShares(true)
      DriveApiService.setAccessToken(accessToken)

      Promise.all([
        DriveApiService.getSharedUsers(entityType, entityId).catch(() => [] as ShareInfo[]),
        DriveApiService.getShareLinks(entityType, entityId).catch(() => [] as ShareLinkInfo[])
      ]).then(async ([shares, links]) => {
        setShareLinks(links)
        const resolved = await resolveShareUsers(shares)
        setResolvedShares(resolved)
        setLoadingShares(false)
      })
    }
  }, [open, entityType, entityId, accessToken, resolveShareUsers])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) searchEmployees(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchEmployees])

  const filteredResults = useMemo(() => {
    if (!searchResults || searchQuery.length < 2) return []
    const selectedIds = new Set(selectedUsers.map(u => u.id))
    const existingUserIds = new Set(resolvedShares.map(s => s.userId))
    return searchResults.filter(
      emp => emp.userId !== currentUserId && !selectedIds.has(emp.id) && !existingUserIds.has(emp.userId ?? '')
    )
  }, [searchResults, selectedUsers, currentUserId, searchQuery, resolvedShares])

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

  const updateUserPermission = useCallback((userId: string, perm: Permission) => {
    setSelectedUsers(prev => prev.map(u => (u.id === userId ? { ...u, permission: perm } : u)))
  }, [])

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(p => p[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  const getAvatarUrl = (pic?: string) => {
    if (!pic) return undefined
    return pic.startsWith('data:') ? pic : `data:image/png;base64,${pic}`
  }

  const handleSubmit = useCallback(async () => {
    if (selectedUsers.length === 0) {
      setError(t('share-dialog-error-select'))
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const recipients = selectedUsers.map(u => ({
        userId: (u.userId || u.id) as string,
        permission: u.permission
      }))
      await DriveApiService.shareItem(entityType, entityId, recipients)
      setSentSuccess(true)
      toast.success(t('share-dialog-toast', { count: selectedUsers.length }))
      setTimeout(() => onOpenChange(false), 1200)
    } catch {
      setError(t('share-dialog-error-failed'))
      setIsSubmitting(false)
    }
  }, [selectedUsers, entityType, entityId, t, onOpenChange])

  const handleRevokeShare = useCallback(async (shareId: string) => {
    try {
      await DriveApiService.revokeShare(shareId)
      setResolvedShares(prev => prev.filter(s => s.id !== shareId))
    } catch {
      /* ignore */
    }
  }, [])

  const handleUpdateSharePermission = useCallback(async (shareId: string, perm: string) => {
    try {
      await DriveApiService.updateSharePermission(shareId, perm)
      setResolvedShares(prev => prev.map(s => (s.id === shareId ? { ...s, permission: perm as Permission } : s)))
    } catch {
      /* ignore */
    }
  }, [])

  const handleCreateLink = useCallback(async () => {
    setCreatingLink(true)
    try {
      const link = await DriveApiService.createShareLink(entityType, entityId, { permission: 'view' })
      setShareLinks(prev => [...prev, link])
    } catch {
      /* ignore */
    }
    setCreatingLink(false)
  }, [entityType, entityId])

  const handleCopyLink = useCallback(
    (token: string) => {
      const url = `${globalThis.location?.origin ?? ''}/shared/${token}`
      navigator.clipboard.writeText(url)
      toast.success(t('share-dialog-link-copied'))
    },
    [t]
  )

  const handleDeactivateLink = useCallback(async (linkId: string) => {
    try {
      await DriveApiService.deactivateShareLink(linkId)
      setShareLinks(prev => prev.map(l => (l.id === linkId ? { ...l, isActive: false } : l)))
    } catch {
      /* ignore */
    }
  }, [])

  const permissionSelect = (value: Permission, onChange: (v: Permission) => void, compact = false) => (
    <Select value={value} onValueChange={v => onChange(v as Permission)}>
      <SelectTrigger
        className={compact ? 'gba:w-[140px] gba:h-8 gba:flex-shrink-0' : 'gba:w-full'}
        data-testid={`${testId}-perm-select`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="view">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Eye className="gba:w-3 gba:h-3" />
            {t('share-dialog-can-view')}
          </div>
        </SelectItem>
        <SelectItem value="comment">
          <div className="gba:flex gba:items-center gba:gap-2">
            <MessageSquare className="gba:w-3 gba:h-3" />
            {t('share-dialog-can-comment')}
          </div>
        </SelectItem>
        <SelectItem value="edit">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Pencil className="gba:w-3 gba:h-3" />
            {t('share-dialog-can-edit')}
          </div>
        </SelectItem>
        <SelectItem value="admin">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Shield className="gba:w-3 gba:h-3" />
            {t('share-dialog-can-admin')}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg gba:overflow-hidden" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('share-dialog-title')}
          </DialogTitle>
          <DialogDescription>{t('share-dialog-description', { title: entityName })}</DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('share-dialog-success-title')}</h3>
            <p className="gba:text-muted-foreground">
              {selectedUsers.length === 1
                ? t('share-dialog-success-single', { name: selectedUsers[0].displayName })
                : t('share-dialog-success-multi', { count: selectedUsers.length })}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-5 gba:py-4 gba:overflow-y-auto gba:max-h-[60vh]">
            <div className="gba:space-y-2">
              <Label>{t('share-dialog-default-permission')}</Label>
              {permissionSelect(defaultPermission, setDefaultPermission)}
            </div>

            <div className="gba:space-y-2">
              <Label>{t('share-dialog-add-people')}</Label>
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder={t('share-dialog-search-placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-10"
                  data-testid={`${testId}-search`}
                />
                {isSearching && (
                  <Spinner size="sm" className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2" />
                )}
              </div>
              {filteredResults.length > 0 && (
                <div className="gba:relative gba:z-50">
                  <div className="gba:max-h-40 gba:overflow-y-auto gba:border gba:rounded-md gba:bg-card gba:shadow-lg gba:p-1">
                    {filteredResults.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-md gba:hover:bg-muted gba:transition-colors gba:text-left"
                        onClick={() => addUser(user)}
                        data-testid={`${testId}-option-${user.id}`}
                      >
                        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                          {user.pictureThumbnail && (
                            <AvatarImage src={getAvatarUrl(user.pictureThumbnail)} alt={user.displayName} />
                          )}
                          <AvatarFallback className="gba:text-xs">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:font-medium gba:text-sm gba:truncate">{user.displayName}</p>
                          {(user.jobPositionName || user.organizationalUnitName) && (
                            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                              {[user.jobPositionName, user.organizationalUnitName].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchQuery.length >= 2 && !isSearching && filteredResults.length === 0 && (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-2">
                  {t('share-dialog-no-people', { query: searchQuery })}
                </p>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="gba:space-y-2">
                <Label>{t('share-dialog-people-access', { count: selectedUsers.length })}</Label>
                <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-40 gba:overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="gba:flex gba:items-center gba:gap-2 gba:p-2.5">
                      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                        {user.pictureThumbnail && (
                          <AvatarImage src={getAvatarUrl(user.pictureThumbnail)} alt={user.displayName} />
                        )}
                        <AvatarFallback className="gba:text-xs">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:font-medium gba:text-sm gba:truncate">{user.displayName}</p>
                      </div>
                      {permissionSelect(user.permission, p => updateUserPermission(user.id, p), true)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:hover:bg-destructive-secondary gba:hover:text-destructive"
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

            {(resolvedShares.length > 0 || loadingShares) && (
              <div className="gba:space-y-2">
                <Label>{t('share-dialog-manage-title')}</Label>
                {loadingShares ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-4">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-40 gba:overflow-y-auto">
                    {resolvedShares.map(share => (
                      <div key={share.id} className="gba:flex gba:items-center gba:gap-2 gba:p-2.5">
                        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                          {share.pictureThumbnail && (
                            <AvatarImage src={getAvatarUrl(share.pictureThumbnail)} alt={share.displayName} />
                          )}
                          <AvatarFallback className="gba:text-xs">{share.initials}</AvatarFallback>
                        </Avatar>
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:font-medium gba:text-sm gba:truncate">{share.displayName}</p>
                        </div>
                        {permissionSelect(share.permission, p => handleUpdateSharePermission(share.id, p), true)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:hover:bg-destructive-secondary gba:hover:text-destructive"
                          onClick={() => handleRevokeShare(share.id)}
                          data-testid={`${testId}-revoke-${share.id}`}
                        >
                          <X className="gba:w-4 gba:h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-2">
                <Link2 className="gba:w-4 gba:h-4" />
                {t('share-dialog-link-section')}
              </Label>
              {shareLinks.map(link => (
                <div
                  key={link.id}
                  className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:border gba:rounded-md gba:bg-muted/30"
                >
                  <Link2 className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
                  <span className="gba:flex-1 gba:text-xs gba:text-muted-foreground gba:truncate gba:font-mono gba:min-w-0">
                    ...{link.token.slice(-8)}
                  </span>
                  <span
                    className={`gba:text-xs gba:flex-shrink-0 ${link.isActive ? 'gba:text-success' : 'gba:text-muted-foreground'}`}
                  >
                    {link.isActive ? t('share-dialog-link-active') : t('share-dialog-link-inactive')}
                  </span>
                  {link.isActive && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-7 gba:w-7 gba:flex-shrink-0"
                        onClick={() => handleCopyLink(link.token)}
                        data-testid={`${testId}-copy-link-${link.id}`}
                      >
                        <Copy className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-7 gba:text-xs gba:flex-shrink-0"
                        onClick={() => handleDeactivateLink(link.id)}
                        data-testid={`${testId}-deactivate-${link.id}`}
                      >
                        {t('share-dialog-link-deactivate')}
                      </Button>
                    </>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateLink}
                disabled={creatingLink}
                data-testid={`${testId}-create-link`}
              >
                {creatingLink ? (
                  <Spinner size="sm" className="gba:mr-2" />
                ) : (
                  <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                )}
                {t('share-dialog-link-create')}
              </Button>
            </div>

            {error && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-destructive-secondary gba:text-destructive gba:rounded-md gba:text-sm">
                <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-info-secondary gba:rounded-md gba:text-sm">
              <Share2 className="gba:w-4 gba:h-4 gba:text-info gba:flex-shrink-0 gba:mt-0.5" />
              <p className="gba:text-muted-foreground">{t('share-dialog-info')}</p>
            </div>
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common-cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedUsers.length === 0}
              data-testid={`${testId}-submit`}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  {t('share-dialog-sharing')}
                </>
              ) : (
                <>
                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('share-dialog-share-button')}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
