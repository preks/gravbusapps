import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Spinner,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@newwork/nw-design-system'
import { BriefcaseIcon, BuildingsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeById } from '@/common/data/employee/hooks/useEmployeeById'

/**
 * Compact Personal Workspace Header
 * Displays current user's avatar, name, and job position in a compact format
 * Designed to sit inline with navigation tabs
 */
export const PersonalWorkspaceHeader: React.FC<Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'>> = ({
  accessToken,
  userInfo
}) => {
  const employeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  const { employee, loading } = useEmployeeById({
    accessToken: accessToken || '',
    employeeId
  })

  // Get employee initials for avatar fallback
  const getEmployeeInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (loading || !employee) {
    return (
      <div className="gba:flex gba:items-center gba:gap-2" data-testid="personal-workspace-header-loading">
        <Spinner size="sm" />
      </div>
    )
  }

  const displayName = employee.employee?.displayName || `${employee.firstName} ${employee.lastName}`
  const jobPosition = employee.jobPosition?.name || 'Team Member'
  const businessUnit = employee.organizationalUnit?.name || ''
  const pictureThumbnail = employee.employee?.pictureThumbnail

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          className="gba:flex gba:items-center gba:gap-2.5 gba:px-3 gba:py-1.5 gba:rounded-lg gba:bg-background gba:border gba:border-border hover:gba:bg-muted/50 gba:transition-colors gba:cursor-pointer"
          data-testid="personal-workspace-header"
        >
          {/* Avatar */}
          <Avatar size="sm" data-testid="personal-workspace-header-avatar">
            {pictureThumbnail && <AvatarImage src={`data:image/jpeg;base64,${pictureThumbnail}`} alt={displayName} />}
            <AvatarFallback className="gba:text-xs gba:font-semibold">
              {getEmployeeInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          {/* Name Only */}
          <span
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="personal-workspace-header-name"
          >
            {displayName}
          </span>
        </button>
      </HoverCardTrigger>

      {/* Hover Card with Full Details */}
      <HoverCardContent align="end" className="gba:w-80">
        <div className="gba:flex gba:gap-4">
          {/* Larger Avatar in Card */}
          <Avatar size="lg">
            {pictureThumbnail && <AvatarImage src={`data:image/jpeg;base64,${pictureThumbnail}`} alt={displayName} />}
            <AvatarFallback className="gba:text-xl gba:font-semibold">
              {getEmployeeInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          {/* Details */}
          <div className="gba:flex gba:flex-col gba:gap-2 gba:flex-1">
            <div>
              <div className="gba:text-base gba:font-semibold gba:text-foreground">{displayName}</div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">Personal Workspace</div>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-1.5 gba:pt-2 gba:border-t gba:border-border">
              {/* Job Position */}
              <div className="gba:flex gba:items-center gba:gap-2">
                <BriefcaseIcon size={14} className="gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:text-sm gba:text-foreground" data-testid="personal-workspace-header-position">
                  {jobPosition}
                </span>
              </div>

              {/* Business Unit */}
              {businessUnit && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <BuildingsIcon size={14} className="gba:text-muted-foreground gba:shrink-0" />
                  <span className="gba:text-sm gba:text-foreground" data-testid="personal-workspace-header-unit">
                    {businessUnit}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export default PersonalWorkspaceHeader
