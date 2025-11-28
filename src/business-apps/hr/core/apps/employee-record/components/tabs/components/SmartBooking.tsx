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
const HOURS_PER_DAY = 8

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
    recordedHoursByDate,
    bookedHours,
    isLoading: isLoadingAllocations,
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
  const PROJECT_ID = 'c9e04233-02bd-46f9-90b2-b2a72e017371'

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
    if (allocations.length > 0) {
      fetchBookedHours(weekDays)
    }
  }, [weekDays, allocations.length, fetchBookedHours])

  // Initialize week bookings with pre-filled hours based on recorded hours, booked hours, and allocation percentage
  const initializeWeekBookings = useCallback(() => {
    if (allocations.length === 0) {
      return // No allocations available
    }

    // Calculate total allocation percentage for distribution
    const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0)

    const bookings: WeekBooking[] = allocations.map(allocation => {
      const days: DayHours[] = weekDays.map(day => {
        const dateKey = dayjs(day).format('YYYY-MM-DD')
        const bookedKey = `${PROJECT_ID}-${dateKey}`
        const bookedData = bookedHours[bookedKey]

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
        // Formula: (allocation.percentage / totalPercentage) * recordedHoursForDay
        const distributedHours =
          totalPercentage > 0 ? (allocation.percentage / totalPercentage) * recordedHoursForDay : 0

        return {
          date: dayjs(day).toISOString(),
          hours: Number.parseFloat(distributedHours.toFixed(2))
        }
      })

      return {
        teamId: allocation.teamId,
        teamName: allocation.teamName,
        percentage: allocation.percentage,
        projectId: allocation.projectId,
        projectName: allocation.projectName,
        days
      }
    })

    setWeekBookings(prev => ({
      ...prev,
      [weekKey]: bookings
    }))

    // Update form default values
    const formValues: FormValues = {}
    for (const booking of bookings) {
      for (let dayIndex = 0; dayIndex < booking.days.length; dayIndex++) {
        const fieldKey = `${booking.teamId}-${dayIndex}`
        formValues[fieldKey] = booking.days[dayIndex].hours
      }
    }
    form.reset(formValues)
  }, [weekKey, weekDays, allocations, recordedHoursByDate, bookedHours, PROJECT_ID, form])

  // Create a serialized key from recordedHoursByDate and bookedHours to detect changes
  const recordedHoursKey = React.useMemo(() => JSON.stringify(recordedHoursByDate), [recordedHoursByDate])
  const bookedHoursKey = React.useMemo(() => JSON.stringify(bookedHours), [bookedHours])

  // Initialize on mount or when allocations/week/recorded hours/booked hours change
  React.useEffect(() => {
    if (allocations.length > 0) {
      initializeWeekBookings()
    }
  }, [initializeWeekBookings, allocations.length, recordedHoursKey, bookedHoursKey])

  // Get current week bookings
  const currentBookings = weekBookings[weekKey] || []

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
      const modifiedBookings: Array<{ teamId: string; days: Array<{ date: string; hours: number }> }> = []

      // Only include bookings that have been modified (not already submitted)
      for (const booking of currentBookings) {
        const modifiedDays: Array<{ date: string; hours: number }> = []
        for (let dayIndex = 0; dayIndex < booking.days.length; dayIndex++) {
          const day = booking.days[dayIndex]
          const fieldKey = `${booking.teamId}-${dayIndex}`
          const formValue = formValues[fieldKey] || 0
          const dateKey = dayjs(day.date).format('YYYY-MM-DD')
          const bookedKey = `${PROJECT_ID}-${dateKey}`
          const isSubmitted = !!bookedHours[bookedKey]

          // Only include if not already submitted (modified)
          if (!isSubmitted) {
            modifiedDays.push({
              date: day.date,
              hours: formValue
            })
          }
        }

        if (modifiedDays.length > 0) {
          modifiedBookings.push({
            teamId: booking.teamId,
            days: modifiedDays
          })
        }
      }

      if (modifiedBookings.length > 0) {
        await submitWorkingHours(modifiedBookings)
        // Refetch booked hours after successful submit
        await fetchBookedHours(weekDays)
      }
    } catch (err) {
      // Error is already handled in the hook
      console.error('Failed to submit working hours:', err)
    }
  }, [form, submitWorkingHours, currentBookings, bookedHours, PROJECT_ID, fetchBookedHours, weekDays])

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

  // Show empty state
  if (allocations.length === 0) {
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
          disabled={isSubmitting || currentBookings.length === 0}
          data-testid={`${dataTestId}-submit-button`}
        >
          {isSubmitting
            ? getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submitting', 'Submitting...')
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
      {currentBookings.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spinner size="lg" />
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
                  {currentBookings.map(booking => (
                    <TableRow key={booking.teamId}>
                      <TableCell className="gba:font-medium">
                        <div>
                          <div>{booking.teamName}</div>
                          {booking.projectName && (
                            <div className="gba:text-xs gba:text-muted-foreground">{booking.projectName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-center">{booking.percentage}%</TableCell>
                      {booking.days.map((day, dayIndex) => {
                        const fieldKey = `${booking.teamId}-${dayIndex}`
                        const dateKey = dayjs(day.date).format('YYYY-MM-DD')
                        const bookedKey = `${PROJECT_ID}-${dateKey}`
                        const isSubmitted = !!bookedHours[bookedKey]

                        return (
                          <TableCell key={day.date} className="gba:text-center">
                            <FormField
                              control={form.control}
                              name={fieldKey}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="gba:flex gba:justify-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={HOURS_PER_DAY}
                                        step="0.5"
                                        disabled={isSubmitted}
                                        className="gba:w-20 gba:text-center"
                                        data-testid={`${dataTestId}-hours-${booking.teamId}-${dayIndex}`}
                                        {...field}
                                        value={field.value ?? 0}
                                        onChange={e => {
                                          const numValue = Number.parseFloat(e.target.value) || 0
                                          field.onChange(numValue)
                                        }}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                        )
                      })}
                      <TableCell className="gba:text-center gba:font-semibold">
                        {getTotalHoursForTeam(booking).toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="gba:bg-muted">
                    <TableCell colSpan={2} className="gba:font-semibold">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.smart_booking.daily_total',
                        'Daily Total'
                      )}
                    </TableCell>
                    {weekDays.map(day => {
                      const dayIndex = weekDays.indexOf(day)
                      const total = getTotalHoursForDay(dayIndex)
                      const isComplete = Math.abs(total - HOURS_PER_DAY) < 0.01 // Allow small floating point differences
                      const difference = total - HOURS_PER_DAY
                      let differenceText = ''
                      if (Math.abs(difference) >= 0.01) {
                        const sign = difference > 0 ? '+' : '-'
                        const absDifference = Math.abs(difference)
                        differenceText = `${sign}${absDifference.toFixed(1)}h`
                      }
                      return (
                        <TableCell
                          key={dayjs(day).format('YYYY-MM-DD')}
                          className={`gba:text-center gba:font-semibold ${isComplete ? '' : 'gba:text-destructive'}`}
                        >
                          <div>{total.toFixed(1)}h</div>
                          {differenceText && (
                            <div className={`gba:text-xs ${isComplete ? '' : 'gba:text-destructive'}`}>
                              {differenceText}
                            </div>
                          )}
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
