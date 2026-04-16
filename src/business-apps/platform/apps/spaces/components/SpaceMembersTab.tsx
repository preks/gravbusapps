/**
 * SpaceMembersTab - Full-page members tab with enriched data
 *
 * Shows detailed member information including:
 * - Role and permissions
 * - Join date
 * - Activity stats (aggregated from space activity)
 * - Last activity timestamp
 * - Online status
 */

import React, { useState, useMemo } from 'react'
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  useTranslation,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Card,
  CardContent
} from '@newwork/nw-design-system'
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Check,
  UserMinus,
  ArrowUpDown,
  Calendar,
  Activity,
  Users,
  Shield,
  Star,
  Edit3,
  Eye,
  Briefcase,
  Building2
} from 'lucide-react'
import type { SpaceMember, SpaceMemberRole, SpaceActivity } from '../types/space.types'
import translations from '../_i18n'
import { formatLocalizedDate } from '../utils/spaceLocalization'

export interface EnrichedSpaceMember extends SpaceMember {
  userName?: string
  userAvatar?: string
  jobTitle?: string
  department?: string
}

export interface MemberActivityStats {
  totalActivities: number
  documentsCreated: number
  documentsEdited: number
  notesCreated: number
  notesEdited: number
  spreadsheetsCreated: number
  spreadsheetsEdited: number
  slidesCreated: number
  slidesEdited: number
  lastActivityAt?: string
}

export interface SpaceMembersTabProps {
  members: EnrichedSpaceMember[]
  activities: SpaceActivity[]
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

// KPI roles to display (exclude owner since there's always just 1)
const kpiRoles: SpaceMemberRole[] = ['admin', 'editor', 'viewer']

// Assignable roles (owner cannot be assigned)
const assignableRoles: SpaceMemberRole[] = ['admin', 'editor', 'viewer']

type SortField = 'name' | 'role' | 'joinedAt' | 'activity'
type SortDirection = 'asc' | 'desc'

export const SpaceMembersTab: React.FC<SpaceMembersTabProps> = ({
  members,
  activities,
  currentUserId,
  isOwner = false,
  canManageMembers = false,
  onInvite,
  onUpdateRole,
  onRemoveMember,
  'data-testid': testId = 'space-members-tab'
}) => {
  const { t, locale } = useTranslation(translations)
  const roleConfig: Record<
    SpaceMemberRole,
    { label: string; icon: React.ElementType; description: string; color: string }
  > = {
    owner: {
      label: t('common-owner'),
      icon: Star,
      description: t('members-role-owner-description'),
      color: 'gba:text-warning'
    },
    admin: {
      label: t('common-admin'),
      icon: Shield,
      description: t('members-role-admin-description'),
      color: 'gba:text-primary'
    },
    editor: {
      label: t('common-editor'),
      icon: Edit3,
      description: t('members-role-editor-description'),
      color: 'gba:text-success'
    },
    viewer: {
      label: t('common-viewer'),
      icon: Eye,
      description: t('members-role-viewer-description'),
      color: 'gba:text-muted-foreground'
    }
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('role')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [loadingMember, setLoadingMember] = useState<string | null>(null)

  // Calculate activity stats per member
  const memberStats = useMemo(() => {
    const stats = new Map<string, MemberActivityStats>()

    // Initialize stats for all members
    for (const member of members) {
      stats.set(member.userId, {
        totalActivities: 0,
        documentsCreated: 0,
        documentsEdited: 0,
        notesCreated: 0,
        notesEdited: 0,
        spreadsheetsCreated: 0,
        spreadsheetsEdited: 0,
        slidesCreated: 0,
        slidesEdited: 0,
        lastActivityAt: undefined
      })
    }

    // Aggregate activities
    for (const activity of activities) {
      const existing = stats.get(activity.userId)
      if (!existing) continue

      existing.totalActivities++

      // Track last activity
      if (!existing.lastActivityAt || activity.timestamp > existing.lastActivityAt) {
        existing.lastActivityAt = activity.timestamp
      }

      // Count by entity type and action
      const isCreated = activity.action === 'created'
      const isEdited = activity.action === 'updated'

      switch (activity.entityType) {
        case 'document':
          if (isCreated) existing.documentsCreated++
          if (isEdited) existing.documentsEdited++
          break
        case 'note':
          if (isCreated) existing.notesCreated++
          if (isEdited) existing.notesEdited++
          break
        case 'spreadsheet':
          if (isCreated) existing.spreadsheetsCreated++
          if (isEdited) existing.spreadsheetsEdited++
          break
        case 'slide':
          if (isCreated) existing.slidesCreated++
          if (isEdited) existing.slidesEdited++
          break
      }
    }

    return stats
  }, [members, activities])

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = members.filter(
        m => m.userName?.toLowerCase().includes(query) || m.userId.toLowerCase().includes(query)
      )
    }

    // Sort
    const roleOrder = { owner: 0, admin: 1, editor: 2, viewer: 3 }

    return [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = (a.userName || a.userId).localeCompare(b.userName || b.userId)
          break
        case 'role':
          comparison = roleOrder[a.role] - roleOrder[b.role]
          break
        case 'joinedAt':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
          break
        case 'activity': {
          const statsA = memberStats.get(a.userId)
          const statsB = memberStats.get(b.userId)
          comparison = (statsA?.totalActivities || 0) - (statsB?.totalActivities || 0)
          break
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [members, searchQuery, sortField, sortDirection, memberStats])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'activity' ? 'desc' : 'asc')
    }
  }

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

  const canInvite = isOwner || canManageMembers

  // Summary stats
  const roleCounts = useMemo(() => {
    const counts = { owner: 0, admin: 0, editor: 0, viewer: 0 }
    for (const m of members) {
      counts[m.role]++
    }
    return counts
  }, [members])

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:flex-col gba:sm:flex-row gba:items-start gba:sm:items-center gba:justify-between gba:gap-4">
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{t('members-title')}</h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('members-subtitle', { count: members.length })}
          </p>
        </div>
        {canInvite && (
          <Button onClick={onInvite} className="gba:gap-2" data-testid={`${testId}-invite-button`}>
            <UserPlus className="gba:w-4 gba:h-4" />
            {t('members-invite-members')}
          </Button>
        )}
      </div>

      {/* Summary Cards - exclude owner (always 1) */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        {kpiRoles.map(role => {
          const config = roleConfig[role]
          const Icon = config.icon
          return (
            <Card key={role} className="gba:border-border/50">
              <CardContent className="gba:p-3">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className={`gba:p-2 gba:rounded-lg gba:bg-muted ${config.color}`}>
                    <Icon className="gba:w-4 gba:h-4" />
                  </div>
                  <div>
                    <p className="gba:text-2xl gba:font-semibold gba:text-foreground">{roleCounts[role]}</p>
                    <p className="gba:text-xs gba:text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="gba:flex gba:flex-col gba:sm:flex-row gba:items-stretch gba:sm:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder={t('common-search-members-placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-9"
            data-testid={`${testId}-search`}
          />
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground">{t('members-sort-by')}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gba:gap-2">
                <ArrowUpDown className="gba:w-4 gba:h-4" />
                {sortField === 'name' && t('members-sort-name')}
                {sortField === 'role' && t('members-sort-role')}
                {sortField === 'joinedAt' && t('members-sort-join-date')}
                {sortField === 'activity' && t('members-sort-activity')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort('name')}>
                <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('members-sort-name')}
                {sortField === 'name' && <Check className="gba:w-4 gba:h-4 gba:ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('role')}>
                <Shield className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('members-sort-role')}
                {sortField === 'role' && <Check className="gba:w-4 gba:h-4 gba:ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('joinedAt')}>
                <Calendar className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('members-sort-join-date')}
                {sortField === 'joinedAt' && <Check className="gba:w-4 gba:h-4 gba:ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('activity')}>
                <Activity className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('members-sort-activity')}
                {sortField === 'activity' && <Check className="gba:w-4 gba:h-4 gba:ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Members List - Compact */}
      <div className="gba:space-y-2">
        {filteredAndSortedMembers.length === 0 ? (
          <div className="gba:text-center gba:py-12">
            <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground/50 gba:mb-4" />
            <p className="gba:text-muted-foreground">
              {searchQuery ? t('members-no-search-results') : t('members-no-members')}
            </p>
          </div>
        ) : (
          filteredAndSortedMembers.map(member => {
            const isCurrentUser = member.userId === currentUserId
            const canManage = (isOwner || canManageMembers) && !isCurrentUser && member.role !== 'owner'
            const isLoading = loadingMember === member.id
            const stats = memberStats.get(member.userId)
            const config = roleConfig[member.role]
            const RoleIcon = config.icon

            return (
              <div
                key={member.id}
                className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border/50 gba:hover:border-border gba:hover:bg-muted/30 gba:transition-colors"
                data-testid={`${testId}-member-${member.id}`}
              >
                {/* Avatar */}
                <Avatar className="gba:w-10 gba:h-10 gba:flex-shrink-0">
                  {member.userAvatar ? (
                    <AvatarImage src={member.userAvatar} alt={member.userName || t('common-unknown')} />
                  ) : null}
                  <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs gba:font-medium">
                    {getInitials(member.userName, member.userId)}
                  </AvatarFallback>
                </Avatar>

                {/* Main Info */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                      {member.userName || t('common-unknown')}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="gba:text-xs gba:py-0">
                        {t('common-you')}
                      </Badge>
                    )}
                  </div>
                  {/* Job Title & Department */}
                  <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    {member.jobTitle && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:truncate">
                        <Briefcase className="gba:w-3 gba:h-3 gba:flex-shrink-0" />
                        {member.jobTitle}
                      </span>
                    )}
                    {member.department && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:truncate">
                        <Building2 className="gba:w-3 gba:h-3 gba:flex-shrink-0" />
                        {member.department}
                      </span>
                    )}
                  </div>
                </div>

                {/* Space Role Badge */}
                <Badge variant="outline" className={`gba:gap-1 gba:text-xs ${config.color}`}>
                  <RoleIcon className="gba:w-3 gba:h-3" />
                  {config.label}
                </Badge>

                {/* Activity Stats - compact */}
                <div className="gba:hidden gba:sm:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:min-w-[120px]">
                  {stats?.totalActivities ? (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <Activity className="gba:w-3 gba:h-3" />
                      {t('common-activities-count', { count: stats.totalActivities })}
                    </span>
                  ) : (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <Calendar className="gba:w-3 gba:h-3" />
                      {formatLocalizedDate(new Date(member.joinedAt), locale, 'MMM yyyy')}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8"
                        disabled={isLoading}
                        data-testid={`${testId}-member-actions-${member.id}`}
                      >
                        {isLoading ? (
                          <div className="gba:w-4 gba:h-4 gba:border-2 gba:border-muted-foreground/30 gba:border-t-muted-foreground gba:rounded-full gba:animate-spin" />
                        ) : (
                          <MoreHorizontal className="gba:w-4 gba:h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="gba:w-56">
                      <div className="gba:px-2 gba:py-1.5">
                        <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                          {t('members-change-role')}
                        </p>
                      </div>
                      {assignableRoles.map(role => {
                        const roleConf = roleConfig[role]
                        const Icon = roleConf.icon
                        return (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => handleRoleChange(member.userId, member.id, role)}
                            className="gba:gap-2"
                            data-testid={`${testId}-role-${role}-${member.id}`}
                          >
                            <Icon className={`gba:w-4 gba:h-4 ${roleConf.color}`} />
                            <div className="gba:flex-1">
                              <p className="gba:text-sm gba:font-medium">{roleConf.label}</p>
                              <p className="gba:text-xs gba:text-muted-foreground">{roleConf.description}</p>
                            </div>
                            {member.role === role && <Check className="gba:w-4 gba:h-4 gba:text-primary" />}
                          </DropdownMenuItem>
                        )
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemove(member.userId, member.id)}
                        className="gba:text-destructive gba:focus:text-destructive gba:gap-2"
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
          })
        )}
      </div>
    </div>
  )
}

export default SpaceMembersTab
