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
import { Users } from 'lucide-react'

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

export const TeamAvatarsSection: React.FC<TeamAvatarsSectionProps> = ({
  directReports,
  unallocatedIds,
  loading,
  onNavigateToTeammates,
  onMemberClick
}) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:grid gba:grid-cols-8 gba:gap-3">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="gba:h-10 gba:w-10 gba:bg-muted gba:rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusRingColor = (employeeId: string, status: string) => {
    if (unallocatedIds?.includes(employeeId)) {
      return 'gba:ring-warning'
    }
    if (status === 'On Leave') {
      return 'gba:ring-muted-foreground'
    }
    return 'gba:ring-primary'
  }

  return (
    <Card data-testid="team-avatars-section" style={{ borderRadius: '12px' }} className="gba:p-5">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">Your Team ({directReports.length})</CardTitle>
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
          <div className="gba:grid gba:grid-cols-8 md:gba:grid-cols-10 lg:gba:grid-cols-12 gba:gap-3">
            {directReports.map(member => {
              const statusRingColor = getStatusRingColor(member.id, member.status)
              const isUnallocated = unallocatedIds?.includes(member.id)

              return (
                <button
                  key={member.id}
                  onClick={() => onMemberClick(member.id)}
                  className="gba:group gba:relative gba:flex gba:flex-col gba:items-center gba:gap-1"
                  title={`${member.firstName} ${member.lastName}${isUnallocated ? ' (Unallocated)' : ''}`}
                >
                  <div className={`gba:relative gba:ring-2 ${statusRingColor} gba:rounded-full gba:p-0.5`}>
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
                    {isUnallocated && (
                      <div className="gba:absolute -gba:top-1 -gba:right-1 gba:h-3 gba:w-3 gba:bg-warning gba:rounded-full gba:border-2 gba:border-background" />
                    )}
                  </div>
                  <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:w-full gba:text-center group-hover:gba:text-foreground">
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
              <div className="gba:h-3 gba:w-3 gba:rounded-full gba:ring-2 gba:ring-primary" />
              <span>Active</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:h-3 gba:w-3 gba:rounded-full gba:ring-2 gba:ring-warning" />
              <span>Unallocated</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:h-3 gba:w-3 gba:rounded-full gba:ring-2 gba:ring-muted-foreground" />
              <span>On Leave</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
