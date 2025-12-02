import React, { useMemo } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { CalendarEvent, DateRange } from '../types'

interface MonthViewProps {
  dateRange: DateRange
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (date: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_EVENTS_VISIBLE = 2 // Reduced for better mobile fit

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

// Check if two dates are the same day in local time
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

const getCalendarDays = (currentDate: Date, events: CalendarEvent[]): CalendarDay[] => {
  const days: CalendarDay[] = []
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of the month
  const firstDay = new Date(year, month, 1)
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)

  // Start from the Sunday of the week containing the first day
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  // End on the Saturday of the week containing the last day
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const current = new Date(startDate)
  while (current <= endDate) {
    const dayDate = new Date(current)
    const dayEvents = events.filter(event => {
      // Ensure we have a Date object in local time
      const eventDate = event.start instanceof Date ? event.start : new Date(event.start)
      return isSameDay(eventDate, dayDate)
    })

    days.push({
      date: dayDate,
      isCurrentMonth: current.getMonth() === month,
      isToday: isSameDay(current, today),
      events: dayEvents.sort((a, b) => {
        const aStart = a.start instanceof Date ? a.start : new Date(a.start)
        const bStart = b.start instanceof Date ? b.start : new Date(b.start)
        return aStart.getTime() - bStart.getTime()
      })
    })

    current.setDate(current.getDate() + 1)
  }

  return days
}

const formatEventTime = (date: Date | string): string => {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, onEventClick, onDayClick }) => {
  const calendarDays = useMemo(() => getCalendarDays(currentDate, events), [currentDate, events])

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: CalendarDay[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid="calendar-month-view">
      {/* Weekday headers */}
      <div className="gba:grid gba:grid-cols-7 gba:border-b gba:border-border/50 gba:bg-muted/30">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className="gba:py-1 gba:sm:py-2 gba:text-center gba:text-[10px] gba:sm:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase"
          >
            <span className="gba:hidden gba:sm:inline">{day}</span>
            <span className="gba:sm:hidden">{WEEKDAYS_SHORT[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="gba:grid gba:grid-cols-7 gba:border-b gba:border-border/30 gba:last:border-b-0"
          >
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  'gba:min-h-[60px] gba:sm:min-h-[80px] gba:border-r gba:border-border/30 gba:last:border-r-0 gba:p-0.5 gba:sm:p-1',
                  !day.isCurrentMonth && 'gba:bg-muted/20',
                  day.isToday && 'gba:bg-primary/5'
                )}
              >
                {/* Day number */}
                <button
                  onClick={() => onDayClick(day.date)}
                  className={cn(
                    'gba:w-5 gba:h-5 gba:sm:w-7 gba:sm:h-7 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:text-xs gba:sm:text-sm gba:mb-0.5 gba:sm:mb-1 gba:transition-colors',
                    day.isToday
                      ? 'gba:bg-primary gba:text-primary-foreground gba:font-bold'
                      : day.isCurrentMonth
                        ? 'gba:text-foreground gba:hover:bg-muted'
                        : 'gba:text-muted-foreground gba:hover:bg-muted/50'
                  )}
                >
                  {day.date.getDate()}
                </button>

                {/* Events */}
                <div className="gba:space-y-0.5">
                  {day.events.slice(0, MAX_EVENTS_VISIBLE).map(event => (
                    <button
                      key={event.id}
                      onClick={e => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                      className={cn(
                        'gba:w-full gba:text-left gba:px-1 gba:sm:px-1.5 gba:py-0.5 gba:rounded gba:text-[8px] gba:sm:text-[10px] gba:font-medium gba:truncate gba:transition-opacity gba:hover:opacity-80',
                        event.status === 'cancelled' && 'gba:line-through gba:opacity-50'
                      )}
                      style={{
                        backgroundColor: event.color,
                        // eslint-disable-next-line newwork-local/no-hardcoded-colors -- contrast color for dynamic background
                        color: 'white'
                      }}
                      data-testid={`calendar-event-${event.id}`}
                    >
                      <span className="gba:hidden gba:sm:inline">
                        {!event.allDay && (
                          <span className="gba:opacity-75 gba:mr-1">{formatEventTime(event.start)}</span>
                        )}
                        {event.title}
                      </span>
                      <span className="gba:sm:hidden">{event.title}</span>
                    </button>
                  ))}

                  {/* More events indicator */}
                  {day.events.length > MAX_EVENTS_VISIBLE && (
                    <button
                      onClick={() => onDayClick(day.date)}
                      className="gba:w-full gba:text-left gba:px-1 gba:py-0.5 gba:text-[8px] gba:sm:text-[10px] gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
                    >
                      +{day.events.length - MAX_EVENTS_VISIBLE}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
