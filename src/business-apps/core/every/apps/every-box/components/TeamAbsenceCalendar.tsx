/**
 * TeamAbsenceCalendar Component
 * Shows a simple weekly calendar view of team absences during a specific period
 * Used in absence approval and sick leave acknowledgment task details
 *
 * Responsive design:
 * - Desktop: Table-based view with horizontal scrolling
 * - Mobile: Card-based view with stacked employee cards
 */
import React, { useMemo, useState, useEffect } from 'react'
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
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useTeamAbsences } from '../hooks/useTeamAbsences'
import { getCurrentActiveUserLocale, getCatalogValue } from '@/common/utils/windowUtils'
import translations from '../_i18n'

interface TeamAbsenceCalendarProps {
  accessToken: string
  supervisorId?: string
  startDate: string
  endDate: string
  currentAbsence?: {
    employeeId: string
    employeeName: string
    position?: string
    type: string
    status: string
  }
}

interface CalendarDay {
  date: Date
  dateString: string
  dayOfWeek: string
  dayNumber: number
  monthShort: string
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

// Custom hook for responsive detection
const useIsMobile = (breakpoint: number = 768) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if globalThis/window is available (SSR safety)
    if (typeof globalThis === 'undefined' || typeof globalThis.window === 'undefined') return

    const checkIsMobile = () => {
      setIsMobile(globalThis.innerWidth < breakpoint)
    }

    // Initial check
    checkIsMobile()

    // Add resize listener
    globalThis.addEventListener('resize', checkIsMobile)

    return () => globalThis.removeEventListener('resize', checkIsMobile)
  }, [breakpoint])

  return isMobile
}

// Helper function for status display - returns type for logic, label translation key
const getAbsenceStatusDisplay = (status: string, t: (key: string) => string) => {
  switch (status) {
    case 'APPROVED':
      return { label: t('absence-status-approved'), type: 'approved' }
    case 'PENDING':
      return { label: t('absence-status-pending'), type: 'pending' }
    case 'REJECTED':
      return { label: t('absence-status-rejected'), type: 'rejected' }
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
  const { t } = useTranslation(translations)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'
  const isMobile = useIsMobile()
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())

  // Toggle employee card expansion on mobile
  const toggleEmployeeExpanded = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

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
      const monthShort = currentDate.toLocaleDateString(userLocale, { month: 'short' })
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6

      days.push({
        date: new Date(currentDate),
        dateString,
        dayOfWeek,
        dayNumber,
        monthShort,
        isWeekend
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }, [weekRange, userLocale])

  // Map absences to employees and dates
  const absenceMap = useMemo((): EmployeeAbsenceMap => {
    const map: EmployeeAbsenceMap = {}

    // Add current absence being acknowledged/approved if provided
    if (currentAbsence) {
      map[currentAbsence.employeeId] = {}

      const statusDisplay = getAbsenceStatusDisplay(currentAbsence.status, t)
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

      // Get absence type and color (with locale-aware translation)
      const statusDisplay = getAbsenceStatusDisplay(absence.status, t)
      const absenceType = getCatalogValue(absence.type) || t('absence-calendar-fallback-type')

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
      const currentDate = new Date(Math.max(absStart.getTime(), weekRange.weekStart.getTime()))
      const rangeEnd = new Date(Math.min(absEnd.getTime(), weekRange.weekEnd.getTime()))

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
  }, [absences, currentAbsence, startDate, endDate, weekRange, t])

  if (!supervisorId) {
    return null
  }

  const monthYear = weekRange.weekStart.toLocaleDateString(userLocale, {
    month: 'long',
    year: 'numeric'
  })

  // Get employees with absences for rendering
  const employeesWithAbsences = employees.filter(employee => {
    if (currentAbsence && employee.id === currentAbsence.employeeId) {
      return false
    }
    return absenceMap[employee.id] && Object.keys(absenceMap[employee.id]).length > 0
  })

  // Helper to get absence days for an employee (for mobile view)
  const getAbsenceDaysForEmployee = (employeeId: string) => {
    const employeeAbsences = absenceMap[employeeId]
    if (!employeeAbsences) return []

    return calendarDays
      .filter(day => employeeAbsences[day.dateString])
      .map(day => ({
        ...day,
        absence: employeeAbsences[day.dateString]
      }))
  }

  // Mobile Card Component for Employee Absence
  const MobileEmployeeCard = ({
    employeeId,
    employeeName,
    position,
    isCurrentAbsence = false
  }: {
    employeeId: string
    employeeName: string
    position?: string
    isCurrentAbsence?: boolean
  }) => {
    const isExpanded = expandedEmployees.has(employeeId)
    const absenceDays = getAbsenceDaysForEmployee(employeeId)
    const absStart = new Date(startDate.split('T')[0] + 'T12:00:00')
    const absEnd = new Date(endDate.split('T')[0] + 'T12:00:00')

    // Group consecutive days by absence type
    const groupedAbsences = absenceDays.reduce(
      (acc, day) => {
        const lastGroup = acc[acc.length - 1]
        if (lastGroup && lastGroup.type === day.absence.type && lastGroup.status === day.absence.status) {
          lastGroup.days.push(day)
        } else {
          acc.push({
            type: day.absence.type,
            status: day.absence.status,
            color: day.absence.color,
            days: [day]
          })
        }
        return acc
      },
      [] as Array<{
        type: string
        status: string
        color: string
        days: typeof absenceDays
      }>
    )

    return (
      <div
        className={`gba:rounded-lg gba:border gba:overflow-hidden ${
          isCurrentAbsence ? 'gba:border-primary gba:border-2 gba:bg-primary/5' : 'gba:bg-card'
        }`}
      >
        {/* Header - Always visible */}
        <button
          onClick={() => toggleEmployeeExpanded(employeeId)}
          className="gba:w-full gba:p-3 gba:flex gba:items-center gba:justify-between gba:text-left hover:gba:bg-muted/50 gba:transition-colors"
        >
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:font-medium gba:text-sm gba:truncate">{employeeName}</span>
              {isCurrentAbsence && (
                <Badge variant="default" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                  {t('absence-status-pending')}
                </Badge>
              )}
            </div>
            {position && <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{position}</div>}
            {/* Summary line */}
            <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2">
              {groupedAbsences.slice(0, isExpanded ? undefined : 2).map(group => {
                const firstDay = group.days[0]
                const lastDay = group.days[group.days.length - 1]
                const dayDate = new Date(firstDay.dateString + 'T12:00:00')
                const isCurrentAbsenceDay = isCurrentAbsence && dayDate >= absStart && dayDate <= absEnd
                const groupKey = `${group.type}-${firstDay.dateString}-${lastDay.dateString}`

                return (
                  <span
                    key={groupKey}
                    className={`${group.color} gba:text-white gba:text-[10px] gba:px-2 gba:py-0.5 gba:rounded gba:font-medium ${
                      isCurrentAbsenceDay ? 'gba:ring-1 gba:ring-primary gba:ring-offset-1' : ''
                    }`}
                  >
                    {group.type}
                    {group.days.length > 1
                      ? ` (${firstDay.monthShort} ${firstDay.dayNumber}-${lastDay.dayNumber})`
                      : ` (${firstDay.monthShort} ${firstDay.dayNumber})`}
                  </span>
                )
              })}
              {!isExpanded && groupedAbsences.length > 2 && (
                <span className="gba:text-xs gba:text-muted-foreground">
                  {t('absence-calendar-more', { count: groupedAbsences.length - 2 })}
                </span>
              )}
            </div>
          </div>
          <div className="gba:ml-2 gba:text-muted-foreground">
            {isExpanded ? <ChevronUp className="gba:h-4 gba:w-4" /> : <ChevronDown className="gba:h-4 gba:w-4" />}
          </div>
        </button>

        {/* Expanded Content - Day by day view */}
        {isExpanded && (
          <div className="gba:border-t gba:bg-muted/30">
            <div className="gba:p-3 gba:space-y-2">
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('absence-calendar-daily-breakdown')}
              </div>
              <div className="gba:grid gba:grid-cols-2 sm:gba:grid-cols-3 gba:gap-2">
                {absenceDays.map(day => {
                  const dayDate = new Date(day.dateString + 'T12:00:00')
                  const isCurrentAbsenceDay = isCurrentAbsence && dayDate >= absStart && dayDate <= absEnd

                  return (
                    <div
                      key={day.dateString}
                      className={`gba:rounded gba:p-2 gba:text-center ${
                        day.isWeekend ? 'gba:bg-muted/50' : 'gba:bg-card'
                      } ${isCurrentAbsenceDay ? 'gba:ring-2 gba:ring-primary' : 'gba:border'}`}
                    >
                      <div className="gba:text-[10px] gba:text-muted-foreground">{day.dayOfWeek}</div>
                      <div className="gba:text-sm gba:font-semibold">
                        {day.monthShort} {day.dayNumber}
                      </div>
                      <div
                        className={`${day.absence.color} gba:text-white gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded gba:mt-1 gba:font-medium gba:truncate`}
                        title={`${day.absence.type} - ${day.absence.status}`}
                      >
                        {day.absence.type}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card data-testid="team-absence-calendar-card" className="gba:shadow-none gba:border-none">
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base sm:gba:text-lg">
          <Users className="gba:h-4 gba:w-4 sm:gba:h-5 sm:gba:w-5 gba:text-primary gba:flex-shrink-0" />
          <span className="gba:truncate">{t('absence-calendar-title')}</span>
          <span className="gba:hidden sm:gba:inline">- {monthYear}</span>
        </CardTitle>
        <div className="sm:gba:hidden gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:mt-1">
          <Calendar className="gba:h-3 gba:w-3" />
          {monthYear}
        </div>
        <p className="gba:text-xs sm:gba:text-sm gba:text-muted-foreground gba:mt-1">
          {t('absence-calendar-description')}
          {currentAbsence && (
            <span className="gba:block gba:mt-1 gba:text-primary gba:font-medium">
              {isMobile ? t('absence-calendar-pending-mobile') : t('absence-calendar-pending-desktop')}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="gba:pt-0">
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <div className="gba:font-medium">{t('absence-calendar-error-title')}</div>
            <div className="gba:text-sm gba:opacity-90">{error}</div>
          </Alert>
        )}

        {!isLoading && !error && employees.length === 0 && (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            <p>{t('absence-calendar-no-members')}</p>
          </div>
        )}

        {!isLoading && !error && employees.length > 0 && (
          <>
            {/* Mobile View - Card-based layout */}
            {isMobile ? (
              <div className="gba:space-y-3">
                {/* Current absence card first */}
                {currentAbsence && (
                  <MobileEmployeeCard
                    employeeId={currentAbsence.employeeId}
                    employeeName={currentAbsence.employeeName}
                    position={currentAbsence.position}
                    isCurrentAbsence={true}
                  />
                )}

                {/* Other employees with absences */}
                {employeesWithAbsences.map(employee => {
                  const employeeName =
                    employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
                  const position = employee.employeePosition?.organizationalUnit?.name || ''

                  return (
                    <MobileEmployeeCard
                      key={employee.id}
                      employeeId={employee.id}
                      employeeName={employeeName}
                      position={position}
                    />
                  )
                })}

                {/* Empty state for mobile */}
                {!currentAbsence && employeesWithAbsences.length === 0 && (
                  <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                    {t('absence-calendar-no-absences')}
                  </div>
                )}
              </div>
            ) : (
              /* Desktop View - Table-based layout */
              <div className="gba:w-full gba:overflow-x-auto gba:rounded-lg gba:border">
                <Table className="gba:w-full gba:min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="gba:w-48 gba:sticky gba:left-0 gba:z-10 gba:bg-background gba:shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                        {t('absence-calendar-team-member')}
                      </TableHead>
                      {calendarDays.map(day => (
                        <TableHead
                          key={day.dateString}
                          className={`gba:text-center gba:min-w-[90px] gba:px-2 ${day.isWeekend ? 'gba:bg-muted/50' : ''}`}
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
                      <TableRow key={currentAbsence.employeeId} className="gba:border-l-4 gba:border-l-primary">
                        {/* Use solid background color for sticky cell to prevent see-through on scroll */}
                        <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:bg-muted gba:shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                          <div>
                            <div className="gba:font-medium gba:text-sm">{currentAbsence.employeeName}</div>
                            {currentAbsence.position && (
                              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                                {currentAbsence.position}
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
                            <TableCell key={day.dateString} className="gba:text-center gba:p-2 gba:bg-muted">
                              {absence ? (
                                <div
                                  className={`${absence.color} gba:text-white gba:text-xs gba:py-1 gba:px-2 gba:rounded gba:font-medium gba:relative ${
                                    isCurrentAbsenceDay
                                      ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:shadow-lg'
                                      : ''
                                  }`}
                                  title={(() => {
                                    const baseTitle = `${absence.type} - ${absence.status}`
                                    return isCurrentAbsenceDay
                                      ? `${baseTitle} (${t('absence-calendar-pending-tooltip')})`
                                      : baseTitle
                                  })()}
                                >
                                  {absence.type}
                                  {isCurrentAbsenceDay && (
                                    <span
                                      className="gba:absolute -gba:top-1 -gba:right-1 gba:bg-primary gba:text-white gba:rounded-full gba:w-3 gba:h-3 gba:flex gba:items-center gba:justify-center gba:text-[8px]"
                                      title={t('absence-calendar-pending-approval')}
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

                    {employeesWithAbsences.map(employee => {
                      const employeeName =
                        employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
                      const position = employee.employeePosition?.organizationalUnit?.name || ''

                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:bg-background gba:shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                            <div>
                              <div className="gba:font-medium gba:text-sm">{employeeName}</div>
                              {position && <div className="gba:text-xs gba:text-muted-foreground">{position}</div>}
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
