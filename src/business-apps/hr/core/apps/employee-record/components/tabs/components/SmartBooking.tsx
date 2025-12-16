import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  Card,
  CardContent,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { CalendarIcon, ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { getWeekStart, getWeekEnd, getWeekdays } from '../../../utils/weekUtils'
import { WeekBooking, DayHours } from '../../../types'
import CardTabHeaderComponent from '@/business-apps/mdm/apps/generic-components/card'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeeTeamAllocations } from '../../../hooks/useEmployeeTeamAllocations'

const DATA_TEST_ID_PREFIX = 'SmartBooking'

export interface SmartBookingProps {
  prefixDataTestId?: string
  accessToken: string
  employeeId: string
}

const SmartBooking: React.FC<SmartBookingProps> = ({ prefixDataTestId, accessToken, employeeId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Fetch employee's team allocations and recorded hours
  const {
    allocations,
    historicalProjects,
    recordedHoursByDate,
    bookedHours,
    isLoading: isLoadingAllocations,
    isLoadingWeekData,
    isSubmitting,
    error: allocationsError,
    refetch,
    fetchBookedHours,
    submitWorkingHours
  } = useEmployeeTeamAllocations({ accessToken, employeeId })

  // State for selected week
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weekBookings, setWeekBookings] = useState<Record<string, WeekBooking[]>>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Form type: key = "teamId-dayIndex", value = hours
  type FormValues = Record<string, number>

  // Initialize form with default values
  const form = useForm<FormValues>({
    defaultValues: {}
  })

  // Calculate week start and end
  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate])
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate])
  const weekDays = useMemo(() => getWeekdays(weekStart), [weekStart])
  const weekKey = useMemo(() => dayjs(weekStart).format('YYYY-MM-DD'), [weekStart])

  // Fetch booked hours when week changes
  useEffect(() => {
    fetchBookedHours(weekDays, allocations)
  }, [weekDays, allocations, fetchBookedHours])

  // Initialize week bookings with pre-filled hours based on recorded hours, booked hours, and allocation percentage
  const initializeWeekBookings = useCallback(() => {
    const allBookings: WeekBooking[] = []

    // Calculate total allocation percentage for distribution (only for current allocations)
    const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0)

    // Process current allocations
    for (const allocation of allocations) {
      // Check if at least one day of the week is >= assignedAt
      const hasValidDayInWeek = weekDays.some(day => {
        if (!allocation.assignedAt) return true // No assignment date = all days valid
        return !dayjs(day).isBefore(dayjs(allocation.assignedAt), 'day')
      })

      // Skip allocation if entire week is before assignment date
      if (!hasValidDayInWeek) continue

      const days: DayHours[] = weekDays.map(day => {
        const dateKey = dayjs(day).format('YYYY-MM-DD')

        // Check if day is before employee was assigned to this team/project
        const isBeforeAssignment = allocation.assignedAt
          ? dayjs(day).isBefore(dayjs(allocation.assignedAt), 'day')
          : false

        // If day is before assignment, set hours to 0 (employee wasn't on this project yet)
        if (isBeforeAssignment) {
          return {
            date: dayjs(day).toISOString(),
            hours: 0
          }
        }

        // Use projectId from allocation for booked hours lookup
        const bookedKey = allocation.projectId ? `${allocation.projectId}-${dateKey}` : ''
        const bookedData = bookedKey ? bookedHours[bookedKey] : undefined

        // If booked hours exist, use them (already submitted)
        if (bookedData) {
          return {
            date: dayjs(day).toISOString(),
            hours: bookedData.hours
          }
        }

        // Otherwise, distribute recorded hours proportionally based on allocation percentage
        const recordedHoursForDay = recordedHoursByDate[dateKey] || 0

        // If no hours recorded for this day, set to 0
        if (recordedHoursForDay === 0) {
          return {
            date: dayjs(day).toISOString(),
            hours: 0
          }
        }

        // Distribute recorded hours proportionally based on allocation percentage
        const distributedHours =
          totalPercentage > 0 ? (allocation.percentage / totalPercentage) * recordedHoursForDay : 0

        return {
          date: dayjs(day).toISOString(),
          hours: Number.parseFloat(distributedHours.toFixed(1))
        }
      })

      allBookings.push({
        teamId: allocation.teamId,
        teamName: allocation.teamName,
        percentage: allocation.percentage,
        projectId: allocation.projectId,
        projectName: allocation.projectName,
        assignedAt: allocation.assignedAt,
        days
      })
    }

    // Process historical projects (projects with booked hours but no current allocation)
    for (const historicalProject of historicalProjects) {
      const days: DayHours[] = weekDays.map(day => {
        const dateKey = dayjs(day).format('YYYY-MM-DD')
        const bookedKey = `${historicalProject.projectId}-${dateKey}`
        const bookedData = bookedHours[bookedKey]

        return {
          date: dayjs(day).toISOString(),
          hours: bookedData?.hours || 0
        }
      })

      // Only add if there are any booked hours for this week
      const hasBookedHours = days.some(d => d.hours > 0)
      if (hasBookedHours) {
        allBookings.push({
          teamId: `historical-${historicalProject.projectId}`, // Unique ID for historical entries
          teamName: historicalProject.projectName,
          percentage: 0, // No allocation percentage for historical
          projectId: historicalProject.projectId,
          projectName: historicalProject.projectName,
          assignedAt: undefined, // Historical - no assignment date relevant
          days
        })
      }
    }

    setWeekBookings(prev => ({
      ...prev,
      [weekKey]: allBookings
    }))

    // Update form default values
    const formValues: FormValues = {}
    for (const booking of allBookings) {
      for (let dayIndex = 0; dayIndex < booking.days.length; dayIndex++) {
        const fieldKey = `${booking.teamId}-${dayIndex}`
        formValues[fieldKey] = booking.days[dayIndex].hours
      }
    }
    form.reset(formValues)
  }, [weekKey, weekDays, allocations, historicalProjects, recordedHoursByDate, bookedHours, form])

  // Create a serialized key from recordedHoursByDate and bookedHours to detect changes
  const recordedHoursKey = React.useMemo(() => JSON.stringify(recordedHoursByDate), [recordedHoursByDate])
  const bookedHoursKey = React.useMemo(() => JSON.stringify(bookedHours), [bookedHours])
  const historicalProjectsKey = React.useMemo(() => JSON.stringify(historicalProjects), [historicalProjects])

  // Initialize on mount or when allocations/week/recorded hours/booked hours/historical projects change
  React.useEffect(() => {
    // Initialize if we have current allocations OR historical projects with booked hours
    if (allocations.length > 0 || historicalProjects.length > 0) {
      initializeWeekBookings()
    }
  }, [
    initializeWeekBookings,
    allocations.length,
    historicalProjects.length,
    recordedHoursKey,
    bookedHoursKey,
    historicalProjectsKey
  ])

  // Get current week bookings
  const currentBookings = weekBookings[weekKey] || []

  // Check if there are any unsubmitted hours (to enable/disable submit button)
  const hasUnsubmittedHours = useMemo(() => {
    const currentMonth = dayjs().month()
    const currentYear = dayjs().year()

    for (const booking of currentBookings) {
      // Skip bookings without projectId or historical bookings
      if (!booking.projectId || booking.teamId.startsWith('historical-')) continue

      for (let dayIndex = 0; dayIndex < booking.days.length; dayIndex++) {
        const day = booking.days[dayIndex]
        const dateKey = dayjs(day.date).format('YYYY-MM-DD')
        const bookedKey = `${booking.projectId}-${dateKey}`
        const isSubmitted = !!bookedHours[bookedKey]

        // Check if day is before assignment
        const isBeforeAssignment = booking.assignedAt
          ? dayjs(day.date).isBefore(dayjs(booking.assignedAt), 'day')
          : false

        // Check if day is not in the current month
        const dayMonth = dayjs(day.date).month()
        const dayYear = dayjs(day.date).year()
        const isNotCurrentMonth = dayMonth !== currentMonth || dayYear !== currentYear

        // If not submitted, not before assignment, and in current month, we have unsubmitted hours
        if (!isSubmitted && !isBeforeAssignment && !isNotCurrentMonth) {
          return true
        }
      }
    }
    return false
  }, [currentBookings, bookedHours])

  // Check if there are any submitted hours for this week (to show "Submitted" label)
  const hasSubmittedHours = useMemo(() => {
    for (const booking of currentBookings) {
      if (!booking.projectId) continue

      for (const day of booking.days) {
        const dateKey = dayjs(day.date).format('YYYY-MM-DD')
        const bookedKey = `${booking.projectId}-${dateKey}`
        if (bookedHours[bookedKey]) {
          return true
        }
      }
    }
    return false
  }, [currentBookings, bookedHours])

  // Handle date selection from calendar
  const handleCalendarDateSelect = (date: Date | undefined) => {
    // When user selects a date, calculate the week for that date
    if (date) {
      // Calculate the week start (Monday) for the selected date
      const newWeekStart = getWeekStart(date)
      setSelectedDate(newWeekStart)
      setIsCalendarOpen(false)
    }
  }

  // Navigate to previous week
  const handlePreviousWeek = () => {
    setSelectedDate(dayjs(selectedDate).subtract(1, 'week').toDate())
  }

  // Navigate to next week
  const handleNextWeek = () => {
    setSelectedDate(dayjs(selectedDate).add(1, 'week').toDate())
  }

  // Navigate to current week
  const handleCurrentWeek = () => {
    setSelectedDate(new Date())
  }

  // Get recorded hours for a specific day
  const getRecordedHoursForDay = (day: Date): number => {
    const dateKey = dayjs(day).format('YYYY-MM-DD')
    return recordedHoursByDate[dateKey] || 0
  }

  // Watch form values to trigger re-render when they change
  const formValues = form.watch()

  // Calculate total hours per day (sum of all team/project hours from form values)
  const getTotalHoursForDay = useCallback(
    (dayIndex: number): number => {
      return currentBookings.reduce((sum, booking) => {
        const fieldKey = `${booking.teamId}-${dayIndex}`
        const hours = formValues[fieldKey] || 0
        return sum + hours
      }, 0)
    },
    [currentBookings, formValues]
  )

  // Calculate total hours per team for the week (from form values)
  const getTotalHoursForTeam = useCallback(
    (booking: WeekBooking): number => {
      let total = 0
      for (let dayIndex = 0; dayIndex < booking.days.length; dayIndex++) {
        const fieldKey = `${booking.teamId}-${dayIndex}`
        const hours = formValues[fieldKey] || 0
        total += hours
      }
      return total
    },
    [formValues]
  )

  // Handle submit - must be before early returns to follow Rules of Hooks
  const handleSubmit = useCallback(async () => {
    try {
      const formValues = form.getValues()
      const currentMonth = dayjs().month()
      const currentYear = dayjs().year()
      const modifiedBookings: Array<{
        teamId: string
        projectId: string
        days: Array<{ date: string; hours: number }>
      }> = []

      // Only include bookings that have been modified (not already submitted)
      for (const booking of currentBookings) {
        // Skip bookings without projectId
        if (!booking.projectId) continue

        const modifiedDays: Array<{ date: string; hours: number }> = []
        for (let dayIndex = 0; dayIndex < booking.days.length; dayIndex++) {
          const day = booking.days[dayIndex]
          const fieldKey = `${booking.teamId}-${dayIndex}`
          const formValue = formValues[fieldKey] || 0
          const dateKey = dayjs(day.date).format('YYYY-MM-DD')
          const bookedKey = `${booking.projectId}-${dateKey}`
          const isSubmitted = !!bookedHours[bookedKey]

          // Skip days before employee was assigned to this project
          const isBeforeAssignment = booking.assignedAt
            ? dayjs(day.date).isBefore(dayjs(booking.assignedAt), 'day')
            : false

          // Skip days not in current month
          const dayMonth = dayjs(day.date).month()
          const dayYear = dayjs(day.date).year()
          const isNotCurrentMonth = dayMonth !== currentMonth || dayYear !== currentYear

          // Only include if not already submitted, not before assignment date, and in current month
          if (!isSubmitted && !isBeforeAssignment && !isNotCurrentMonth) {
            modifiedDays.push({
              date: day.date,
              hours: formValue
            })
          }
        }

        if (modifiedDays.length > 0) {
          modifiedBookings.push({
            teamId: booking.teamId,
            projectId: booking.projectId,
            days: modifiedDays
          })
        }
      }

      if (modifiedBookings.length > 0) {
        await submitWorkingHours(modifiedBookings)
        // Refetch booked hours after successful submit
        await fetchBookedHours(weekDays, allocations)
      }
    } catch (err) {
      // Error is already handled in the hook
      console.error('Failed to submit working hours:', err)
    }
  }, [form, submitWorkingHours, currentBookings, bookedHours, fetchBookedHours, weekDays, allocations])

  // Show loading state
  if (isLoadingAllocations) {
    return (
      <Card data-testid={dataTestId} className="gba:overflow-hidden">
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (allocationsError) {
    return (
      <Card data-testid={dataTestId} className="gba:overflow-hidden">
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.smart_booking.error_loading_team_allocations',
                'Error Loading Team Allocations'
              )}
            </AlertTitle>
            <AlertDescription>
              {allocationsError}
              <Button size="sm" variant="destructive" onClick={refetch} className="gba:mt-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.retry', 'Retry')}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show empty state only if no allocations AND no historical projects with booked hours
  if (allocations.length === 0 && currentBookings.length === 0) {
    return (
      <Card data-testid={dataTestId} className="gba:overflow-hidden">
        <CardTabHeaderComponent
          cardTitle={getTranslationFromI18nKeyAndLabel(
            'lowcoder:time_tracking.smart_booking.time_booking',
            'Time Booking'
          )}
          cardDescription={getTranslationFromI18nKeyAndLabel(
            'lowcoder:time_tracking.smart_booking.record_working_hours_by_project',
            'Record your working hours by project'
          )}
        />
        <CardContent>
          <Alert>
            <AlertTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.smart_booking.no_team_allocations',
                'No Team Allocations'
              )}
            </AlertTitle>
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.smart_booking.no_team_allocations_description',
                'You are not assigned to any teams. Please contact your administrator to be assigned to a team.'
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:overflow-hidden gba:flex gba:flex-col gba:gap-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.time_booking', 'Time Booking')}
        </div>
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasUnsubmittedHours}
          data-testid={`${dataTestId}-submit-button`}
        >
          {isSubmitting
            ? getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submitting', 'Submitting...')
            : hasSubmittedHours && !hasUnsubmittedHours
              ? getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submitted', 'Submitted')
              : getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submit_hours', 'Submit Hours')}
        </Button>
      </div>
      {/* Week Navigation */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gba:justify-start gba:text-left gba:font-normal gba:w-[280px]"
                data-testid={`${dataTestId}-week-selector`}
              >
                <CalendarIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                <span>
                  {dayjs(weekStart).format('D')} - {dayjs(weekEnd).format('D MMM YYYY')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-auto gba:p-0" align="start">
              <Calendar mode="single" selected={weekStart} onSelect={handleCalendarDateSelect} />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleCurrentWeek}>
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.today', 'Today')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ArrowRightIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>

      {/* Time Booking Table */}
      {isLoadingWeekData ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner size="lg" />
        </div>
      ) : currentBookings.length === 0 ? (
        <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:py-12 gba:text-center">
          <div className="gba:text-muted-foreground gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.no_projects_for_period',
              'No projects for this period'
            )}
          </div>
          <div className="gba:text-muted-foreground gba:text-sm">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.no_projects_for_period_description',
              'You were not assigned to any projects during this week, and there are no recorded hours.'
            )}
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form>
            <div className="gba:overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:min-w-[200px]"></TableHead>
                    <TableHead className="gba:text-center">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.smart_booking.allocation',
                        'Allocation'
                      )}
                    </TableHead>
                    {weekDays.map(day => (
                      <TableHead key={dayjs(day).format('YYYY-MM-DD')} className="gba:text-center gba:min-w-[100px]">
                        <span className="gba:text-sm gba:font-normal">{dayjs(day).format('ddd')}</span>
                      </TableHead>
                    ))}
                    <TableHead className="gba:text-center">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.total', 'Total')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Total Recorded Hours row */}
                  <TableRow className="gba:bg-background">
                    <TableCell className="gba:font-semibold">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.smart_booking.total_recorded_hours',
                        'Total Recorded Hours'
                      )}
                    </TableCell>
                    <TableCell></TableCell>
                    {weekDays.map(day => {
                      const recordedHours = getRecordedHoursForDay(day)
                      return (
                        <TableCell key={dayjs(day).format('YYYY-MM-DD')} className="gba:text-center gba:font-semibold">
                          {recordedHours.toFixed(1)}h
                        </TableCell>
                      )
                    })}
                    <TableCell className="gba:text-center gba:font-semibold">
                      {weekDays.reduce((sum, day) => sum + getRecordedHoursForDay(day), 0).toFixed(1)}h
                    </TableCell>
                  </TableRow>
                  {/* Team/Project rows */}
                  {currentBookings.map(booking => {
                    // Check if this is a historical booking (from booked hours, not current allocation)
                    const isHistoricalBooking = booking.teamId.startsWith('historical-')

                    return (
                      <TableRow key={booking.teamId} className={isHistoricalBooking ? 'gba:bg-muted/30' : ''}>
                        <TableCell className="gba:font-medium">
                          <div>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              {booking.teamName}
                              {isHistoricalBooking && (
                                <span className="gba:text-xs gba:bg-muted gba:text-muted-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                                  Removed
                                </span>
                              )}
                            </div>
                            {booking.projectName && !isHistoricalBooking && (
                              <div className="gba:text-xs gba:text-muted-foreground">{booking.projectName}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="gba:text-center">
                          {isHistoricalBooking ? '—' : `${booking.percentage}%`}
                        </TableCell>
                        {booking.days.map((day, dayIndex) => {
                          const fieldKey = `${booking.teamId}-${dayIndex}`
                          const dateKey = dayjs(day.date).format('YYYY-MM-DD')
                          const bookedKey = booking.projectId ? `${booking.projectId}-${dateKey}` : ''
                          const isSubmitted = bookedKey ? !!bookedHours[bookedKey] : false

                          // Check if day is before employee was assigned to this team/project
                          const isBeforeAssignment = booking.assignedAt
                            ? dayjs(day.date).isBefore(dayjs(booking.assignedAt), 'day')
                            : false

                          // Check if day is not in the current month (disable editing for past/future months)
                          const currentMonth = dayjs().month()
                          const currentYear = dayjs().year()
                          const dayMonth = dayjs(day.date).month()
                          const dayYear = dayjs(day.date).year()
                          const isNotCurrentMonth = dayMonth !== currentMonth || dayYear !== currentYear

                          return (
                            <TableCell key={day.date} className="gba:text-center">
                              {isBeforeAssignment ? (
                                // Show dash for days before assignment
                                <div className="gba:flex gba:justify-center">
                                  <span className="gba:text-muted-foreground gba:w-20 gba:text-center">—</span>
                                </div>
                              ) : isHistoricalBooking || isSubmitted ? (
                                // Historical or submitted: show value as text
                                <div className="gba:flex gba:justify-center">
                                  <span className="gba:text-muted-foreground gba:w-20 gba:text-center">
                                    {day.hours > 0 ? day.hours.toFixed(1) : '—'}
                                  </span>
                                </div>
                              ) : isNotCurrentMonth ? (
                                // Not current month: show disabled input with value
                                <div className="gba:flex gba:justify-center">
                                  <Input
                                    type="text"
                                    disabled
                                    className="gba:w-20 gba:text-center"
                                    value={day.hours > 0 ? day.hours.toFixed(1) : 0}
                                  />
                                </div>
                              ) : (
                                <FormField
                                  control={form.control}
                                  name={fieldKey}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <div className="gba:flex gba:justify-center">
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="gba:w-20 gba:text-center"
                                            data-testid={`${dataTestId}-hours-${booking.teamId}-${dayIndex}`}
                                            value={field.value ?? 0}
                                            onChange={e => {
                                              const rawValue = e.target.value
                                              // Allow empty string for clearing
                                              if (rawValue === '') {
                                                field.onChange(0)
                                                return
                                              }
                                              // Only allow numbers and decimal point
                                              if (!/^[\d.]*$/.test(rawValue)) return
                                              // Parse and validate (max 24 hours per day)
                                              const numValue = Number.parseFloat(rawValue)
                                              if (!Number.isNaN(numValue) && numValue <= 24) {
                                                field.onChange(Number.parseFloat(numValue.toFixed(1)))
                                              }
                                            }}
                                            onBlur={() => {
                                              // Ensure value is properly formatted on blur
                                              const val = field.value ?? 0
                                              field.onChange(Number.parseFloat(val.toFixed(1)))
                                            }}
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="gba:text-center gba:font-semibold">
                          {getTotalHoursForTeam(booking).toFixed(1)}h
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* Total row */}
                  <TableRow className="gba:bg-muted">
                    <TableCell colSpan={2} className="gba:font-semibold">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.smart_booking.daily_total',
                        'Daily Total'
                      )}
                    </TableCell>
                    {weekDays.map((day, dayIndex) => {
                      const total = getTotalHoursForDay(dayIndex)
                      return (
                        <TableCell key={dayjs(day).format('YYYY-MM-DD')} className="gba:text-center gba:font-semibold">
                          {total.toFixed(1)}h
                        </TableCell>
                      )
                    })}
                    <TableCell className="gba:text-center gba:font-semibold">
                      {currentBookings.reduce((sum, booking) => sum + getTotalHoursForTeam(booking), 0).toFixed(1)}h
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}

export default SmartBooking
