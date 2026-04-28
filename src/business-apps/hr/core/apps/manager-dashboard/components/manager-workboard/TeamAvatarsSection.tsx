// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { UsersThreeIcon as Users } from '@phosphor-icons/react'

interface DirectReport {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  status: string
}

interface TeamAvatarsSectionProps {
  directReports: DirectReport[]
  unallocatedIds: string[]
  loading: boolean
  onNavigateToTeammates: () => void
  onMemberClick: (memberId: string) => void
}

const AVATAR_SKELETON_KEYS = Array.from({ length: 16 }, (_, index) => `avatar-skeleton-${index + 1}`)

/**
 * Get status indicator colors based on employee status
 * OOO (Out of Office) statuses: On Leave, Sick Leave
 * Available: Available status
 */
const getStatusColors = (employeeId: string, status: string, unallocatedIds: string[]) => {
  const isUnallocated = unallocatedIds?.includes(employeeId)

  // OOO statuses - red/destructive color
  if (status === 'On Leave' || status === 'Sick Leave') {
    return {
      ring: 'gba:ring-destructive',
      dot: 'gba:bg-destructive',
      label: 'Out of Office'
    }
  }

  // Unallocated - warning color
  if (isUnallocated) {
    return {
      ring: 'gba:ring-warning',
      dot: 'gba:bg-warning',
      label: 'Unallocated'
    }
  }

  // Available - success color
  return {
    ring: 'gba:ring-success',
    dot: 'gba:bg-success',
    label: 'Available'
  }
}

export const TeamAvatarsSection: React.FC<TeamAvatarsSectionProps> = ({
  directReports,
  unallocatedIds,
  loading,
  onNavigateToTeammates,
  onMemberClick
}) => {
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

  return (
    <Card data-testid="team-avatars-section" className="gba:rounded-xl gba:p-5">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-lg">Your Team ({directReports.length})</CardTitle>
            <p className="gba:text-sm gba:text-muted-foreground">Click avatar to view details</p>
          </div>
          <button
            onClick={onNavigateToTeammates}
            className="gba:text-sm gba:text-primary gba:hover:underline gba:font-medium"
          >
            View all →
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {directReports.length > 0 ? (
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {directReports.map(member => {
              const statusColors = getStatusColors(member.id, member.status, unallocatedIds)

              return (
                <button
                  key={member.id}
                  onClick={() => onMemberClick(member.id)}
                  className="gba:group gba:relative gba:flex gba:flex-col gba:items-center gba:gap-1"
                  title={`${member.firstName} ${member.lastName} - ${statusColors.label}`}
                >
                  <div className={`gba:relative gba:ring-2 ${statusColors.ring} gba:rounded-full gba:p-0.5`}>
                    <Avatar size="md" className="gba:h-10 gba:w-10">
                      <AvatarImage
                        src={
                          member.pictureThumbnail && !member.pictureThumbnail.startsWith('{')
                            ? `data:image/jpeg;base64,${member.pictureThumbnail}`
                            : undefined
                        }
                        alt={`${member.firstName} ${member.lastName}`}
                      />
                      <AvatarFallback className="gba:text-xs">
                        {member.firstName.charAt(0)}
                        {member.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Chat/Online status dot - bottom right */}
                    <div
                      className={`gba:absolute gba:bottom-0 gba:right-0 gba:h-2.5 gba:w-2.5 ${statusColors.dot} gba:rounded-full gba:border-2 gba:border-background`}
                      aria-label={statusColors.label}
                    />
                  </div>
                  <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[48px] gba:text-center group-hover:gba:text-foreground">
                    {member.firstName}
                  </span>
                </button>
              )
            })}
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
