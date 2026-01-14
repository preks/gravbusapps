import React, { useMemo, useRef, useEffect, useState } from 'react'
import { cn, useLocale, useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import type { CalendarEvent, DateRange } from '../types'
import { CalendarEventItem } from './CalendarEventItem'
import translations from '../../_i18n'

dayjs.extend(localizedFormat)

interface WeekViewProps {
  dateRange: DateRange
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick?: (date: Date, hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 48 // pixels per hour (reduced for better mobile fit)

const formatHour = (hour: number, locale: string): string => {
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  // Create a date at the specified hour to format it
  const date = dayjs().hour(hour).minute(0).second(0)
  return date.locale(baseLocale).format('LT')
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

// Get date key in local timezone (YYYY-MM-DD format)
const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

const getEventPosition = (event: CalendarEvent, dayStart: Date): { top: number; height: number } | null => {
  // Ensure we have proper Date objects
  const eventStart = event.start instanceof Date ? event.start : new Date(event.start)
  const eventEnd = event.end instanceof Date ? event.end : new Date(event.end)

  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  // Check if event is on this day using local time comparison
  if (eventStart > dayEnd || eventEnd < dayStart) {
    return null
  }

  // Calculate position using local time
  const effectiveStart = eventStart < dayStart ? dayStart : eventStart
  const effectiveEnd = eventEnd > dayEnd ? dayEnd : eventEnd

  const startHour = effectiveStart.getHours() + effectiveStart.getMinutes() / 60
  const endHour = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60

  const top = startHour * HOUR_HEIGHT
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 16) // Minimum height of 16px

  return { top, height }
}

export const WeekView: React.FC<WeekViewProps> = ({ dateRange, events, onEventClick, onTimeSlotClick }) => {
  const { locale } = useLocale()
  const { t } = useTranslation(translations)
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const days = useMemo(() => getDaysInWeek(dateRange.start), [dateRange.start])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current && !hasScrolledRef.current) {
      const now = new Date()
      // Scroll to current hour minus 1 (so current time is visible, not at top edge)
      const scrollToHour = Math.max(0, now.getHours() - 1)
      const scrollPosition = scrollToHour * HOUR_HEIGHT

      requestAnimationFrame(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        })
      })
      hasScrolledRef.current = true
    }
  }, [])

  // Reset scroll flag when date range changes
  useEffect(() => {
    hasScrolledRef.current = false
  }, [dateRange])

  // Group events by day using local time
  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, CalendarEvent[]>()

    days.forEach(day => {
      const dayKey = getLocalDateKey(day)
      const dayEvents = events.filter(event => {
        // Ensure we have a Date object
        const eventDate = event.start instanceof Date ? event.start : new Date(event.start)
        return isSameDay(eventDate, day)
      })
      byDay.set(dayKey, dayEvents)
    })

    return byDay
  }, [days, events])

  // Current time indicator position
  // Current time indicator position - updates every minute
  const [currentTimePosition, setCurrentTimePosition] = useState(() => {
    const now = new Date()
    return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
  })

  // Update current time indicator every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date()
      setCurrentTimePosition((now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT)
    }

    // Update immediately
    updateCurrentTime()

    // Update every minute
    const interval = setInterval(updateCurrentTime, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid="calendar-week-view">
      {/* Day headers */}
      <div className="gba:flex gba:border-b gba:border-border/50 gba:bg-muted/30 gba:sticky gba:top-0 gba:z-10">
        {/* Time gutter */}
        <div className="gba:w-10 gba:sm:w-14 gba:flex-shrink-0 gba:border-r gba:border-border/50" />

        {/* Day columns headers */}
        {days.map(day => {
          const dayKey = getLocalDateKey(day)
          const dayEvents = eventsByDay.get(dayKey) || []
          const isTodayDate = isToday(day)

          return (
            <div
              key={dayKey}
              className={cn(
                'gba:flex-1 gba:min-w-0 gba:text-center gba:py-1 gba:sm:py-2 gba:border-r gba:border-border/50 gba:last:border-r-0',
                isTodayDate && 'gba:bg-primary/5'
              )}
            >
              <div className="gba:text-[10px] gba:sm:text-xs gba:text-muted-foreground gba:uppercase">
                {dayjs(day).locale(baseLocale).format('dd')}
              </div>
              <div
                className={cn(
                  'gba:text-sm gba:sm:text-lg gba:font-semibold',
                  isTodayDate
                    ? 'gba:w-6 gba:h-6 gba:sm:w-8 gba:sm:h-8 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:mx-auto gba:text-xs gba:sm:text-base'
                    : 'gba:text-foreground'
                )}
              >
                {day.getDate()}
              </div>
              {dayEvents.length > 0 && (
                <div className="gba:hidden gba:sm:block gba:text-[10px] gba:text-muted-foreground">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollContainerRef} className="gba:flex gba:flex-1 gba:overflow-y-auto">
        {/* Time labels */}
        <div className="gba:w-10 gba:sm:w-14 gba:flex-shrink-0 gba:border-r gba:border-border/50">
          {HOURS.map(hour => (
            <div
              key={hour}
              className="gba:text-center gba:text-[10px] gba:sm:text-xs gba:text-muted-foreground gba:flex gba:items-start gba:justify-center"
              style={{ height: HOUR_HEIGHT }}
            >
              {hour > 0 && <span className="gba:pt-0.5">{formatHour(hour, locale)}</span>}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => {
          const dayKey = getLocalDateKey(day)
          const dayEvents = eventsByDay.get(dayKey) || []
          const isTodayDate = isToday(day)

          return (
            <div
              key={dayKey}
              className={cn(
                'gba:flex-1 gba:min-w-0 gba:relative gba:border-r gba:border-border/50 gba:last:border-r-0',
                isTodayDate && 'gba:bg-primary/5'
              )}
            >
              {/* Hour grid lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="gba:border-b gba:border-border/30 gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
                  style={{ height: HOUR_HEIGHT }}
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
                    <div className="gba:w-1.5 gba:h-1.5 gba:sm:w-2 gba:sm:h-2 gba:rounded-full gba:bg-destructive" />
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
                    className="gba:absolute gba:left-0.5 gba:right-0.5 gba:sm:left-1 gba:sm:right-1 gba:z-10"
                    style={{
                      top: position.top,
                      height: position.height
                    }}
                  >
                    <CalendarEventItem
                      event={event}
                      compact={true}
                      height={position.height}
                      onClick={() => onEventClick(event)}
                      t={t}
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
