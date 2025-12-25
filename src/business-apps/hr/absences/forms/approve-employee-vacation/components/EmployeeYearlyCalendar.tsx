/**
 * EmployeeYearlyCalendar Component
 * Displays a monthly calendar with color-coded approved absence indicators
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardContent, Spinner, Alert, Button, useTranslation } from '@newwork/nw-design-system'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import dayjs from 'dayjs'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCatalogValue } from '@/common/utils/windowUtils'
import translations from '../_i18n'

interface EmployeeYearlyCalendarProps {
  accessToken: string
  employeeId?: string
  currentRequestStartDate?: string
  currentRequestEndDate?: string
}

interface DayAbsence {
  type: string
  status: string
  color: string
  isCurrentRequest?: boolean
}

interface CalendarDay {
  date: dayjs.Dayjs
  dayOfMonth: number
  isWeekend: boolean
  isToday: boolean
  absence: DayAbsence | null
}

const getAbsenceColor = (typeRef: string, status: string): string => {
  // Pending requests - Orange/Yellow
  if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
    return 'gba:bg-orange-400'
  }

  // Sick leave - Red
  if (typeRef?.includes('A002') || typeRef?.toLowerCase()?.includes('sick')) {
    return 'gba:bg-red-500'
  }

  // Annual leave/Vacation - Blue (approved)
  if (
    typeRef?.includes('A001') ||
    typeRef?.toLowerCase()?.includes('annual') ||
    typeRef?.toLowerCase()?.includes('vacation')
  ) {
    return 'gba:bg-blue-500'
  }

  // Other absences (business trip, special leave, etc.) - Teal
  return 'gba:bg-teal-500'
}

export const EmployeeYearlyCalendar: React.FC<EmployeeYearlyCalendarProps> = ({
  accessToken,
  employeeId,
  currentRequestStartDate,
  currentRequestEndDate
}) => {
  const { t } = useTranslation(translations)
  const [absences, setAbsences] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  // Initialize month index - use function to ensure it's only calculated once
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    return currentRequestStartDate ? dayjs(currentRequestStartDate).month() : dayjs().month()
  })

  const graphqlClient = useGraphqlClient(accessToken)
  const currentYear = dayjs().year()

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonthIndex(prev => (prev === 0 ? 11 : prev - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonthIndex(prev => (prev === 11 ? 0 : prev + 1))
  }

  const goToRequestMonth = () => {
    if (currentRequestStartDate) {
      setCurrentMonthIndex(dayjs(currentRequestStartDate).month())
    } else {
      setCurrentMonthIndex(dayjs().month())
    }
  }

  useEffect(() => {
    const fetchYearlyAbsences = async () => {
      if (!accessToken || !employeeId) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const yearStart = dayjs().startOf('year').format('YYYY-MM-DD')
        const yearEnd = dayjs().endOf('year').format('YYYY-MM-DD')

        const query = `
          query GetEmployeeYearlyAbsences($employeeId: uuid!, $yearStart: timestamp!, $yearEnd: timestamp!) {
            EmployeeAbsence(
              where: {
                employeeId: { _eq: $employeeId }
                startDate: { _lte: $yearEnd }
                endDate: { _gte: $yearStart }
                status: { _in: ["APPROVED", "PENDING", "PENDING_APPROVAL"] }
                isDeleted: { _eq: false }
              }
              orderBy: { startDate: ASC }
            ) {
              id
              startDate
              endDate
              status
              typeRef
              type {
                id
                value
                translations {
                  value
                  localeCode
                }
              }
            }
          }
        `

        const response = await graphqlClient.request<{ EmployeeAbsence: any[] }>(query, {
          employeeId,
          yearStart,
          yearEnd
        })

        setAbsences(response.EmployeeAbsence || [])
      } catch (err) {
        console.error('Error fetching yearly absences:', err)
        setError('Failed to load yearly calendar')
      } finally {
        setIsLoading(false)
      }
    }

    fetchYearlyAbsences()
  }, [accessToken, employeeId, graphqlClient])

  // Build absence map by date
  const absenceMap = useMemo(() => {
    const map: Record<string, DayAbsence> = {}

    absences.forEach(absence => {
      if (!absence.startDate || !absence.endDate) return

      const start = dayjs(absence.startDate)
      const end = dayjs(absence.endDate)
      const color = getAbsenceColor(absence.typeRef, absence.status)
      const typeName = getCatalogValue(absence.type) || absence.type?.value || 'Absence'

      let current = start
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateKey = current.format('YYYY-MM-DD')
        map[dateKey] = {
          type: typeName,
          status: absence.status,
          color,
          isCurrentRequest: false
        }
        current = current.add(1, 'day')
      }
    })

    // Mark current request days (override with distinct styling)
    if (currentRequestStartDate && currentRequestEndDate) {
      const start = dayjs(currentRequestStartDate)
      const end = dayjs(currentRequestEndDate)

      let current = start
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateKey = current.format('YYYY-MM-DD')
        map[dateKey] = {
          type: t('vacation-calendar-current-request'),
          status: 'PENDING',
          color: 'gba:bg-yellow-400',
          isCurrentRequest: true
        }
        current = current.add(1, 'day')
      }
    }

    return map
  }, [absences, currentRequestStartDate, currentRequestEndDate, t])

  // Generate current month data
  const currentMonth = useMemo(() => {
    const monthStart = dayjs().year(currentYear).month(currentMonthIndex).startOf('month')
    const monthEnd = monthStart.endOf('month')
    const monthName = monthStart.format('MMMM YYYY')

    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = monthStart.day()

    // Calculate days to show (including leading/trailing days from other months)
    const daysInMonth = monthEnd.date()
    const leadingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // Start week on Monday

    const days: CalendarDay[] = []

    // Add leading days from previous month (grayed out)
    for (let i = leadingDays - 1; i >= 0; i--) {
      const date = monthStart.subtract(i + 1, 'day')
      days.push({
        date,
        dayOfMonth: date.date(),
        isWeekend: date.day() === 0 || date.day() === 6,
        isToday: date.isSame(dayjs(), 'day'),
        absence: null
      })
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = monthStart.date(day)
      const dateKey = date.format('YYYY-MM-DD')

      days.push({
        date,
        dayOfMonth: day,
        isWeekend: date.day() === 0 || date.day() === 6,
        isToday: date.isSame(dayjs(), 'day'),
        absence: absenceMap[dateKey] || null
      })
    }

    // Add trailing days to complete the grid (up to 6 weeks)
    const totalCells = Math.ceil(days.length / 7) * 7
    const trailingDays = totalCells - days.length

    for (let i = 1; i <= trailingDays; i++) {
      const date = monthEnd.add(i, 'day')
      days.push({
        date,
        dayOfMonth: date.date(),
        isWeekend: date.day() === 0 || date.day() === 6,
        isToday: date.isSame(dayjs(), 'day'),
        absence: null
      })
    }

    return {
      monthName,
      monthIndex: currentMonthIndex,
      days
    }
  }, [currentYear, currentMonthIndex, absenceMap])

  // Calculate quick stats for collapsed state - MUST be before early returns
  const absenceStats = useMemo(() => {
    const vacation = absences.filter(a => a.typeRef?.includes('A001')).length
    const sick = absences.filter(a => a.typeRef?.includes('A002')).length
    const other = absences.filter(a => !a.typeRef?.includes('A001') && !a.typeRef?.includes('A002')).length
    return { vacation, sick, other, total: absences.length }
  }, [absences])

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const isRequestMonth = currentRequestStartDate
    ? currentMonthIndex === dayjs(currentRequestStartDate).month()
    : currentMonthIndex === dayjs().month()

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <Card data-testid="yearly-calendar-card" className="gba:shadow-sm">
        <CardContent className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="yearly-calendar-error">
        {error}
      </Alert>
    )
  }

  return (
    <Card data-testid="yearly-calendar-card" className="gba:shadow-none gba:border-none">
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-2.5 gba:bg-muted/50 gba:rounded-lg hover:gba:bg-muted gba:transition-colors gba:-m-2.5"
          data-testid="toggle-calendar"
        >
          <div className="gba:flex gba:items-center gba:gap-3">
            <CalendarDays className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0" />
            <div>
              <div className="gba:font-semibold gba:text-sm gba:text-left">
                {t('vacation-calendar-title')} {currentYear}
              </div>
              {!isExpanded && absenceStats.total > 0 && (
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                  {[
                    absenceStats.vacation > 0 && `${absenceStats.vacation} vacation`,
                    absenceStats.sick > 0 && `${absenceStats.sick} sick`,
                    absenceStats.other > 0 && `${absenceStats.other} other`
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
          ) : (
            <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
          )}
        </button>

        {isExpanded && (
          <>
            {/* Inline Legend - Only show relevant colors */}
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1.5 gba:mt-3 gba:text-xs gba:text-muted-foreground">
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-blue-500" />
                <span>{t('vacation-calendar-legend-vacation')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-red-500" />
                <span>{t('vacation-calendar-legend-sick')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-orange-400" />
                <span>{t('vacation-calendar-legend-pending')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-teal-500" />
                <span>{t('vacation-calendar-legend-other')}</span>
              </div>
              {currentRequestStartDate && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:font-medium">
                  <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-yellow-400 gba:ring-1 gba:ring-primary gba:ring-offset-1" />
                  <span>{t('vacation-calendar-legend-current-request')}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="gba:pt-3 gba:pb-4">
          {/* Compact Month View */}
          <div className="gba:max-w-md gba:mx-auto">
            {/* Navigation Bar with Month Name */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                data-testid="prev-month-button"
                className="gba:h-8 gba:w-8 gba:p-0 hover:gba:bg-muted"
              >
                <ChevronLeft className="gba:h-4 gba:w-4" />
              </Button>

              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:font-semibold gba:text-base gba:text-center">{currentMonth.monthName}</div>
                {!isRequestMonth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToRequestMonth}
                    data-testid="request-month-button"
                    className="gba:h-7 gba:px-2 gba:text-xs gba:text-primary hover:gba:bg-primary/10"
                  >
                    {t('vacation-calendar-request-month')}
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                data-testid="next-month-button"
                className="gba:h-8 gba:w-8 gba:p-0 hover:gba:bg-muted"
              >
                <ChevronRight className="gba:h-4 gba:w-4" />
              </Button>
            </div>

            {/* Week Day Headers */}
            <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:mb-1.5">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="gba:text-[11px] gba:text-center gba:text-muted-foreground gba:font-semibold gba:uppercase gba:tracking-wide"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Improved Calendar Days */}
            <div className="gba:grid gba:grid-cols-7 gba:gap-1.5">
              {currentMonth.days.map((day, dayIndex) => {
                const isCurrentMonthDay = day.date.month() === currentMonth.monthIndex
                const hasAbsence = !!day.absence
                const isCurrentRequest = day.absence?.isCurrentRequest

                const dayClasses = [
                  'gba:h-10 gba:flex gba:items-center gba:justify-center gba:text-xs gba:rounded-md gba:relative gba:transition-all gba:font-medium',
                  !isCurrentMonthDay && 'gba:opacity-25 gba:pointer-events-none',
                  isCurrentMonthDay && !hasAbsence && 'gba:cursor-pointer hover:gba:bg-muted/50',
                  day.isToday && !hasAbsence && 'gba:ring-2 gba:ring-primary/30 gba:bg-primary/5',
                  day.isWeekend && !hasAbsence && 'gba:bg-muted/70',
                  !day.isWeekend && !hasAbsence && 'gba:bg-muted/30',
                  hasAbsence && day.absence?.color,
                  hasAbsence && 'gba:text-white gba:shadow-sm',
                  isCurrentRequest &&
                    'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background gba:scale-105 gba:z-10'
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <div
                    key={dayIndex}
                    className={dayClasses}
                    title={
                      hasAbsence && day.absence
                        ? `${day.absence.type}${isCurrentRequest ? ' (Current Request)' : ''}`
                        : undefined
                    }
                  >
                    <span className={hasAbsence ? 'gba:font-semibold' : ''}>{day.dayOfMonth}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
