import React, { useMemo } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { CalendarEvent, DateRange } from '../types'
import { CalendarEventItem } from './CalendarEventItem'

interface WeekViewProps {
  dateRange: DateRange
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick?: (date: Date, hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 60 // pixels per hour

const formatHour = (hour: number): string => {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

const getDaysInWeek = (startDate: Date): Date[] => {
  const days: Date[] = []
  const current = new Date(startDate)
  for (let i = 0; i < 7; i++) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

const getEventPosition = (event: CalendarEvent, dayStart: Date): { top: number; height: number } | null => {
  const eventStart = new Date(event.start)
  const eventEnd = new Date(event.end)
  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  // Check if event is on this day
  if (eventStart > dayEnd || eventEnd < dayStart) {
    return null
  }

  // Calculate position
  const effectiveStart = eventStart < dayStart ? dayStart : eventStart
  const effectiveEnd = eventEnd > dayEnd ? dayEnd : eventEnd

  const startHour = effectiveStart.getHours() + effectiveStart.getMinutes() / 60
  const endHour = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60

  const top = startHour * HOUR_HEIGHT
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 20) // Minimum height of 20px

  return { top, height }
}

export const WeekView: React.FC<WeekViewProps> = ({ dateRange, events, onEventClick, onTimeSlotClick }) => {
  const days = useMemo(() => getDaysInWeek(dateRange.start), [dateRange.start])

  // Group events by day
  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, CalendarEvent[]>()

    days.forEach(day => {
      const dayKey = day.toISOString().split('T')[0]
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start)
        return (
          eventDate.getDate() === day.getDate() &&
          eventDate.getMonth() === day.getMonth() &&
          eventDate.getFullYear() === day.getFullYear()
        )
      })
      byDay.set(dayKey, dayEvents)
    })

    return byDay
  }, [days, events])

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const now = new Date()
    return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid="calendar-week-view">
      {/* Day headers */}
      <div className="gba:flex gba:border-b gba:border-border/50 gba:bg-muted/30 gba:sticky gba:top-0 gba:z-10">
        {/* Time gutter */}
        <div className="gba:w-16 gba:flex-shrink-0 gba:border-r gba:border-border/50" />

        {/* Day columns headers */}
        {days.map(day => {
          const dayKey = day.toISOString().split('T')[0]
          const dayEvents = eventsByDay.get(dayKey) || []
          const isTodayDate = isToday(day)

          return (
            <div
              key={dayKey}
              className={cn(
                'gba:flex-1 gba:text-center gba:py-2 gba:border-r gba:border-border/50 gba:last:border-r-0',
                isTodayDate && 'gba:bg-primary/5'
              )}
            >
              <div className="gba:text-xs gba:text-muted-foreground gba:uppercase">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div
                className={cn(
                  'gba:text-lg gba:font-semibold',
                  isTodayDate
                    ? 'gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:mx-auto'
                    : 'gba:text-foreground'
                )}
              >
                {day.getDate()}
              </div>
              {dayEvents.length > 0 && (
                <div className="gba:text-[10px] gba:text-muted-foreground">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="gba:flex gba:flex-1 gba:overflow-y-auto">
        {/* Time labels */}
        <div className="gba:w-16 gba:flex-shrink-0 gba:border-r gba:border-border/50">
          {HOURS.map(hour => (
            <div
              key={hour}
              className="gba:h-[60px] gba:pr-2 gba:text-right gba:text-xs gba:text-muted-foreground gba:-mt-2"
            >
              {hour > 0 && formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => {
          const dayKey = day.toISOString().split('T')[0]
          const dayEvents = eventsByDay.get(dayKey) || []
          const isTodayDate = isToday(day)

          return (
            <div
              key={dayKey}
              className={cn(
                'gba:flex-1 gba:relative gba:border-r gba:border-border/50 gba:last:border-r-0',
                isTodayDate && 'gba:bg-primary/5'
              )}
            >
              {/* Hour grid lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="gba:h-[60px] gba:border-b gba:border-border/30 gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
                  onClick={() => {
                    if (onTimeSlotClick) {
                      const slotDate = new Date(day)
                      slotDate.setHours(hour, 0, 0, 0)
                      onTimeSlotClick(slotDate, hour)
                    }
                  }}
                />
              ))}

              {/* Current time indicator */}
              {isTodayDate && (
                <div
                  className="gba:absolute gba:left-0 gba:right-0 gba:z-20 gba:pointer-events-none"
                  style={{ top: currentTimePosition }}
                >
                  <div className="gba:flex gba:items-center">
                    <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive" />
                    <div className="gba:flex-1 gba:h-[2px] gba:bg-destructive" />
                  </div>
                </div>
              )}

              {/* Events */}
              {dayEvents.map(event => {
                const dayStart = new Date(day)
                dayStart.setHours(0, 0, 0, 0)
                const position = getEventPosition(event, dayStart)

                if (!position || event.allDay) return null

                return (
                  <div
                    key={event.id}
                    className="gba:absolute gba:left-1 gba:right-1 gba:z-10 gba:overflow-hidden"
                    style={{
                      top: position.top,
                      height: position.height
                    }}
                  >
                    <CalendarEventItem
                      event={event}
                      compact={position.height < 50}
                      onClick={() => onEventClick(event)}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
