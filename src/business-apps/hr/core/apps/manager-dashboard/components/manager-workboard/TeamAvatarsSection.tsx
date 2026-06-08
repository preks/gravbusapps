// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge
} from '@newwork/nw-design-system'
import { UsersThreeIcon as Users } from '@phosphor-icons/react'
import { avatarSrc } from '../../utils/heatmapHelpers'

interface DirectReport {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  status: string
  currentAbsence?: {
    type: string
    parentEntryId?: string
    startDate: string
    endDate: string
    status: string
  }
}

type StatusGroup = 'available' | 'unallocated' | 'ooo'

interface StatusColors {
  ring: string
  dot: string
  label: string
  group: StatusGroup
}

interface TeamAvatarsSectionProps {
  directReports: DirectReport[]
  unallocatedIds: string[]
  loading: boolean
  onNavigateToTeammates: () => void
  onMemberClick: (memberId: string) => void
}

const AVATAR_SKELETON_KEYS = Array.from({ length: 16 }, (_, index) => `avatar-skeleton-${index + 1}`)

const getStatusColors = (employeeId: string, status: string, unallocatedIds: string[]): StatusColors => {
  const isUnallocated = unallocatedIds?.includes(employeeId)

  if (status === 'On Leave' || status === 'Sick Leave') {
    return {
      ring: 'gba:ring-destructive',
      dot: 'gba:bg-destructive',
      label: 'Out of Office',
      group: 'ooo'
    }
  }

  if (isUnallocated) {
    return {
      ring: 'gba:ring-warning',
      dot: 'gba:bg-warning',
      label: 'Unallocated',
      group: 'unallocated'
    }
  }

  return {
    ring: 'gba:ring-success',
    dot: 'gba:bg-success',
    label: 'Available',
    group: 'available'
  }
}

const GROUP_ORDER: Record<StatusGroup, number> = { available: 0, unallocated: 1, ooo: 2 }

const formatAbsenceLabel = (absence?: DirectReport['currentAbsence']): string | null => {
  if (!absence) return 'On Leave'
  return absence.type || 'On Leave'
}

interface TeamMemberAvatarProps {
  member: DirectReport
  colors: StatusColors
  onClick: (memberId: string) => void
  titleSuffix?: string
  avatarClassName?: string
  nameClassName: string
  extraLabel?: React.ReactNode
}

const TeamMemberAvatar: React.FC<TeamMemberAvatarProps> = ({
  member,
  colors,
  onClick,
  titleSuffix,
  avatarClassName = '',
  nameClassName,
  extraLabel
}) => (
  <button
    key={member.id}
    onClick={() => onClick(member.id)}
    className="gba:group gba:relative gba:flex gba:flex-col gba:items-center gba:gap-1"
    title={`${member.firstName} ${member.lastName} - ${titleSuffix ?? colors.label}`}
  >
    <div className={`gba:relative gba:ring-2 ${colors.ring} gba:rounded-full gba:p-0.5`}>
      <Avatar size="md" className={`gba:h-10 gba:w-10 ${avatarClassName}`}>
        <AvatarImage src={avatarSrc(member.pictureThumbnail)} alt={`${member.firstName} ${member.lastName}`} />
        <AvatarFallback className="gba:text-xs">
          {member.firstName.charAt(0)}
          {member.lastName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div
        className={`gba:absolute gba:bottom-0 gba:right-0 gba:h-2.5 gba:w-2.5 ${colors.dot} gba:rounded-full gba:border-2 gba:border-background`}
        aria-label={colors.label}
      />
    </div>
    <span className={nameClassName}>{member.firstName}</span>
    {extraLabel}
  </button>
)

export const TeamAvatarsSection: React.FC<TeamAvatarsSectionProps> = ({
  directReports,
  unallocatedIds,
  loading,
  onNavigateToTeammates,
  onMemberClick
}) => {
  const { sorted, oooCount } = useMemo(() => {
    const withStatus = directReports.map(m => ({
      member: m,
      colors: getStatusColors(m.id, m.status, unallocatedIds)
    }))
    withStatus.sort((a, b) => GROUP_ORDER[a.colors.group] - GROUP_ORDER[b.colors.group])

    return {
      sorted: withStatus,
      oooCount: withStatus.filter(s => s.colors.group === 'ooo').length
    }
  }, [directReports, unallocatedIds])

  if (loading) {
    return (
      <Card className="gba:rounded-xl gba:p-5">
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:flex gba:flex-wrap gba:gap-2">
            {AVATAR_SKELETON_KEYS.map(skeletonKey => (
              <div key={skeletonKey} className="gba:h-10 gba:w-10 gba:bg-muted gba:rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const oooStartIndex = sorted.findIndex(s => s.colors.group === 'ooo')

  return (
    <Card data-testid="team-avatars-section" className="gba:rounded-xl gba:p-5">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <CardTitle className="gba:text-lg">Your Team ({directReports.length})</CardTitle>
            {oooCount > 0 && (
              <Badge variant="destructive" size="sm">
                {oooCount} absent
              </Badge>
            )}
          </div>
          <button
            onClick={onNavigateToTeammates}
            className="gba:text-sm gba:text-primary gba:hover:underline gba:font-medium"
          >
            View all →
          </button>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground">Click avatar to view details</p>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="gba:space-y-4">
            {/* Available & Unallocated members */}
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {sorted
                .filter(s => s.colors.group !== 'ooo')
                .map(({ member, colors }) => (
                  <TeamMemberAvatar
                    key={member.id}
                    member={member}
                    colors={colors}
                    onClick={onMemberClick}
                    nameClassName="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[48px] gba:text-center group-hover:gba:text-foreground"
                  />
                ))}
            </div>

            {/* Out of Office group - visually separated */}
            {oooStartIndex >= 0 && (
              <div className="gba:rounded-lg gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:p-3">
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-3">
                  <div className="gba:h-2 gba:w-2 gba:rounded-full gba:bg-destructive" />
                  <span className="gba:text-xs gba:font-medium gba:text-destructive">Out of Office ({oooCount})</span>
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {sorted
                    .filter(s => s.colors.group === 'ooo')
                    .map(({ member, colors }) => (
                      <TeamMemberAvatar
                        key={member.id}
                        member={member}
                        colors={colors}
                        onClick={onMemberClick}
                        titleSuffix={formatAbsenceLabel(member.currentAbsence) ?? undefined}
                        avatarClassName="gba:opacity-60 gba:grayscale-[40%]"
                        nameClassName="gba:text-xs gba:text-destructive gba:truncate gba:max-w-[56px] gba:text-center gba:font-medium"
                        extraLabel={
                          <span className="gba:text-[10px] gba:text-destructive/70 gba:truncate gba:max-w-[56px] gba:text-center gba:leading-tight">
                            {formatAbsenceLabel(member.currentAbsence)}
                          </span>
                        }
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            <Users size={48} className="gba:mx-auto gba:mb-2 gba:opacity-50" />
            <p className="gba:font-medium">No team members</p>
            <p className="gba:text-sm">Add direct reports to see them here</p>
          </div>
        )}

        {/* Legend */}
        {directReports.length > 0 && (
          <div className="gba:mt-4 gba:pt-4 gba:border-t gba:flex gba:flex-wrap gba:gap-3 gba:text-xs gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-success gba:border-2 gba:border-muted" />
              <span>Available</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-warning gba:border-2 gba:border-muted" />
              <span>Unallocated</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-destructive gba:border-2 gba:border-muted" />
              <span>Out of Office</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
