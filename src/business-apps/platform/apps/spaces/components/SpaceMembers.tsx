/**
 * SpaceMembers - Member list and management
 *
 * Clean member list with role management dropdown
 * Following NEWWORK design system
 */

import React, { useState } from 'react'
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { MoreHorizontal, UserPlus, Check, UserMinus } from 'lucide-react'
import type { SpaceMember, SpaceMemberRole } from '../types/space.types'
import translations from '../_i18n'

export interface EnrichedSpaceMember extends SpaceMember {
  userName?: string
  userAvatar?: string
}

export interface SpaceMembersProps {
  members: EnrichedSpaceMember[]
  currentUserId?: string
  isOwner?: boolean
  canManageMembers?: boolean
  onInvite?: () => void
  onUpdateRole?: (userId: string, role: SpaceMemberRole) => void
  onRemoveMember?: (userId: string) => void
  'data-testid'?: string
}

// Get initials for avatar fallback
const getInitials = (name?: string, fallback?: string) => {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return fallback?.slice(0, 2).toUpperCase() || '??'
}

export const SpaceMembers: React.FC<SpaceMembersProps> = ({
  members,
  currentUserId,
  isOwner = false,
  canManageMembers = false,
  onInvite,
  onUpdateRole,
  onRemoveMember,
  'data-testid': testId = 'space-members'
}) => {
  const { t } = useTranslation(translations)
  const assignableRoles: { role: SpaceMemberRole; label: string; description: string }[] = [
    { role: 'admin', label: t('common-admin'), description: t('members-role-admin-description') },
    { role: 'editor', label: t('common-editor'), description: t('members-role-editor-description') },
    { role: 'viewer', label: t('common-viewer'), description: t('members-role-viewer-description') }
  ]
  const roleLabels: Record<SpaceMemberRole, string> = {
    owner: t('common-owner'),
    admin: t('common-admin'),
    editor: t('common-editor'),
    viewer: t('common-viewer')
  }
  const [loadingMember, setLoadingMember] = useState<string | null>(null)

  // Sort members: owner first, then by role
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, editor: 2, viewer: 3 }
    return roleOrder[a.role] - roleOrder[b.role]
  })

  const handleRoleChange = async (userId: string, memberId: string, newRole: SpaceMemberRole) => {
    if (!onUpdateRole) return
    setLoadingMember(memberId)
    try {
      await onUpdateRole(userId, newRole)
    } finally {
      setLoadingMember(null)
    }
  }

  const handleRemove = async (userId: string, memberId: string) => {
    if (!onRemoveMember) return
    setLoadingMember(memberId)
    try {
      await onRemoveMember(userId)
    } finally {
      setLoadingMember(null)
    }
  }

  // Can invite if owner or admin
  const canInvite = isOwner || canManageMembers

  return (
    <div data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <span className="gba:text-sm gba:text-muted-foreground">
          {t('common-member-count', { count: members.length })}
        </span>
        {canInvite && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onInvite}
            className="gba:gap-2"
            data-testid={`${testId}-invite-button`}
          >
            <UserPlus className="gba:w-4 gba:h-4" />
            {t('common-invite')}
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="gba:space-y-1">
        {sortedMembers.map(member => {
          const isCurrentUser = member.userId === currentUserId
          const canManage = (isOwner || canManageMembers) && !isCurrentUser && member.role !== 'owner'
          const isLoading = loadingMember === member.id

          return (
            <div
              key={member.id}
              className="gba:group gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:transition-colors hover:gba:bg-muted/50"
              data-testid={`${testId}-member-${member.id}`}
            >
              {/* Avatar */}
              <Avatar className="gba:w-9 gba:h-9">
                {member.userAvatar ? (
                  <AvatarImage src={member.userAvatar} alt={member.userName || t('common-unknown')} />
                ) : null}
                <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-sm gba:font-medium">
                  {getInitials(member.userName, member.userId)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="gba:flex-1 gba:min-w-0">
                <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:block">
                  {member.userName || t('common-unknown')}
                  {isCurrentUser && (
                    <span className="gba:text-muted-foreground gba:font-normal">
                      {' '}
                      ({t('common-you').toLowerCase()})
                    </span>
                  )}
                </span>
              </div>

              {/* Role Badge */}
              <Badge variant="secondary" className="gba:text-xs">
                {roleLabels[member.role]}
              </Badge>

              {/* Actions Dropdown */}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="gba:w-8 gba:h-8 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:text-muted-foreground hover:gba:bg-accent hover:gba:text-foreground disabled:gba:opacity-50"
                      disabled={isLoading}
                      data-testid={`${testId}-member-actions-${member.id}`}
                    >
                      {isLoading ? (
                        <div className="gba:w-4 gba:h-4 gba:border-2 gba:border-muted-foreground/30 gba:border-t-muted-foreground gba:rounded-full gba:animate-spin" />
                      ) : (
                        <MoreHorizontal className="gba:w-4 gba:h-4" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="gba:w-56">
                    <div className="gba:px-2 gba:py-1.5">
                      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                        {t('members-change-role')}
                      </p>
                    </div>
                    {assignableRoles.map(({ role, label, description }) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => handleRoleChange(member.userId, member.id, role)}
                        className="gba:flex gba:items-start gba:gap-2 gba:py-2"
                        data-testid={`${testId}-role-${role}-${member.id}`}
                      >
                        <div className="gba:flex-1">
                          <p className="gba:text-sm gba:font-medium">{label}</p>
                          <p className="gba:text-xs gba:text-muted-foreground">{description}</p>
                        </div>
                        {member.role === role && <Check className="gba:w-4 gba:h-4 gba:text-primary gba:mt-0.5" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemove(member.userId, member.id)}
                      className="gba:text-destructive focus:gba:text-destructive gba:gap-2"
                      data-testid={`${testId}-remove-${member.id}`}
                    >
                      <UserMinus className="gba:w-4 gba:h-4" />
                      {t('members-remove-from-space')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SpaceMembers
