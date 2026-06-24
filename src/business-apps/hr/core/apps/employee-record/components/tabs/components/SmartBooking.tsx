import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  Card,
  CardContent,
  Button,
  DurationInput,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Toaster
} from '@newwork/nw-design-system'
import { TableForm, EditableCell } from '@/components/table-form'
import { CalendarIcon, ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { getWeekStart, getWeekDays } from '../../../utils/weekUtils'
import { WeekBooking, DayHours } from '../../../types'
import CardTabHeaderComponent from '@/business-apps/mdm/apps/generic-components/card'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)
import { getTranslationFromI18nKeyAndLabel, formatDate, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useEmployeeTeamAllocations } from '../../../hooks/useEmployeeTeamAllocations'
import SubmitConfirmationDialog, { HoursDiscrepancy, DiscrepancyType } from './SubmitConfirmationDialog'
import { cn } from '@/common/utils/cn'

const DATA_TEST_ID_PREFIX = 'SmartBooking'

/**
 * Cell values are durations (an amount of time worked), not clock times — so
 * hours are not bounded by 24. We still keep both segments to two digits to
 * match the visible "HH:MM" format and avoid nonsense input like "1245:0101".
 * The design system's DurationInput already clamps minutes to 59 but leaves
 * the leading hours segment unbounded; this helper caps it at 99.
 */
const MAX_HOURS = 99
const MAX_MINUTES = 59

/**
 * Clamp a "HH:MM" duration string so hours stay in 00-99 and minutes in 00-59.
 * Inputs that don't match the expected shape are returned unchanged so the
 * caller can decide how to handle malformed values.
 */
const clampDurationHHMM = (value: string): string => {
  if (!value || !value.includes(':')) return value
  const [hPart = '0', mPart = '0'] = value.split(':')
  const hours = Number.parseInt(hPart, 10)
  const minutes = Number.parseInt(mPart, 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  const clampedHours = Math.min(MAX_HOURS, Math.max(0, hours))
  const clampedMinutes = Math.min(MAX_MINUTES, Math.max(0, minutes))
  return `${clampedHours.toString().padStart(2, '0')}:${clampedMinutes.toString().padStart(2, '0')}`
}

/**
 * Convert decimal hours to HH:MM time string
 * Example: 4.5 -> "04:30", 8.75 -> "08:45"
 */
const hoursToTimeString = (hours: number): string => {
  if (hours <= 0) return '00:00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Convert HH:MM time string to decimal hours
 * Example: "04:30" -> 4.5, "08:45" -> 8.75
 */
const timeStringToHours = (time: string): number => {
  if (!time || !time.includes(':')) return 0
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h + m / 60
}

/**
 * Get dayjs instance with user's locale
 */
const getLocalizedDayjs = (date: Date | string) => {
  const locale = getCurrentActiveUserLocale()
  const dayjsLocale = locale.startsWith('de') ? 'de' : locale.startsWith('ro') ? 'ro' : 'en'
  return dayjs(date).locale(dayjsLocale)
}

export interface SmartBookingProps {
  prefixDataTestId?: string
  accessToken: string
  employeeId: string
  viewOnly?: boolean
}

const SmartBooking: React.FC<SmartBookingProps> = ({ prefixDataTestId, accessToken, employeeId, viewOnly = false }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Fetch employee's team allocations and recorded hours
  const {
    allocations,
    historicalProjects,
    recordedHoursByDate,
    bookedHours,
    yearlyProjectHours,
    workingHoursPerDay,
    isLoading: isLoadingAllocations,
    isLoadingWeekData,
    isLoadingYearData,
    isSubmitting,
    error: allocationsError,
    refetch,
    fetchWorkingHoursPerDay,
    fetchBookedHours,
    fetchYearProjectHours,
    submitWorkingHours
  } = useEmployeeTeamAllocations({ accessToken, employeeId })

  // State for selected week
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weekBookings, setWeekBookings] = useState<Record<string, WeekBooking[]>>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [discrepancies, setDiscrepancies] = useState<HoursDiscrepancy[]>([])
  const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyType>('under')
  const [pendingBookings, setPendingBookings] = useState<
    Array<{ teamId: string; projectId: string; days: Array<{ date: string; timeString: string }> }>
  >([])

  // Track which week the form is initialized for (to prevent showing stale data)
  const [formInitializedForWeek, setFormInitializedForWeek] = useState<string | null>(null)

  // Form type: key = "teamId-dayIndex", value = time string "HH:MM"
  type FormValues = Record<string, string>

  // Initialize form with default values
  const form = useForm<FormValues>({
    defaultValues: {}
  })

  // Calculate week start and days (full week Mon-Sun)
  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate])
  // Generate all 7 days of the week (Monday to Sunday)
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekKey = useMemo(() => dayjs(weekStart).format('YYYY-MM-DD'), [weekStart])

  // Reset form state when week changes to prevent flicker with old values
  useEffect(() => {
    setFormInitializedForWeek(null)
    form.reset({})
  }, [weekKey, form])

  useEffect(() => {
    if (viewOnly) return

    fetchWorkingHoursPerDay(weekStart)
  }, [fetchWorkingHoursPerDay, viewOnly, weekStart])

  // Fetch booked hours when week changes
  useEffect(() => {
    if (viewOnly) return

    fetchBookedHours(weekDays, allocations)
  }, [weekDays, allocations, fetchBookedHours, viewOnly])

  useEffect(() => {
    if (!viewOnly) return

    fetchYearProjectHours(currentYear)
  }, [currentYear, fetchYearProjectHours, viewOnly])

  // Initialize week bookings with pre-filled hours based on recorded hours, booked hours, and allocation percentage
  const initializeWeekBookings = useCallback(() => {
    const allBookings: WeekBooking[] = []

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

        // Distribute recorded hours based on absolute allocation percentage
        // Keep full precision here - hoursToTimeString handles display rounding via Math.round
        const distributedHours = (allocation.percentage / 100) * recordedHoursForDay

        return {
          date: dayjs(day).toISOString(),
          hours: distributedHours
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

    // Update form default values (convert decimal hours to HH:MM strings)
    const formValues: FormValues = {}
    for (const booking of allBookings) {
      for (const [dayIndex, day] of booking.days.entries()) {
        const fieldKey = `${booking.teamId}-${dayIndex}`
        formValues[fieldKey] = hoursToTimeString(day.hours)
      }
    }
    form.reset(formValues)

    // Mark form as initialized for this week
    setFormInitializedForWeek(weekKey)
  }, [weekKey, weekDays, allocations, historicalProjects, recordedHoursByDate, bookedHours, form])

  // Create a serialized key from recordedHoursByDate and bookedHours to detect changes
  const recordedHoursKey = React.useMemo(() => JSON.stringify(recordedHoursByDate), [recordedHoursByDate])
  const bookedHoursKey = React.useMemo(() => JSON.stringify(bookedHours), [bookedHours])
  const historicalProjectsKey = React.useMemo(() => JSON.stringify(historicalProjects), [historicalProjects])

  // Initialize on mount or when allocations/week/recorded hours/booked hours/historical projects change
  React.useEffect(() => {
    if (viewOnly) return

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
    historicalProjectsKey,
    viewOnly
  ])

  // Get current week bookings
  const currentBookings = weekBookings[weekKey] || []
  const monthIndexes = useMemo(() => Array.from({ length: 12 }, (_, monthIndex) => monthIndex), [])

  // Helper function to check day editability status
  const getDayEditStatus = useCallback(
    (day: DayHours, booking: WeekBooking) => {
      const today = dayjs()
      const currentMonth = today.month()
      const currentYear = today.year()
      const dateKey = dayjs(day.date).format('YYYY-MM-DD')
      const bookedKey = booking.projectId ? `${booking.projectId}-${dateKey}` : ''

      const isSubmitted = bookedKey ? !!bookedHours[bookedKey] : false
      const isBeforeAssignment = booking.assignedAt ? dayjs(day.date).isBefore(dayjs(booking.assignedAt), 'day') : false
      const dayMonth = dayjs(day.date).month()
      const dayYear = dayjs(day.date).year()

      const isCurrentMonth = dayMonth === currentMonth && dayYear === currentYear

      // Allow previous month if we are within the first 7 days of the current month (grace period)
      const isInGracePeriod = today.date() <= 7
      const previousMonth = today.subtract(1, 'month')
      const isPreviousMonthInGracePeriod =
        isInGracePeriod && dayMonth === previousMonth.month() && dayYear === previousMonth.year()

      const isNotCurrentMonth = !isCurrentMonth && !isPreviousMonthInGracePeriod
      const isEditable = !isSubmitted && !isBeforeAssignment && !isNotCurrentMonth

      return { isSubmitted, isBeforeAssignment, isNotCurrentMonth, isEditable, dateKey, bookedKey }
    },
    [bookedHours]
  )

  // Helper function to check if a day is a non-working day (0 scheduled hours)
  const isNonWorkingDay = useCallback(
    (date: Date): boolean => {
      if (!workingHoursPerDay) return false
      const dayOfWeek = dayjs(date).day() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const dayMap: Record<number, keyof typeof workingHoursPerDay> = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      }
      return workingHoursPerDay[dayMap[dayOfWeek]] === 0
    },
    [workingHoursPerDay]
  )

  // Check if there are any unsubmitted hours (to enable/disable submit button)
  const hasUnsubmittedHours = useMemo(() => {
    for (const booking of currentBookings) {
      // Skip bookings without projectId or historical bookings
      if (!booking.projectId || booking.teamId.startsWith('historical-')) continue

      for (const day of booking.days) {
        const { isEditable } = getDayEditStatus(day, booking)
        if (isEditable) {
          return true
        }
      }
    }
    return false
  }, [currentBookings, getDayEditStatus])

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
        const rawValue = formValues[fieldKey]
        const timeStr = typeof rawValue === 'string' ? rawValue : '00:00'
        return sum + timeStringToHours(timeStr)
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
        const rawValue = formValues[fieldKey]
        const timeStr = typeof rawValue === 'string' ? rawValue : '00:00'
        total += timeStringToHours(timeStr)
      }
      return total
    },
    [formValues]
  )

  const getYearProjectMonthHours = useCallback(
    (projectId: string, monthIndex: number): number => yearlyProjectHours.monthlyHours[monthIndex]?.[projectId] ?? 0,
    [yearlyProjectHours.monthlyHours]
  )

  const getYearProjectTotal = useCallback(
    (projectId: string): number =>
      monthIndexes.reduce((sum, monthIndex) => sum + getYearProjectMonthHours(projectId, monthIndex), 0),
    [getYearProjectMonthHours, monthIndexes]
  )

  const getYearMonthTotal = useCallback(
    (monthIndex: number): number =>
      yearlyProjectHours.projects.reduce(
        (sum, project) => sum + getYearProjectMonthHours(project.projectId, monthIndex),
        0
      ),
    [getYearProjectMonthHours, yearlyProjectHours.projects]
  )

  const readOnlySummary = useMemo(() => {
    const recordedHours = yearlyProjectHours.recordedHours
    const projectHours = yearlyProjectHours.projects.reduce(
      (sum, project) => sum + getYearProjectTotal(project.projectId),
      0
    )
    const unallocatedHours = Math.abs(projectHours - recordedHours)
    const activeProjects = yearlyProjectHours.projects.filter(
      project => getYearProjectTotal(project.projectId) > 0
    ).length
    const recordedDays = yearlyProjectHours.recordedDays
    const projectDays = yearlyProjectHours.projectDays

    return {
      recordedHours,
      projectHours,
      unallocatedHours,
      activeProjects,
      recordedDays,
      projectDays
    }
  }, [getYearProjectTotal, yearlyProjectHours])

  // Perform actual submit (called directly or after confirmation)
  const performSubmit = useCallback(
    async (
      bookingsToSubmit: Array<{ teamId: string; projectId: string; days: Array<{ date: string; timeString: string }> }>
    ) => {
      try {
        if (bookingsToSubmit.length > 0) {
          await submitWorkingHours(bookingsToSubmit)
          // Refetch booked hours after successful submit
          await fetchBookedHours(weekDays, allocations)
        }
        // Clear pending state
        setPendingBookings([])
        setShowConfirmDialog(false)
      } catch (err) {
        console.error('Failed to submit working hours:', err)
      }
    },
    [submitWorkingHours, fetchBookedHours, weekDays, allocations]
  )

  // Handle submit - check for discrepancies and show dialog if needed
  const handleSubmit = useCallback(() => {
    const formValues = form.getValues()
    const dailyTotals: Record<string, number> = {}
    const editableDates = new Set<string>()
    const modifiedBookings: Array<{
      teamId: string
      projectId: string
      days: Array<{ date: string; timeString: string }>
    }> = []

    for (const booking of currentBookings) {
      // Skip bookings without projectId or historical bookings
      if (!booking.projectId || booking.teamId.startsWith('historical-')) continue

      const modifiedDays: Array<{ date: string; timeString: string }> = []

      for (const [dayIndex, day] of booking.days.entries()) {
        const { isEditable, dateKey } = getDayEditStatus(day, booking)
        const fieldKey = `${booking.teamId}-${dayIndex}`
        const rawValue = formValues[fieldKey]
        const timeStr = typeof rawValue === 'string' ? rawValue : '00:00'
        const hoursValue = timeStringToHours(timeStr)

        if (isEditable) {
          editableDates.add(dateKey)
          dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + hoursValue
          modifiedDays.push({ date: day.date, timeString: timeStr })
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

    // Add already-submitted hours to dailyTotals so discrepancy check accounts for the full picture
    for (const dateKey of editableDates) {
      for (const booking of currentBookings) {
        if (!booking.projectId) continue
        const bookedKey = `${booking.projectId}-${dateKey}`
        const booked = bookedHours[bookedKey]
        if (booked) {
          dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + booked.hours
        }
      }
    }

    // Check for discrepancies (under or over distributed hours)
    const allDiscrepancies: HoursDiscrepancy[] = []
    let hasUnder = false
    let hasOver = false

    for (const dateKey of editableDates) {
      const allocatedTotal = dailyTotals[dateKey] || 0
      const recordedTotal = recordedHoursByDate[dateKey] || 0
      const tolerance = 0.01 // Small floating point tolerance

      if (allocatedTotal < recordedTotal - tolerance) {
        hasUnder = true
        allDiscrepancies.push({
          date: dateKey,
          dateFormatted: `${getLocalizedDayjs(dateKey).format('ddd')}, ${formatDate(dateKey, 'date.short') || dateKey}`,
          allocatedHours: hoursToTimeString(allocatedTotal),
          recordedHours: hoursToTimeString(recordedTotal),
          type: 'under'
        })
      } else if (allocatedTotal > recordedTotal + tolerance) {
        hasOver = true
        allDiscrepancies.push({
          date: dateKey,
          dateFormatted: `${getLocalizedDayjs(dateKey).format('ddd')}, ${formatDate(dateKey, 'date.short') || dateKey}`,
          allocatedHours: hoursToTimeString(allocatedTotal),
          recordedHours: hoursToTimeString(recordedTotal),
          type: 'over'
        })
      }
    }

    // If there are discrepancies, show confirmation dialog
    if (allDiscrepancies.length > 0) {
      // Determine discrepancy type: mixed if both under and over exist
      let type: DiscrepancyType = 'under'
      if (hasUnder && hasOver) {
        type = 'mixed'
      } else if (hasOver) {
        type = 'over'
      }

      setDiscrepancies(allDiscrepancies)
      setDiscrepancyType(type)
      setPendingBookings(modifiedBookings)
      setShowConfirmDialog(true)
      return
    }

    // No discrepancies - show simple confirmation dialog
    setDiscrepancies([])
    setDiscrepancyType('ok')
    setPendingBookings(modifiedBookings)
    setShowConfirmDialog(true)
  }, [form, currentBookings, getDayEditStatus, recordedHoursByDate, performSubmit])

  // Handle dialog cancel
  const handleDialogCancel = useCallback(() => {
    setShowConfirmDialog(false)
    setPendingBookings([])
    setDiscrepancies([])
  }, [])

  // Handle dialog confirm
  const handleDialogConfirm = useCallback(() => {
    performSubmit(pendingBookings)
  }, [pendingBookings, performSubmit])

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
      <Alert variant="destructive" data-testid={dataTestId}>
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
    )
  }

  // Show empty state only if no allocations AND no historical projects with booked hours
  if (!viewOnly && allocations.length === 0 && currentBookings.length === 0) {
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

  // Determine submit button text based on state
  const getSubmitButtonText = () => {
    if (isSubmitting) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submitting', 'Submitting...')
    }
    if (isLoadingWeekData) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.loading', 'Loading...')
    }
    if (hasSubmittedHours && !hasUnsubmittedHours) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submitted', 'Submitted')
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submit_hours', 'Submit Hours')
  }

  const readOnlySummaryCards = viewOnly && !isLoadingYearData && yearlyProjectHours.projects.length > 0 && (
    <div
      className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-3 gba:mb-2"
      data-testid={`${dataTestId}-readonly-summary`}
    >
      <Card>
        <CardContent className="gba:p-4 gba:gap-0">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.total_recorded_hours',
              'Total Recorded Hours'
            )}
          </div>
          <div className="gba:text-2xl gba:font-bold">{hoursToTimeString(readOnlySummary.recordedHours)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-4 gba:gap-0">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.project_recorded_time',
              'Project Recorded time'
            )}
          </div>
          <div className="gba:text-2xl gba:font-bold">{hoursToTimeString(readOnlySummary.projectHours)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-4 gba:gap-0">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.unallocated_time',
              'Unallocated time'
            )}
          </div>
          <div className="gba:text-2xl gba:font-bold">{hoursToTimeString(readOnlySummary.unallocatedHours)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-4 gba:gap-0">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.active_projects',
              'Active Projects'
            )}
          </div>
          <div className="gba:text-2xl gba:font-bold">{readOnlySummary.activeProjects}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-4 gba:gap-0">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.recorded_days', 'Recorded Days')}
          </div>
          <div className="gba:text-2xl gba:font-bold">{readOnlySummary.recordedDays}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="gba:p-4 gba:gap-0">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.project_days', 'Project Days')}
          </div>
          <div className="gba:text-2xl gba:font-bold">{readOnlySummary.projectDays}</div>
        </CardContent>
      </Card>
    </div>
  )

  const formatYearCell = (hours: number, showZero = false): string => {
    if (hours <= 0 && !showZero) return '—'
    return hoursToTimeString(hours)
  }

  const yearProjectTable = (() => {
    if (isLoadingYearData) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )
    }

    if (yearlyProjectHours.projects.length === 0) {
      return (
        <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:py-12 gba:text-center">
          <div className="gba:text-muted-foreground gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.no_projects_for_year',
              'No project time for this year'
            )}
          </div>
          <div className="gba:text-muted-foreground gba:text-sm">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.smart_booking.no_projects_for_year_description',
              'There are no project hours recorded for the selected year.'
            )}
          </div>
        </div>
      )
    }

    const yearTotal = yearlyProjectHours.projects.reduce(
      (sum, project) => sum + getYearProjectTotal(project.projectId),
      0
    )

    return (
      <div className="gba:overflow-x-auto" data-testid={`${dataTestId}-year-table`}>
        <Table className="gba:[&_th]:text-center gba:[&_td]:text-center">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:sticky gba:left-0 gba:z-20 gba:min-w-32 gba:bg-muted gba:text-left">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.month', 'Month')}
              </TableHead>
              {yearlyProjectHours.projects.map(project => (
                <TableHead key={project.projectId} className="gba:min-w-36">
                  {project.projectName}
                </TableHead>
              ))}
              <TableHead className="gba:sticky gba:right-0 gba:z-20 gba:min-w-24 gba:bg-muted">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.total', 'Total')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthIndexes.map(monthIndex => {
              const monthTotal = getYearMonthTotal(monthIndex)

              return (
                <TableRow key={monthIndex}>
                  <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:bg-background gba:text-left gba:font-medium">
                    {getLocalizedDayjs(new Date(currentYear, monthIndex, 1)).format('MMMM')}
                  </TableCell>
                  {yearlyProjectHours.projects.map(project => (
                    <TableCell key={project.projectId}>
                      {formatYearCell(getYearProjectMonthHours(project.projectId, monthIndex))}
                    </TableCell>
                  ))}
                  <TableCell className="gba:sticky gba:right-0 gba:z-10 gba:bg-background gba:font-semibold">
                    {formatYearCell(monthTotal, true)}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="gba:bg-muted">
              <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:bg-muted gba:text-left gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.total', 'Total')}
              </TableCell>
              {yearlyProjectHours.projects.map(project => (
                <TableCell key={project.projectId} className="gba:font-semibold">
                  {formatYearCell(getYearProjectTotal(project.projectId), true)}
                </TableCell>
              ))}
              <TableCell className="gba:sticky gba:right-0 gba:z-10 gba:bg-muted gba:font-semibold">
                {formatYearCell(yearTotal, true)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  })()

  return (
    <div data-testid={dataTestId} className="gba:overflow-hidden gba:flex gba:flex-col gba:gap-4">
      {!viewOnly && (
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:text-lg gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.time_booking', 'Time Booking')}
          </div>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingWeekData || !hasUnsubmittedHours}
            data-testid={`${dataTestId}-submit-button`}
          >
            {getSubmitButtonText()}
          </Button>
        </div>
      )}
      {readOnlySummaryCards}
      {/* Week Navigation */}
      {!viewOnly && (
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
              <ArrowLeftIcon className="gba:h-4 gba:w-4" />
            </Button>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="gba:justify-start gba:text-left gba:font-normal gba:w-[300px]"
                  data-testid={`${dataTestId}-week-selector`}
                >
                  <CalendarIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  <span>
                    {dayjs(weekStart).date()} - {dayjs(weekStart).add(6, 'day').format('D MMM YYYY')} (CW
                    {dayjs(weekStart).isoWeek().toString().padStart(2, '0')})
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
      )}

      {/* Time Booking Table */}
      {viewOnly && yearProjectTable}
      {!viewOnly &&
        (isLoadingWeekData || formInitializedForWeek !== weekKey ? (
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
          <TableForm
            form={form}
            dataTestId={`${dataTestId}-table-form`}
            columns={
              <>
                <TableHead className="gba:min-w-[200px]"></TableHead>
                <TableHead className="gba:text-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.allocation', 'Allocation')}
                </TableHead>
                {weekDays.map(day => {
                  const nonWorking = isNonWorkingDay(day)
                  return (
                    <TableHead key={dayjs(day).format('YYYY-MM-DD')} className="gba:text-center gba:min-w-[100px]">
                      <span
                        className={cn('gba:text-sm gba:font-normal', { 'gba:text-muted-foreground/70': nonWorking })}
                      >
                        {getLocalizedDayjs(day).format('ddd')}
                      </span>
                    </TableHead>
                  )
                })}
                <TableHead className="gba:text-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.total', 'Total')}
                </TableHead>
              </>
            }
          >
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
                const nonWorking = isNonWorkingDay(day)
                return (
                  <TableCell
                    key={dayjs(day).format('YYYY-MM-DD')}
                    className={cn('gba:text-center gba:font-semibold', { 'gba:text-muted-foreground/70': nonWorking })}
                  >
                    {hoursToTimeString(recordedHours)}
                  </TableCell>
                )
              })}
              <TableCell className="gba:text-center gba:font-semibold">
                {hoursToTimeString(weekDays.reduce((sum, day) => sum + getRecordedHoursForDay(day), 0))}
              </TableCell>
            </TableRow>

            {/* Team/Project rows */}
            {currentBookings.map(booking => {
              const isHistoricalBooking = booking.teamId.startsWith('historical-')

              return (
                <TableRow key={booking.teamId} className={isHistoricalBooking ? 'gba:bg-muted/30' : ''}>
                  <TableCell className="gba:font-medium">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {booking.projectName}
                      {isHistoricalBooking && (
                        <span className="gba:text-xs gba:bg-muted gba:text-muted-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                          Removed
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-center">
                    {isHistoricalBooking ? '—' : `${booking.percentage}%`}
                  </TableCell>
                  {booking.days.map((day, dayIndex) => {
                    const fieldKey = `${booking.teamId}-${dayIndex}`
                    const { isSubmitted, isBeforeAssignment, isNotCurrentMonth, isEditable } = getDayEditStatus(
                      day,
                      booking
                    )

                    return (
                      <EditableCell
                        key={day.date}
                        isEditing={viewOnly ? false : isEditable}
                        className="gba:text-center"
                        dataTestId={`${dataTestId}-cell-${booking.teamId}-${dayIndex}`}
                      >
                        {editing => {
                          if (isBeforeAssignment) {
                            // Show dash for days before assignment
                            return (
                              <div className="gba:flex gba:justify-center">
                                <span className="gba:text-muted-foreground gba:w-20 gba:text-center">—</span>
                              </div>
                            )
                          }

                          if (viewOnly) {
                            return (
                              <div className="gba:flex gba:justify-center">
                                <span className="gba:text-muted-foreground gba:w-20 gba:text-center">
                                  {day.hours > 0 ? hoursToTimeString(day.hours) : '—'}
                                </span>
                              </div>
                            )
                          }

                          if (isHistoricalBooking || isSubmitted) {
                            // Historical or submitted: show value as HH:MM text
                            return (
                              <div className="gba:flex gba:justify-center">
                                <span className="gba:text-muted-foreground gba:w-20 gba:text-center">
                                  {day.hours > 0 ? hoursToTimeString(day.hours) : '—'}
                                </span>
                              </div>
                            )
                          }

                          if (isNotCurrentMonth) {
                            return (
                              <div className="gba:flex gba:justify-center">
                                <div className="gba:w-24">
                                  <DurationInput value="00:00" onChange={() => {}} disabled />
                                </div>
                              </div>
                            )
                          }

                          if (editing) {
                            return (
                              <FormField
                                control={form.control}
                                name={fieldKey}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <div className="gba:flex gba:justify-center">
                                        <div className="gba:w-24">
                                          <DurationInput
                                            value={field.value || '00:00'}
                                            onChange={next => field.onChange(clampDurationHHMM(next))}
                                            onBlur={field.onBlur}
                                            dataTestId={`${dataTestId}-hours-${booking.teamId}-${dayIndex}`}
                                          />
                                        </div>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )
                          }

                          // Fallback: show value as text
                          return (
                            <div className="gba:flex gba:justify-center">
                              <span className="gba:text-muted-foreground gba:w-20 gba:text-center">
                                {day.hours > 0 ? hoursToTimeString(day.hours) : '—'}
                              </span>
                            </div>
                          )
                        }}
                      </EditableCell>
                    )
                  })}
                  <TableCell className="gba:text-center gba:font-semibold">
                    {hoursToTimeString(getTotalHoursForTeam(booking))}
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Daily Total row */}
            <TableRow className="gba:bg-muted">
              <TableCell colSpan={2} className="gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.daily_total', 'Daily Total')}
              </TableCell>
              {weekDays.map((day, dayIndex) => {
                const total = getTotalHoursForDay(dayIndex)
                const nonWorking = isNonWorkingDay(day)
                return (
                  <TableCell
                    key={dayjs(day).format('YYYY-MM-DD')}
                    className={cn('gba:text-center gba:font-semibold', {
                      'gba:bg-muted gba:text-muted-foreground/70': nonWorking
                    })}
                  >
                    {hoursToTimeString(total)}
                  </TableCell>
                )
              })}
              <TableCell className="gba:text-center gba:font-semibold">
                {hoursToTimeString(currentBookings.reduce((sum, booking) => sum + getTotalHoursForTeam(booking), 0))}
              </TableCell>
            </TableRow>
          </TableForm>
        ))}
      <Toaster />

      {/* Confirmation dialog for hours discrepancies */}
      {!viewOnly && (
        <SubmitConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          discrepancies={discrepancies}
          discrepancyType={discrepancyType}
          onCancel={handleDialogCancel}
          onConfirm={handleDialogConfirm}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}

export default SmartBooking
