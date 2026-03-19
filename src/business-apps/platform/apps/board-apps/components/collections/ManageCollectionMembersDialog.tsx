import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Spinner,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Users, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { CollectionMember, CollectionMemberRole } from '../../types/collection'
import { CollectionApiService } from '../../services/CollectionApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEES_LIGHT_BY_USER_IDS } from '@/common/data/employee/queries/employeeQueries'

export interface ManageCollectionMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  collectionName: string
  accessToken: string
  onMembersChanged?: () => void
  onAddMoreMembers?: () => void
  'data-testid'?: string
}

const ROLE_LABELS: Record<CollectionMemberRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer'
}

export const ManageCollectionMembersDialog: React.FC<ManageCollectionMembersDialogProps> = ({
  open,
  onOpenChange,
  collectionId,
  collectionName,
  accessToken,
  onMembersChanged,
  onAddMoreMembers,
  'data-testid': testId = 'manage-collection-members'
}) => {
  const [members, setMembers] = useState<CollectionMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const raw = await CollectionApiService.getMembers(collectionId)
      setMembers(raw)
      const resolved = await resolveUserProfiles(raw)
      setMembers(resolved)
    } catch {
      // keep existing state
    } finally {
      setIsLoading(false)
    }
  }, [collectionId, resolveUserProfiles])

  useEffect(() => {
    if (open) void loadMembers()
  }, [open, loadMembers])

  const handleRoleChange = useCallback(
    async (memberId: string, role: CollectionMemberRole) => {
      const ok = await CollectionApiService.updateMemberRole(collectionId, memberId, role)
      if (ok) {
        setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, role } : m)))
        onMembersChanged?.()
        toast.success('Role updated')
      }
    },
    [collectionId, onMembersChanged]
  )

  const handleRemove = useCallback(
    async (memberId: string, userName?: string) => {
      if (!confirm(`Remove ${userName || 'this member'} from the collection?`)) return
      const ok = await CollectionApiService.removeMember(collectionId, memberId)
      if (ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId))
        onMembersChanged?.()
        toast.success('Member removed')
      }
    },
    [collectionId, onMembersChanged]
  )

  const getInitials = (name: string): string =>
    name
      .split(' ')
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:w-5 gba:h-5 gba:text-primary" />
            Members
          </DialogTitle>
          <DialogDescription>
            Manage who has access to &quot;{collectionName}&quot; and all boards within.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:py-4">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="lg" />
            </div>
          ) : members.length === 0 ? (
            <div className="gba:text-center gba:py-8">
              <Users className="gba:w-10 gba:h-10 gba:text-muted-foreground gba:mx-auto gba:mb-3" />
              <p className="gba:text-sm gba:text-muted-foreground">No members yet</p>
            </div>
          ) : (
            <div className="gba:space-y-1 gba:max-h-80 gba:overflow-y-auto">
              {members.map(member => {
                const isOwner = member.role === 'owner'
                return (
                  <div
                    key={member.id}
                    className="gba:flex gba:items-center gba:gap-3 gba:p-2.5 gba:rounded-md gba:hover:bg-muted/30 gba:transition-colors"
                    data-testid={`${testId}-member-${member.id}`}
                  >
                    <Avatar size="sm" className="gba:h-8 gba:w-8">
                      {member.userAvatar && (
                        <AvatarImage src={member.userAvatar} alt={member.userName || member.userId} />
                      )}
                      <AvatarFallback className="gba:text-xs">
                        {getInitials(member.userName || member.userId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:truncate">{member.userName || member.userId}</p>
                    </div>

                    {isOwner ? (
                      <span className="gba:text-xs gba:text-muted-foreground gba:px-2.5 gba:py-1 gba:rounded-md gba:border gba:border-border">
                        {ROLE_LABELS.owner}
                      </span>
                    ) : (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={v => handleRoleChange(member.id, v as CollectionMemberRole)}
                        >
                          <SelectTrigger className="gba:w-28 gba:h-7 gba:text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">
                              <span className="gba:flex gba:items-center gba:gap-1.5">{ROLE_ICONS.editor} Editor</span>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <span className="gba:flex gba:items-center gba:gap-1.5">{ROLE_ICONS.viewer} Viewer</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-7 gba:w-7 gba:p-0 gba:text-muted-foreground gba:hover:text-destructive"
                          onClick={() => handleRemove(member.id, member.userName)}
                          data-testid={`${testId}-remove-${member.id}`}
                        >
                          <X className="gba:w-3.5 gba:h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="gba:flex gba:justify-between gba:pt-2 gba:border-t gba:border-border">
          {onAddMoreMembers ? (
            <Button variant="outline" size="sm" onClick={onAddMoreMembers} data-testid={`${testId}-add-more`}>
              <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" /> Add members
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-close`}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
