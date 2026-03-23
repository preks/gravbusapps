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
import { Share2, Search, X, CheckCircle, Eye, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEES_LIGHT_BY_USER_IDS } from '@/common/data/employee/queries/employeeQueries'
import type { CollectionMember, CollectionMemberRole } from '../../types/collection'
import { CollectionApiService } from '../../services/CollectionApiService'

export interface ShareCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  collectionName: string
  accessToken: string
  currentUserId: string
  onShareComplete?: () => void
  'data-testid'?: string
}

interface SelectedUser extends EmployeeLiteOption {
  role: CollectionMemberRole
}

export const ShareCollectionDialog: React.FC<ShareCollectionDialogProps> = ({
  open,
  onOpenChange,
  collectionId,
  collectionName,
  accessToken,
  currentUserId,
  onShareComplete,
  'data-testid': testId = 'share-collection-dialog'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [defaultRole, setDefaultRole] = useState<CollectionMemberRole>('viewer')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [existingMembers, setExistingMembers] = useState<CollectionMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const { employees: searchResults, loading: isSearching, search: searchEmployees } = useEmployeeSearch(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  const resolveUserProfiles = useCallback(
    async (raw: CollectionMember[]) => {
      const userIds = raw.map(m => m.userId).filter(Boolean)
      if (userIds.length === 0 || !graphqlClient) return raw
      try {
        const query = GET_EMPLOYEES_LIGHT_BY_USER_IDS(userIds)
        const result = await graphqlClient.request<{
          Employee: Array<{
            userId: string
            displayName: string
            firstName?: string
            lastName?: string
            pictureThumbnail?: string
          }>
        }>(query)
        const empMap = new Map<string, { name: string; avatar?: string }>()
        for (const emp of result.Employee || []) {
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
          const avatar = emp.pictureThumbnail
            ? emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            : undefined
          empMap.set(emp.userId, { name, avatar })
        }
        return raw.map(m => {
          const info = empMap.get(m.userId)
          return info ? { ...m, userName: info.name, userAvatar: info.avatar } : m
        })
      } catch {
        return raw
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedUsers([])
      setDefaultRole('viewer')
      setError(null)
      setSentSuccess(false)
      setLoadingMembers(true)
      CollectionApiService.getMembers(collectionId)
        .then(raw => {
          setExistingMembers(raw)
          return resolveUserProfiles(raw)
        })
        .then(resolved => setExistingMembers(resolved))
        .catch(() => {})
        .finally(() => setLoadingMembers(false))
    }
  }, [open, collectionId, resolveUserProfiles])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) searchEmployees(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchEmployees])

  const filteredResults = useMemo(() => {
    if (!searchResults || searchQuery.length < 2) return []
    const selectedIds = new Set(selectedUsers.map(u => u.id))
    const existingUserIds = new Set(existingMembers.map(m => m.userId))
    return searchResults.filter(
      emp => emp.userId !== currentUserId && !selectedIds.has(emp.id) && !existingUserIds.has(emp.userId || '')
    )
  }, [searchResults, selectedUsers, existingMembers, currentUserId, searchQuery])

  const addUser = useCallback(
    (user: EmployeeLiteOption) => {
      setSelectedUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev
        return [...prev, { ...user, role: defaultRole }]
      })
      setSearchQuery('')
    },
    [defaultRole]
  )

  const removeUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }, [])

  const updateUserRole = useCallback((userId: string, role: CollectionMemberRole) => {
    setSelectedUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)))
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
      setError('Please select at least one person')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const members = selectedUsers
        .filter(u => Boolean(u.userId || u.id))
        .map(u => ({
          userId: (u.userId || u.id) as string,
          role: u.role
        }))

      const success = await CollectionApiService.addMembers(collectionId, members)

      if (!success) {
        setError('Failed to add some members')
        setIsSubmitting(false)
        return
      }

      setSentSuccess(true)
      onShareComplete?.()
      toast.success(`Space shared with ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}`)
      setTimeout(() => onOpenChange(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share space')
      setIsSubmitting(false)
    }
  }, [selectedUsers, collectionId, onShareComplete, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Share2 className="gba:w-5 gba:h-5 gba:text-primary" />
            Share Space
          </DialogTitle>
          <DialogDescription>
            Share &quot;{collectionName}&quot; to give people access to all boards in this space.
          </DialogDescription>
        </DialogHeader>

        {sentSuccess ? (
          <div className="gba:py-8 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Space Shared!</h3>
            <p className="gba:text-muted-foreground">
              {selectedUsers.length === 1
                ? `${selectedUsers[0].displayName} now has access.`
                : `${selectedUsers.length} people now have access.`}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-6 gba:py-4">
            {existingMembers.length > 0 && (
              <div className="gba:space-y-2">
                <Label>Current members ({existingMembers.length})</Label>
                <div className="gba:space-y-1 gba:max-h-32 gba:overflow-y-auto">
                  {existingMembers.map(member => (
                    <div
                      key={member.id}
                      className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded-md gba:bg-muted/20"
                    >
                      <Avatar size="sm" className="gba:h-7 gba:w-7">
                        {member.userAvatar && (
                          <AvatarImage src={member.userAvatar} alt={member.userName || member.userId} />
                        )}
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(member.userName || member.userId)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:flex-1 gba:truncate">{member.userName || member.userId}</span>
                      <span className="gba:text-xs gba:text-muted-foreground gba:capitalize">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loadingMembers && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-2">
                <Spinner className="gba:w-4 gba:h-4" />
              </div>
            )}

            <div className="gba:space-y-2">
              <Label>Default role</Label>
              <Select value={defaultRole} onValueChange={v => setDefaultRole(v as CollectionMemberRole)}>
                <SelectTrigger className="gba:w-full" data-testid={`${testId}-role-select`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Eye className="gba:w-4 gba:h-4" /> Viewer
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Pencil className="gba:w-4 gba:h-4" /> Editor
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
                        {emp.pictureThumbnail && <AvatarImage src={getAvatarUrl(emp.pictureThumbnail)} />}
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
                <Label>Adding ({selectedUsers.length})</Label>
                <div className="gba:space-y-1 gba:max-h-40 gba:overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div
                      key={user.id}
                      className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded-md gba:bg-muted/30"
                    >
                      <Avatar size="sm" className="gba:h-7 gba:w-7">
                        {user.pictureThumbnail && <AvatarImage src={getAvatarUrl(user.pictureThumbnail)} />}
                        <AvatarFallback className="gba:text-xs">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:flex-1 gba:truncate">{user.displayName}</span>
                      <Select value={user.role} onValueChange={v => updateUserRole(user.id, v as CollectionMemberRole)}>
                        <SelectTrigger className="gba:w-28 gba:h-7 gba:text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
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
