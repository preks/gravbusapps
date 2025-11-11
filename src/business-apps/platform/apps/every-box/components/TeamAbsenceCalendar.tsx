/**
 * TeamAbsenceCalendar Component
 * Shows a simple weekly calendar view of team absences during a specific period
 * Used in absence approval and sick leave acknowledgment task details
 */
import React, { useMemo } from 'react'
import {
  Alert,
  Spinner,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge
} from '@newwork/nw-design-system'
import { Users } from 'lucide-react'
import { useTeamAbsences } from '../hooks/useTeamAbsences'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface TeamAbsenceCalendarProps {
  accessToken: string
  supervisorId?: string
  startDate: string
  endDate: string
  currentAbsence?: {
    employeeId: string
    employeeName: string
    department?: string
    type: string
    status: string
  }
}

interface CalendarDay {
  date: Date
  dateString: string
  dayOfWeek: string
  dayNumber: number
  isWeekend: boolean
}

interface EmployeeAbsenceMap {
  [employeeId: string]: {
    [dateString: string]: {
      type: string
      status: string
      color: string
    }
  }
}

// Helper function for status display
const getAbsenceStatusDisplay = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', type: 'approved' }
    case 'PENDING':
      return { label: 'Pending', type: 'pending' }
    case 'REJECTED':
      return { label: 'Rejected', type: 'rejected' }
    default:
      return { label: status, type: 'default' }
  }
}

export const TeamAbsenceCalendar: React.FC<TeamAbsenceCalendarProps> = ({
  accessToken,
  supervisorId,
  startDate,
  endDate,
  currentAbsence
}) => {
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  // Calculate the week range to display
  const weekRange = useMemo(() => {
    // Parse dates safely
    const absenceStart = new Date(startDate.split('T')[0] + 'T12:00:00')
    const absenceEnd = new Date(endDate.split('T')[0] + 'T12:00:00')

    // Get Monday of the week containing absenceStart
    const weekStart = new Date(absenceStart)
    const dayOfWeek = weekStart.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    weekStart.setDate(weekStart.getDate() + diffToMonday)

    // Get Sunday of the week containing absenceEnd
    const weekEnd = new Date(absenceEnd)
    const endDayOfWeek = weekEnd.getDay()
    const diffToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek
    weekEnd.setDate(weekEnd.getDate() + diffToSunday)

    return { weekStart, weekEnd }
  }, [startDate, endDate])

  // Fetch team absences for the week range
  const { employees, absences, isLoading, error } = useTeamAbsences({
    accessToken,
    supervisorId,
    startDate: weekRange.weekStart.toISOString(),
    endDate: weekRange.weekEnd.toISOString()
  })

  // Generate array of days to display
  const calendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = []
    const currentDate = new Date(weekRange.weekStart)

    while (currentDate <= weekRange.weekEnd) {
      const dateString = currentDate.toISOString().split('T')[0]
      const dayOfWeek = currentDate.toLocaleDateString(userLocale, { weekday: 'short' })
      const dayNumber = currentDate.getDate()
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6

      days.push({
        date: new Date(currentDate),
        dateString,
        dayOfWeek,
        dayNumber,
        isWeekend
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }, [weekRange, userLocale])

  // Map absences to employees and dates
  const absenceMap = useMemo((): EmployeeAbsenceMap => {
    const map: EmployeeAbsenceMap = {}

    // Debug logging
    console.log('🔍 TeamAbsenceCalendar - absences from useTeamAbsences:', absences)
    console.log('🔍 TeamAbsenceCalendar - currentAbsence:', currentAbsence)

    // Add current absence being acknowledged/approved if provided
    if (currentAbsence) {
      map[currentAbsence.employeeId] = {}

      const statusDisplay = getAbsenceStatusDisplay(currentAbsence.status)
      let color = 'gba:bg-info'
      if (statusDisplay.type === 'approved') {
        color = 'gba:bg-success'
      } else if (statusDisplay.type === 'rejected') {
        color = 'gba:bg-destructive'
      } else if (statusDisplay.type === 'pending') {
        color = 'gba:bg-warning'
      }

      const absStart = new Date(startDate.split('T')[0] + 'T12:00:00')
      const absEnd = new Date(endDate.split('T')[0] + 'T12:00:00')
      const currentDate = new Date(absStart)

      while (currentDate <= absEnd) {
        const dateStr = currentDate.toISOString().split('T')[0]
        map[currentAbsence.employeeId][dateStr] = {
          type: currentAbsence.type,
          status: statusDisplay.label,
          color
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    absences.forEach(absence => {
      if (!absence.employee?.id || !absence.startDate || !absence.endDate) return

      // Filter: Only include absences that overlap with the week range
      const absStart = new Date(absence.startDate.split('T')[0] + 'T12:00:00')
      const absEnd = new Date(absence.endDate.split('T')[0] + 'T12:00:00')

      // Check if absence overlaps with week range
      if (absEnd < weekRange.weekStart || absStart > weekRange.weekEnd) {
        return // Skip absences outside the week range
      }

      const employeeId = absence.employee.id
      if (!map[employeeId]) {
        map[employeeId] = {}
      }

      // Get absence type and color
      const statusDisplay = getAbsenceStatusDisplay(absence.status)
      const absenceType = absence.type?.value || 'Absence'

      // Determine color based on status
      let color = 'gba:bg-info'
      if (statusDisplay.type === 'approved') {
        color = 'gba:bg-success'
      } else if (statusDisplay.type === 'rejected') {
        color = 'gba:bg-destructive'
      } else if (statusDisplay.type === 'pending') {
        color = 'gba:bg-warning'
      }

      // Mark all days in the absence range (only within the week range)
      const currentDate = new Date(absStart < weekRange.weekStart ? weekRange.weekStart : absStart)
      const rangeEnd = absEnd > weekRange.weekEnd ? weekRange.weekEnd : absEnd

      while (currentDate <= rangeEnd) {
        const dateStr = currentDate.toISOString().split('T')[0]
        map[employeeId][dateStr] = {
          type: absenceType,
          status: statusDisplay.label,
          color
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })

    return map
  }, [absences, currentAbsence, startDate, endDate, weekRange])

  if (!supervisorId) {
    return null
  }

  const monthYear = weekRange.weekStart.toLocaleDateString(userLocale, {
    month: 'long',
    year: 'numeric'
  })

  return (
    <Card data-testid="team-absence-calendar-card" className="gba:shadow-none gba:border-none">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Users className="gba:h-5 gba:w-5 gba:text-primary" />
          Team Absence Calendar - {monthYear}
        </CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
          View team absences during this period to help make informed decisions
          {currentAbsence && (
            <span className="gba:block gba:mt-2 gba:text-primary gba:font-medium">
              The absence highlighted with a blue border and dot indicator is pending your approval
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <div className="gba:font-medium">Error Loading Team Absences</div>
            <div className="gba:text-sm gba:opacity-90">{error}</div>
          </Alert>
        )}

        {!isLoading && !error && employees.length === 0 && (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            <p>No team members found</p>
          </div>
        )}

        {!isLoading && !error && employees.length > 0 && (
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-48 gba:sticky gba:left-0 gba:bg-card gba:z-10">Team Member</TableHead>
                  {calendarDays.map(day => (
                    <TableHead
                      key={day.dateString}
                      className={`gba:text-center gba:min-w-[80px] ${day.isWeekend ? 'gba:bg-muted/50' : ''}`}
                    >
                      <div className="gba:text-xs gba:font-normal gba:text-muted-foreground">{day.dayOfWeek}</div>
                      <div className="gba:text-sm gba:font-semibold">{day.dayNumber}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Show current absence being acknowledged first if it exists */}
                {currentAbsence && (
                  <TableRow
                    key={currentAbsence.employeeId}
                    className="gba:bg-primary/5 gba:border-l-4 gba:border-l-primary"
                  >
                    <TableCell className="gba:sticky gba:left-0 gba:bg-primary/5 gba:z-10">
                      <div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:font-medium gba:text-sm">{currentAbsence.employeeName}</div>
                          <Badge variant="outline" className="gba:text-xs gba:border-primary gba:text-primary">
                            Pending Approval
                          </Badge>
                        </div>
                        {currentAbsence.department && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {currentAbsence.department}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {calendarDays.map(day => {
                      const absence = absenceMap[currentAbsence.employeeId]?.[day.dateString]
                      // Check if this day is part of the absence being approved
                      const absStart = new Date(startDate.split('T')[0] + 'T12:00:00')
                      const absEnd = new Date(endDate.split('T')[0] + 'T12:00:00')
                      const dayDate = new Date(day.dateString + 'T12:00:00')
                      const isCurrentAbsenceDay = dayDate >= absStart && dayDate <= absEnd

                      return (
                        <TableCell
                          key={day.dateString}
                          className={`gba:text-center gba:p-2 gba:bg-primary/5 ${day.isWeekend ? 'gba:bg-muted/30' : ''}`}
                        >
                          {absence ? (
                            <div
                              className={`${absence.color} gba:text-white gba:text-xs gba:py-1 gba:px-2 gba:rounded gba:font-medium gba:relative ${
                                isCurrentAbsenceDay ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:shadow-lg' : ''
                              }`}
                              title={`${absence.type} - ${absence.status}${isCurrentAbsenceDay ? ' (This absence is pending approval)' : ''}`}
                            >
                              {absence.type}
                              {isCurrentAbsenceDay && (
                                <span
                                  className="gba:absolute -gba:top-1 -gba:right-1 gba:bg-primary gba:text-white gba:rounded-full gba:w-3 gba:h-3 gba:flex gba:items-center gba:justify-center gba:text-[8px]"
                                  title="Pending Approval"
                                >
                                  •
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="gba:text-muted-foreground gba:text-xs">-</div>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )}

                {employees
                  .filter(employee => {
                    // Exclude current absence employee (already shown at top)
                    if (currentAbsence && employee.id === currentAbsence.employeeId) {
                      return false
                    }
                    // Only show employees who have absences in this period
                    return absenceMap[employee.id] && Object.keys(absenceMap[employee.id]).length > 0
                  })
                  .map(employee => {
                    const employeeName =
                      employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
                    const department = employee.employeePosition?.organizationalUnit?.name || ''

                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="gba:sticky gba:left-0 gba:bg-card gba:z-10">
                          <div>
                            <div className="gba:font-medium gba:text-sm">{employeeName}</div>
                            {department && <div className="gba:text-xs gba:text-muted-foreground">{department}</div>}
                          </div>
                        </TableCell>
                        {calendarDays.map(day => {
                          const absence = absenceMap[employee.id]?.[day.dateString]

                          return (
                            <TableCell
                              key={day.dateString}
                              className={`gba:text-center gba:p-2 ${day.isWeekend ? 'gba:bg-muted/30' : ''}`}
                            >
                              {absence ? (
                                <div
                                  className={`${absence.color} gba:text-white gba:text-xs gba:py-1 gba:px-2 gba:rounded gba:font-medium`}
                                  title={`${absence.type} - ${absence.status}`}
                                >
                                  {absence.type}
                                </div>
                              ) : (
                                <div className="gba:text-muted-foreground gba:text-xs">-</div>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
