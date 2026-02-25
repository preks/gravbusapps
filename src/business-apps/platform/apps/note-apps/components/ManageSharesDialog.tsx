/**
 * ManageSharesDialog Component
 *
 * Dialog for managing existing note shares.
 * - View all users with access
 * - Change permission levels
 * - Revoke access
 * - Create/manage share links
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
  Label,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Users,
  Link as LinkIcon,
  Trash2,
  Copy,
  Eye,
  Pencil,
  MessageSquare,
  AlertCircle,
  Plus,
  Settings2
} from 'lucide-react'
import { toast } from 'sonner'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { NoteApiService } from '../services/NoteApiService'
import type { NotePermission } from '../types'
import translations from '../_i18n'

export interface ManageSharesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string
  noteTitle: string
  accessToken: string
  onSharesChanged?: () => void
  'data-testid'?: string
}

interface ShareUser {
  shareId: string
  userId: string
  userName: string
  userAvatar?: string
  permission: NotePermission
  sharedAt: string
}

interface ShareLink {
  id: string
  token: string
  permission: NotePermission
  expiresAt?: string
  maxUses?: number
  useCount: number
  isActive: boolean
  name?: string
  createdAt: string
}

export const ManageSharesDialog: React.FC<ManageSharesDialogProps> = ({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  accessToken,
  onSharesChanged,
  'data-testid': testId = 'manage-shares-dialog'
}) => {
  const { t } = useTranslation(translations)
  // State
  const [shareUsers, setShareUsers] = useState<ShareUser[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'people' | 'links'>('people')

  // New link form
  const [newLinkPermission, setNewLinkPermission] = useState<NotePermission>('view')
  const [newLinkExpiry, setNewLinkExpiry] = useState<string>('')
  const [newLinkPassword, setNewLinkPassword] = useState('')
  const [isCreatingLink, setIsCreatingLink] = useState(false)

  // GraphQL client
  const graphqlClient = useGraphQLClient(accessToken)

  /**
   * Fetch user info by userId
   */
  const fetchUserInfo = useCallback(
    async (userId: string): Promise<{ userName: string; userAvatar?: string } | null> => {
      if (!graphqlClient) return null

      try {
        const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
        const result = await graphqlClient.request<{
          Employee: Array<{
            displayName: string
            firstName?: string
            lastName?: string
            pictureThumbnail?: string
          }>
        }>(query)

        const emp = result.Employee?.[0]
        if (emp) {
          return {
            userName: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
            userAvatar: emp.pictureThumbnail
              ? emp.pictureThumbnail.startsWith('data:')
                ? emp.pictureThumbnail
                : `data:image/png;base64,${emp.pictureThumbnail}`
              : undefined
          }
        }
      } catch (e) {
        console.error('[ManageShares] Failed to fetch user info:', e)
      }
      return null
    },
    [graphqlClient]
  )

  /**
   * Load shares and links
   */
  const loadData = useCallback(async () => {
    if (!noteId) return

    setIsLoading(true)
    setError(null)

    try {
      // Load shares
      const shares = await NoteApiService.getSharedUsers(noteId)

      // Fetch user info for each share
      const usersWithInfo = await Promise.all(
        shares.map(async (share): Promise<ShareUser> => {
          const info = await fetchUserInfo(share.userId)
          return {
            shareId: share.id,
            userId: share.userId,
            userName: info?.userName || `User ${share.userId.slice(0, 8)}...`,
            userAvatar: info?.userAvatar,
            permission: share.permission,
            sharedAt: share.sharedAt
          }
        })
      )

      setShareUsers(usersWithInfo)

      // Load share links
      const links = await NoteApiService.getShareLinks(noteId)
      setShareLinks(links)
    } catch (err) {
      console.error('[ManageShares] Failed to load data:', err)
      setError(t('manage-load-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [noteId, fetchUserInfo])

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  /**
   * Update share permission
   */
  const handleUpdatePermission = useCallback(
    async (shareId: string, permission: NotePermission) => {
      try {
        const success = await NoteApiService.updateSharePermission(shareId, permission)
        if (success) {
          setShareUsers(prev => prev.map(u => (u.shareId === shareId ? { ...u, permission } : u)))
          onSharesChanged?.()
          toast.success(t('manage-toast-permission'))
        }
      } catch {
        toast.error(t('share-error-failed'))
      }
    },
    [onSharesChanged]
  )

  /**
   * Revoke share
   */
  const handleRevokeShare = useCallback(
    async (shareId: string) => {
      try {
        const success = await NoteApiService.revokeShareById(shareId)
        if (success) {
          setShareUsers(prev => prev.filter(u => u.shareId !== shareId))
          onSharesChanged?.()
          toast.success(t('manage-toast-revoked'))
        }
      } catch {
        toast.error(t('share-error-failed'))
      }
    },
    [onSharesChanged]
  )

  /**
   * Create share link
   */
  const handleCreateLink = useCallback(async () => {
    setIsCreatingLink(true)

    try {
      const options: Parameters<typeof NoteApiService.createShareLink>[1] = {
        permission: newLinkPermission
      }

      if (newLinkExpiry) {
        options.expiresAt = new Date(newLinkExpiry).toISOString()
      }

      if (newLinkPassword) {
        options.password = newLinkPassword
      }

      const result = await NoteApiService.createShareLink(noteId, options)

      if (result) {
        // Copy link to clipboard
        await navigator.clipboard.writeText(result.url)
        toast.success(t('manage-toast-link-created'))

        // Reload links
        const links = await NoteApiService.getShareLinks(noteId)
        setShareLinks(links)

        // Reset form
        setNewLinkExpiry('')
        setNewLinkPassword('')
      }
    } catch {
      toast.error(t('share-error-failed'))
    } finally {
      setIsCreatingLink(false)
    }
  }, [noteId, newLinkPermission, newLinkExpiry, newLinkPassword])

  /**
   * Copy link
   */
  const handleCopyLink = useCallback(async (token: string) => {
    const url = `${window.location.origin}/notes/shared/${token}`
    await navigator.clipboard.writeText(url)
    toast.success(t('manage-toast-link-copied'))
  }, [])

  /**
   * Deactivate link
   */
  const handleDeactivateLink = useCallback(async (linkId: string) => {
    try {
      const success = await NoteApiService.deactivateShareLink(linkId)
      if (success) {
        setShareLinks(prev => prev.map(l => (l.id === linkId ? { ...l, isActive: false } : l)))
        toast.success(t('manage-toast-link-deactivated'))
      }
    } catch {
      toast.error(t('share-error-failed'))
    }
  }, [])

  /**
   * Delete link
   */
  const handleDeleteLink = useCallback(async (linkId: string) => {
    try {
      const success = await NoteApiService.deleteShareLink(linkId)
      if (success) {
        setShareLinks(prev => prev.filter(l => l.id !== linkId))
        toast.success(t('manage-toast-link-deleted'))
      }
    } catch {
      toast.error(t('share-error-failed'))
    }
  }, [])

  /**
   * Get initials for avatar
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
   * Format date
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Settings2 className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('manage-title')}
          </DialogTitle>
          <DialogDescription>
            {t('manage-description', { title: noteTitle || t('title-untitled-note') })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="gba:py-12 gba:flex gba:items-center gba:justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="gba:py-8 gba:text-center">
            <AlertCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
            <p className="gba:text-destructive">{error}</p>
            <Button variant="outline" onClick={loadData} className="gba:mt-4">
              {t('manage-retry')}
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'people' | 'links')}>
            <TabsList className="gba:w-full">
              <TabsTrigger value="people" className="gba:flex-1">
                <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('manage-people-tab', { count: shareUsers.length })}
              </TabsTrigger>
              <TabsTrigger value="links" className="gba:flex-1">
                <LinkIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('manage-links-tab', { count: shareLinks.length })}
              </TabsTrigger>
            </TabsList>

            {/* People Tab */}
            <TabsContent value="people" className="gba:mt-4">
              {shareUsers.length === 0 ? (
                <div className="gba:py-8 gba:text-center gba:text-muted-foreground">
                  <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
                  <p>{t('manage-not-shared')}</p>
                </div>
              ) : (
                <div className="gba:space-y-2 gba:max-h-80 gba:overflow-y-auto">
                  {shareUsers.map(user => (
                    <div
                      key={user.shareId}
                      className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/30"
                    >
                      <Avatar className="gba:h-10 gba:w-10">
                        {user.userAvatar && <AvatarImage src={user.userAvatar} alt={user.userName} />}
                        <AvatarFallback>{getInitials(user.userName)}</AvatarFallback>
                      </Avatar>

                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:font-medium gba:truncate">{user.userName}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {t('manage-shared-at', { date: formatDate(user.sharedAt) })}
                        </p>
                      </div>

                      <Select
                        value={user.permission}
                        onValueChange={v => handleUpdatePermission(user.shareId, v as NotePermission)}
                      >
                        <SelectTrigger className="gba:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Eye className="gba:w-4 gba:h-4" />
                              {t('manage-permission-view-label')}
                            </div>
                          </SelectItem>
                          <SelectItem value="comment">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <MessageSquare className="gba:w-4 gba:h-4" />
                              {t('manage-permission-comment-label')}
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Pencil className="gba:w-4 gba:h-4" />
                              {t('manage-permission-edit-label')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:gba:bg-destructive/10 hover:gba:text-destructive"
                        onClick={() => handleRevokeShare(user.shareId)}
                      >
                        <Trash2 className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="gba:mt-4 gba:space-y-4">
              {/* Create new link */}
              <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-muted/20">
                <h4 className="gba:font-medium gba:mb-3 gba:flex gba:items-center gba:gap-2">
                  <Plus className="gba:w-4 gba:h-4" />
                  {t('manage-create-link')}
                </h4>

                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div className="gba:space-y-2">
                    <Label>{t('manage-permission')}</Label>
                    <Select value={newLinkPermission} onValueChange={v => setNewLinkPermission(v as NotePermission)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">{t('manage-can-view')}</SelectItem>
                        <SelectItem value="comment">{t('manage-can-comment')}</SelectItem>
                        <SelectItem value="edit">{t('manage-can-edit')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="gba:space-y-2">
                    <Label>{t('manage-expires-optional')}</Label>
                    <Input
                      type="datetime-local"
                      value={newLinkExpiry}
                      onChange={e => setNewLinkExpiry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="gba:mt-4">
                  <Button onClick={handleCreateLink} disabled={isCreatingLink}>
                    {isCreatingLink ? (
                      <>
                        <Spinner size="sm" className="gba:mr-2" />
                        {t('manage-creating')}
                      </>
                    ) : (
                      <>
                        <LinkIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('manage-create-link-btn')}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Existing links */}
              {shareLinks.length === 0 ? (
                <div className="gba:py-8 gba:text-center gba:text-muted-foreground">
                  <LinkIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
                  <p>{t('manage-no-links')}</p>
                </div>
              ) : (
                <div className="gba:space-y-2 gba:max-h-48 gba:overflow-y-auto">
                  {shareLinks.map(link => (
                    <div
                      key={link.id}
                      className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:border ${
                        link.isActive ? 'gba:bg-card' : 'gba:bg-muted/50 gba:opacity-60'
                      }`}
                    >
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant={link.isActive ? 'default' : 'secondary'}>
                            {link.isActive ? t('manage-active') : t('manage-inactive')}
                          </Badge>
                          <Badge variant="outline">
                            {link.permission === 'view' && <Eye className="gba:w-3 gba:h-3 gba:mr-1" />}
                            {link.permission === 'comment' && <MessageSquare className="gba:w-3 gba:h-3 gba:mr-1" />}
                            {link.permission === 'edit' && <Pencil className="gba:w-3 gba:h-3 gba:mr-1" />}
                            {link.permission}
                          </Badge>
                        </div>
                        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                          {t('manage-created-at', { date: formatDate(link.createdAt) })}
                          {link.expiresAt && ` • ${t('manage-expires-at', { date: formatDate(link.expiresAt) })}`}
                          {link.useCount > 0 && ` • ${t('manage-uses-count', { count: link.useCount })}`}
                        </p>
                      </div>

                      <Button variant="ghost" size="icon" onClick={() => handleCopyLink(link.token)}>
                        <Copy className="gba:w-4 gba:h-4" />
                      </Button>

                      {link.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateLink(link.id)}
                          className="hover:gba:bg-warning/10 hover:gba:text-warning"
                        >
                          <AlertCircle className="gba:w-4 gba:h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLink(link.id)}
                        className="hover:gba:bg-destructive/10 hover:gba:text-destructive"
                      >
                        <Trash2 className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('share-done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ManageSharesDialog
