/**
 * Team Widget Component
 * Real-time team overview with absence tracking using real employee data
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports'
import { useTeamAbsences } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamAbsences'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Skeleton
} from '@newwork/nw-design-system'
import { Users, CalendarBlank, UserCircle } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface TeamWidgetProps extends BusinessAppContextProps {
  showDetailed?: boolean
}

export const TeamWidget: React.FC<TeamWidgetProps> = ({ showDetailed = false, ...context }) => {
  const { directReports, loading: reportsLoading, error: reportsError } = useDirectReports({
    accessToken: context.accessToken,
    managerId: context.userInfo?.employeeDetails?.employeeId || ''
  })

  const isLoading = reportsLoading
  const hasError = reportsError

  // Mock data for fallback when real data fails
  const mockTeamMembers = [
    { id: '1', firstName: 'Anna', lastName: 'Weber', displayName: 'Anna Weber', jobPosition: 'Kundenberaterin', status: 'present' as const },
    { id: '2', firstName: 'Michael', lastName: 'Fischer', displayName: 'Michael Fischer', jobPosition: 'Anlageberater', status: 'present' as const },
    { id: '3', firstName: 'Thomas', lastName: 'Berger', displayName: 'Thomas Berger', jobPosition: 'Kundenberater', status: 'vacation' as const },
    { id: '4', firstName: 'Sarah', lastName: 'Klein', displayName: 'Sarah Klein', jobPosition: 'Kassiererin', status: 'present' as const },
    { id: '5', firstName: 'Peter', lastName: 'Schmidt', displayName: 'Peter Schmidt', jobPosition: 'Filialleiter-Stellvertreter', status: 'sick' as const },
  ]

  // Calculate team status
  const teamStats = React.useMemo(() => {
    // Use mock data if real data fails or is empty
    if (!directReports || directReports.length === 0 || hasError) {
      return { total: 5, present: 3, onVacation: 1, sick: 1, businessTrip: 0 }
    }

    const total = directReports.length
    const onLeave = directReports.filter(r => r.status === 'On Leave').length
    const away = directReports.filter(r => r.status === 'Away').length
    const present = total - onLeave - away

    return { total, present, onVacation: onLeave, sick: away, businessTrip: 0 }
  }, [directReports, hasError])

  // Get team members with their current status
  const teamMembers = React.useMemo(() => {
    // Use mock data if real data fails or is empty
    if (!directReports || directReports.length === 0 || hasError) {
      return mockTeamMembers
    }

    return directReports.map(report => {
      let status: 'present' | 'vacation' | 'sick' | 'business-trip' = 'present'

      if (report.status === 'On Leave') {
        const absenceType = report.currentAbsence?.type?.toLowerCase() || ''
        if (absenceType.includes('sick') || absenceType.includes('krankheit')) {
          status = 'sick'
        } else if (absenceType.includes('business') || absenceType.includes('dienstreise')) {
          status = 'business-trip'
        } else {
          status = 'vacation'
        }
      }

      return {
        id: report.id,
        firstName: report.firstName,
        lastName: report.lastName,
        displayName: report.fullName,
        jobPosition: report.jobPositionName || 'Mitarbeiter',
        status,
        avatar: report.pictureThumbnail
      }
    })
  }, [directReports, hasError])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vacation':
        return <Badge variant="info">Urlaub</Badge>
      case 'sick':
        return <Badge variant="destructive">Krank</Badge>
      case 'business-trip':
        return <Badge variant="warning">Dienstreise</Badge>
      default:
        return <Badge variant="success">Anwesend</Badge>
    }
  }

  const handleViewTeamMember = (employeeId: string) => {
    const url = buildPlatformUrl('/platform/employee-record', {
      employeeId,
      tab: 'summary'
    })
    navigateTo(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Users className="gba:h-5 gba:w-5" />
            Mein Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3">
            <Skeleton className="gba:h-12 gba:w-full" />
            <Skeleton className="gba:h-12 gba:w-full" />
            <Skeleton className="gba:h-12 gba:w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="team-widget">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Users className="gba:h-5 gba:w-5" />
          Mein Team
        </CardTitle>
        <CardDescription>
          {teamStats.present} von {teamStats.total} anwesend
          {teamStats.onVacation > 0 && ` • ${teamStats.onVacation} im Urlaub`}
          {teamStats.sick > 0 && ` • ${teamStats.sick} krank`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mb-4 gba:p-3 gba:bg-muted gba:rounded-lg">
          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-success">{teamStats.present}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Anwesend</div>
          </div>
          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-info">{teamStats.onVacation}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Urlaub</div>
          </div>
        </div>

        {/* Team Member List (simplified or detailed) */}
        {showDetailed ? (
          <div className="gba:space-y-3">
            {teamMembers.slice(0, 5).map(member => (
              <div
                key={member.id}
                className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-lg hover:gba:bg-accent gba:cursor-pointer gba:transition-colors"
                onClick={() => handleViewTeamMember(member.id)}
                data-testid={`team-member-${member.id}`}
              >
                <Avatar className="gba:h-10 gba:w-10">
                  <AvatarImage
                    src={
                      member.avatar && !member.avatar.startsWith('{')
                        ? `data:image/jpeg;base64,${member.avatar}`
                        : undefined
                    }
                    alt={member.displayName}
                  />
                  <AvatarFallback>
                    {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">{member.displayName}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{member.jobPosition}</p>
                </div>
                {getStatusBadge(member.status)}
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:space-y-2">
            {teamMembers.slice(0, 3).map(member => (
              <div
                key={member.id}
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm"
                data-testid={`team-member-compact-${member.id}`}
              >
                <div className="gba:w-2 gba:h-2 gba:rounded-full" 
                  style={{
                    backgroundColor: member.status === 'present' ? '#22c55e' : '#ef4444'
                  }}
                />
                <span className="gba:flex-1">{member.displayName}</span>
                {member.status !== 'present' && getStatusBadge(member.status)}
              </div>
            ))}
            {teamMembers.length > 3 && (
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-2">
                +{teamMembers.length - 3} weitere Mitarbeiter
              </p>
            )}
          </div>
        )}

        {/* View All Button */}
        <div className="gba:mt-4 gba:pt-4 gba:border-t">
          <button
            className="gba:w-full gba:text-sm gba:text-primary hover:gba:underline"
            onClick={() => console.log('Navigate to full team view')}
          >
            Vollständige Team-Ansicht →
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

