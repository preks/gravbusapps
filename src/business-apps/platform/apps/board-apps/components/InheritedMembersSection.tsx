import React, { useCallback } from 'react'
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Eye, Pencil, Shield, FolderClosed, X } from 'lucide-react'
import { toast } from 'sonner'
import { CollectionApiService } from '../services/CollectionApiService'
import type { CollectionMember, CollectionMemberRole } from '../types/collection'

export interface InheritedMembersSectionProps {
  members: CollectionMember[]
  collectionId?: string | null
  collectionName?: string
  overriddenUserIds: Set<string>
  onMembersChanged: (members: CollectionMember[]) => void
  onSharesChanged?: () => void
  'data-testid'?: string
}

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export const InheritedMembersSection: React.FC<InheritedMembersSectionProps> = ({
  members,
  collectionId,
  collectionName,
  overriddenUserIds,
  onMembersChanged,
  onSharesChanged,
  'data-testid': testId = 'inherited-members'
}) => {
  const handleUpdateRole = useCallback(
    async (member: CollectionMember, role: CollectionMemberRole) => {
      if (!collectionId) return
      if (!member.userId?.trim() && !member.teamId?.trim()) {
        toast.error('Cannot update role: missing user or team id')
        return
      }
      const ok = await CollectionApiService.updateMemberRole(collectionId, member, role)
      if (ok) {
        onMembersChanged(members.map(m => (m.id === member.id ? { ...m, role } : m)))
        toast.success('Space role updated')
        onSharesChanged?.()
      } else {
        toast.error('Failed to update role')
      }
    },
    [collectionId, members, onMembersChanged, onSharesChanged]
  )

  const handleRemove = useCallback(
    async (member: CollectionMember, userName?: string) => {
      if (!collectionId) return
      if (!member.userId?.trim() && !member.teamId?.trim()) {
        toast.error('Cannot remove member: missing user or team id')
        return
      }
      if (
        !confirm(
          `Remove ${userName || 'this member'} from this space? They will lose access to all boards in this space.`
        )
      )
        return
      const ok = await CollectionApiService.removeMember(collectionId, member)
      if (ok) {
        onMembersChanged(members.filter(m => m.id !== member.id))
        toast.success('Member removed from space')
        onSharesChanged?.()
      } else {
        toast.error('Failed to remove member')
      }
    },
    [collectionId, members, onMembersChanged, onSharesChanged]
  )

  if (members.length === 0) return null

  return (
    <div className="gba:space-y-1 gba:mb-4">
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:mb-2">
        <FolderClosed className="gba:w-3.5 gba:h-3.5" />
        Via space &quot;{collectionName || 'space'}&quot;
      </div>
      <div className="gba:border gba:rounded-md gba:divide-y gba:max-h-52 gba:overflow-y-auto">
        {members.map(member => {
          const isOwner = member.role === 'owner'
          const hasOverride = overriddenUserIds.has(member.userId)
          return (
            <div
              key={member.id}
              className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:group"
              data-testid={`${testId}-${member.id}`}
            >
              <Avatar className="gba:h-8 gba:w-8">
                {member.userAvatar && <AvatarImage src={member.userAvatar} alt={member.userName || member.userId} />}
                <AvatarFallback className="gba:text-xs">{getInitials(member.userName || member.userId)}</AvatarFallback>
              </Avatar>
              <div className="gba:flex-1 gba:min-w-0">
                <p className="gba:font-medium gba:text-sm gba:truncate">{member.userName || member.userId}</p>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Space member{hasOverride ? ' · board override active' : ''}
                </p>
              </div>
              {isOwner ? (
                <span className="gba:text-xs gba:text-muted-foreground gba:px-2.5 gba:py-1 gba:rounded-md gba:border gba:border-border">
                  Owner
                </span>
              ) : (
                <>
                  <Select
                    key={`${member.id}-space-role`}
                    value={member.role}
                    onValueChange={v => handleUpdateRole(member, v as CollectionMemberRole)}
                  >
                    <SelectTrigger className="gba:w-28 gba:h-7 gba:text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <span className="gba:flex gba:items-center gba:gap-1.5">
                          <Shield className="gba:w-3 gba:h-3" /> Admin
                        </span>
                      </SelectItem>
                      <SelectItem value="editor">
                        <span className="gba:flex gba:items-center gba:gap-1.5">
                          <Pencil className="gba:w-3 gba:h-3" /> Editor
                        </span>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <span className="gba:flex gba:items-center gba:gap-1.5">
                          <Eye className="gba:w-3 gba:h-3" /> Viewer
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-7 gba:w-7 gba:p-0 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:text-muted-foreground gba:hover:text-destructive"
                    onClick={() => handleRemove(member, member.userName)}
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
    </div>
  )
}
