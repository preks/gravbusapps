import React from 'react'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { AirplaneTiltIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { EmployeeCardProps } from '../types/ViewSelectorTypes'
import dayjs from 'dayjs'
import { getEmployeeAvatarSrc } from '../../utils/avatarUtils'

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ emp, showTrend = true, showAbsence = false, onClick }) => {
  const name =
    emp.employee.displayName || `${emp.employee.firstName || ''} ${emp.employee.lastName || ''}`.trim() || 'Unknown'
  const role = emp.employee.employeePosition?.jobPosition?.name || ''
  const avatarSrc = getEmployeeAvatarSrc(emp.employee.pictureThumbnail)

  // Format days since last activity
  const formatDaysSince = (days?: number): string | null => {
    if (days === undefined || days === null) return null
    if (days === 0) return 'today'
    if (days === 1) return '1 day ago'
    if (days < 7) return `${days} days ago`
    if (days < 14) return '1 week ago'
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    if (days < 60) return '1 month ago'
    return `${Math.floor(days / 30)} months ago`
  }

  const lastActivityText = formatDaysSince(emp.daysSinceLastActivity)

  // Format absence date range
  const formatAbsenceDates = () => {
    if (!emp.absence?.startDate || !emp.absence?.endDate) return ''
    const start = dayjs(emp.absence.startDate)
    const end = dayjs(emp.absence.endDate)
    // Use short date format: "Dec 1 - Dec 15"
    return `${start.format('MMM D')} - ${end.format('MMM D')}`
  }

  return (
    <button
      type="button"
      onClick={() => onClick(emp)}
      className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-background/60 hover:gba:bg-background gba:transition-colors gba:cursor-pointer gba:border-0 gba:text-left gba:w-full"
    >
      <Avatar className="gba:h-10 gba:w-10 gba:shrink-0">
        {avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : null}
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="gba:flex-1 gba:min-w-0">
        <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{name}</p>
        {role && <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{role}</p>}
        {/* Show absence badge if employee had significant leave */}
        {emp.absence && emp.absence.totalDays > 0 && !showAbsence && !emp.isInactive && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
            <AirplaneTiltIcon className="gba:w-3 gba:h-3 gba:text-info" />
            <span className="gba:text-[10px] gba:text-info">{emp.absence.totalDays}d leave in period</span>
          </div>
        )}
      </div>
      {showTrend && (
        <div className="gba:text-right gba:shrink-0">
          {emp.isInactive ? (
            // Inactive employee - show "No activity" instead of percentage
            <>
              <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end">
                <WarningCircleIcon className="gba:w-4 gba:h-4 gba:text-destructive" />
                <span className="gba:text-sm gba:font-bold gba:text-destructive">Inactive</span>
              </div>
              {lastActivityText && <p className="gba:text-xs gba:text-muted-foreground">Last: {lastActivityText}</p>}
            </>
          ) : (
            // Active employee with trend
            <>
              <p
                className={`gba:text-sm gba:font-bold ${
                  emp.trend === 'up'
                    ? 'gba:text-success'
                    : emp.trend === 'down'
                      ? 'gba:text-destructive'
                      : 'gba:text-muted-foreground'
                }`}
              >
                {emp.trend === 'up' && '↑'}
                {emp.trend === 'down' && '↓'} {Math.abs(emp.trendPercent)}%
              </p>
              <p className="gba:text-xs gba:text-muted-foreground">{emp.activitiesLast30Days} activities</p>
            </>
          )}
        </div>
      )}
      {showAbsence && emp.absence?.isCurrentlyOnLeave && (
        <div className="gba:text-right gba:shrink-0">
          <Badge variant="info">{emp.absence.absenceType}</Badge>
          {emp.absence.startDate && emp.absence.endDate && (
            <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">({formatAbsenceDates()})</p>
          )}
        </div>
      )}
    </button>
  )
}

export default EmployeeCard
