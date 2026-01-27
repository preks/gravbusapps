import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner, Button } from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import type { JobInterview } from '@/common/data/recruiting/types/jobInterviewTypes'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import weekOfYear from 'dayjs/plugin/weekOfYear'

dayjs.extend(weekday)
dayjs.extend(weekOfYear)

export interface JobInterviewCalendarProps {
  interviews: JobInterview[]
  loading: boolean
  error: Error | null
  onInterviewClick?: (interview: JobInterview) => void
  monthOffset?: number
  onMonthChange?: (monthOffset: number) => void
}

interface CalendarDay {
  date: dayjs.Dayjs
  isToday: boolean
  isCurrentMonth: boolean
  interviews: JobInterview[]
}

// Helper component to render a single interview button
const InterviewButton: React.FC<{
  interview: JobInterview
  onInterviewClick?: (interview: JobInterview) => void
  getCandidateName: (interview: JobInterview) => string
  getTimeString: (scheduledAt: string) => string
}> = ({ interview, onInterviewClick, getCandidateName, getTimeString }) => {
  const timeString = interview.scheduledAt ? getTimeString(interview.scheduledAt) : ''
  const locationPart = interview.location ? ` - ${interview.location}` : ''
  const title = `${getCandidateName(interview)} - ${timeString}${locationPart}`

  return (
    <button
      onClick={() => onInterviewClick?.(interview)}
      className="gba:w-full gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-info/10 gba:hover:bg-info/20 gba:flex gba:items-center gba:gap-1 gba:text-left gba:transition-colors"
      title={title}
      data-testid={`interview-${interview.id}`}
    >
      <CalendarBlankIcon size={10} weight="fill" className="gba:text-info gba:shrink-0" />
      <span className="gba:truncate gba:text-[10px] gba:text-gray-700">{timeString}</span>
    </button>
  )
}

// Helper component to render a single calendar day
const CalendarDayCell: React.FC<{
  day: CalendarDay
  onInterviewClick?: (interview: JobInterview) => void
  getCandidateName: (interview: JobInterview) => string
  getTimeString: (scheduledAt: string) => string
}> = ({ day, onInterviewClick, getCandidateName, getTimeString }) => {
  const dayClassName = day.isCurrentMonth ? 'gba:bg-background' : 'gba:bg-muted/30'
  const todayRing = day.isToday ? 'gba:ring-2 gba:ring-primary' : ''

  let dateClassName = 'gba:font-medium gba:mb-1'
  if (day.isToday) {
    dateClassName += ' gba:text-primary'
  } else if (day.isCurrentMonth) {
    dateClassName += ' gba:text-foreground'
  } else {
    dateClassName += ' gba:text-muted-foreground'
  }

  return (
    <div
      className={`gba:min-h-[100px] gba:border gba:border-border gba:rounded gba:p-1.5 gba:text-xs ${dayClassName} ${todayRing}`}
      data-testid={`calendar-day-${day.date.format('YYYY-MM-DD')}`}
    >
      <div className={dateClassName}>{day.date.format('D')}</div>
      <div className="gba:space-y-1">
        {day.interviews.map(interview => (
          <InterviewButton
            key={interview.id}
            interview={interview}
            onInterviewClick={onInterviewClick}
            getCandidateName={getCandidateName}
            getTimeString={getTimeString}
          />
        ))}
      </div>
    </div>
  )
}

// Helper component to render a week row
const CalendarWeek: React.FC<{
  week: CalendarDay[]
  onInterviewClick?: (interview: JobInterview) => void
  getCandidateName: (interview: JobInterview) => string
  getTimeString: (scheduledAt: string) => string
}> = ({ week, onInterviewClick, getCandidateName, getTimeString }) => {
  return (
    <div className="gba:grid gba:grid-cols-7 gba:gap-1">
      {week.map(day => (
        <CalendarDayCell
          key={day.date.format('YYYY-MM-DD')}
          day={day}
          onInterviewClick={onInterviewClick}
          getCandidateName={getCandidateName}
          getTimeString={getTimeString}
        />
      ))}
    </div>
  )
}

/**
 * Job Interview Calendar Component
 * Displays job interviews in a monthly calendar view
 */
export const JobInterviewCalendar: React.FC<JobInterviewCalendarProps> = ({
  interviews,
  loading,
  error,
  onInterviewClick,
  monthOffset: controlledMonthOffset,
  onMonthChange
}) => {
  const [internalMonthOffset, setInternalMonthOffset] = useState(0)
  const monthOffset = controlledMonthOffset ?? internalMonthOffset

  // Calculate current month
  const currentMonth = useMemo(() => dayjs().add(monthOffset, 'month'), [monthOffset])
  const monthStart = currentMonth.startOf('month')
  const monthEnd = currentMonth.endOf('month')

  // Generate calendar days for the month
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = []
    const startDate = monthStart.startOf('week') // Start from Sunday of the week containing month start
    const endDate = monthEnd.endOf('week') // End at Saturday of the week containing month end

    let currentDate = startDate
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dayInterviews = interviews.filter(interview => {
        if (!interview.scheduledAt) return false
        const interviewDate = dayjs(interview.scheduledAt).format('YYYY-MM-DD')
        return interviewDate === currentDate.format('YYYY-MM-DD')
      })

      days.push({
        date: currentDate,
        isToday: currentDate.isSame(dayjs(), 'day'),
        isCurrentMonth: currentDate.isSame(currentMonth, 'month'),
        interviews: dayInterviews
      })

      currentDate = currentDate.add(1, 'day')
    }

    return days
  }, [monthStart, monthEnd, interviews, currentMonth])

  // Group days into weeks
  const weeks = useMemo(() => {
    const weeksArray: CalendarDay[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7))
    }
    return weeksArray
  }, [calendarDays])

  const handlePrevMonth = () => {
    const newOffset = monthOffset - 1
    if (controlledMonthOffset === undefined) {
      setInternalMonthOffset(newOffset)
    }
    onMonthChange?.(newOffset)
  }
  const handleNextMonth = () => {
    const newOffset = monthOffset + 1
    if (controlledMonthOffset === undefined) {
      setInternalMonthOffset(newOffset)
    }
    onMonthChange?.(newOffset)
  }
  const handleToday = () => {
    if (controlledMonthOffset === undefined) {
      setInternalMonthOffset(0)
    }
    onMonthChange?.(0)
  }

  // Get candidate name from interview
  const getCandidateName = (interview: JobInterview): string => {
    const candidate = interview.jobApplication?.jobCandidate
    if (candidate == null) return 'Unknown Candidate'
    const firstName = candidate.firstName ?? ''
    const lastName = candidate.lastName ?? ''
    return `${firstName} ${lastName}`.trim() || 'Unknown Candidate'
  }

  // Format time from scheduledAt
  const getTimeString = (scheduledAt: string): string => {
    return dayjs(scheduledAt).format('HH:mm')
  }

  if (error) {
    return (
      <Card data-testid="job-interview-calendar-error">
        <CardHeader>
          <CardTitle>Job Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-destructive gba:text-sm">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="job-interview-calendar">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Job Interviews</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToday}
              disabled={monthOffset === 0}
              data-testid="calendar-today-button"
            >
              Today
            </Button>
            <Button size="icon" variant="ghost" onClick={handlePrevMonth} data-testid="calendar-prev-month">
              <CaretLeftIcon size={16} />
            </Button>
            <span className="gba:text-sm gba:font-medium gba:min-w-[180px] gba:text-center">
              {currentMonth.format('MMMM YYYY')}
            </span>
            <Button size="icon" variant="ghost" onClick={handleNextMonth} data-testid="calendar-next-month">
              <CaretRightIcon size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="gba:space-y-2">
            {/* Weekday headers */}
            <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-center gba:py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar weeks */}
            {weeks.map(week => (
              <CalendarWeek
                key={week[0]?.date.format('YYYY-MM-DD') || 'week'}
                week={week}
                onInterviewClick={onInterviewClick}
                getCandidateName={getCandidateName}
                getTimeString={getTimeString}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
