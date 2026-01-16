import React, { useMemo, useRef, useEffect, useState } from 'react'
import { cn, useLocale } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import type { CalendarEvent } from '../types'
import { CalendarEventItem } from './CalendarEventItem'
import { useChatTranslation } from '../../contexts/TranslationContext'

dayjs.extend(localizedFormat)

interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick?: (date: Date, hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 72 // pixels per hour (slightly larger for day view)

const formatHour = (hour: number, locale: string): string => {
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  // Create a date at the specified hour to format it
  const date = dayjs().hour(hour).minute(0).second(0)
  return date.locale(baseLocale).format('LT')
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
  // Ensure we have proper Date objects in local time
  const eventStart = event.start instanceof Date ? event.start : new Date(event.start)
  const eventEnd = event.end instanceof Date ? event.end : new Date(event.end)
  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  if (eventStart > dayEnd || eventEnd < dayStart) {
    return null
  }

  const effectiveStart = eventStart < dayStart ? dayStart : eventStart
  const effectiveEnd = eventEnd > dayEnd ? dayEnd : eventEnd

  const startHour = effectiveStart.getHours() + effectiveStart.getMinutes() / 60
  const endHour = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60

  const top = startHour * HOUR_HEIGHT
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 24)

  return { top, height }
}

export const DayView: React.FC<DayViewProps> = ({ currentDate, events, onEventClick, onTimeSlotClick }) => {
  const t = useChatTranslation()
  const { locale } = useLocale()
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const isTodayDate = isToday(currentDate)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  // Filter events for current day using local time
  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = event.start instanceof Date ? event.start : new Date(event.start)
      return isSameDay(eventDate, currentDate)
    })
  }, [events, currentDate])

  // All-day events
  const allDayEvents = dayEvents.filter(e => e.allDay)
  const timedEvents = dayEvents.filter(e => !e.allDay)

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

  // Scroll to current time on mount (or a reasonable morning time if early)
  useEffect(() => {
    if (scrollContainerRef.current && !hasScrolledRef.current) {
      const now = new Date()
      // Scroll to current hour minus 1 (so current time is visible, not at top edge)
      const scrollToHour = Math.max(0, now.getHours() - 1)
      const scrollPosition = scrollToHour * HOUR_HEIGHT

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollPosition,
          behavior: 'auto' // instant scroll on initial load
        })
      })
      hasScrolledRef.current = true
    }
  }, [])

  // Reset scroll flag when date changes to allow re-scrolling
  useEffect(() => {
    hasScrolledRef.current = false
  }, [currentDate])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid="calendar-day-view">
      {/* Day header */}
      <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-muted/30">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div
            className={cn(
              'gba:flex gba:flex-col gba:items-center gba:justify-center gba:w-14 gba:h-14 gba:rounded-lg',
              isTodayDate ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted'
            )}
          >
            <span className="gba:text-xs gba:uppercase gba:font-medium">
              {dayjs(currentDate).locale(baseLocale).format('ddd')}
            </span>
            <span className="gba:text-2xl gba:font-bold">{currentDate.getDate()}</span>
          </div>
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
              {dayjs(currentDate).locale(baseLocale).format('dddd')}
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground">
              {dayEvents.length === 0
                ? t('calendar-noEventsScheduled')
                : t('calendar-eventsScheduled', { count: dayEvents.length })}
            </p>
          </div>
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="gba:px-4 gba:py-2 gba:border-b gba:border-border/50 gba:bg-muted/20">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">All Day</div>
          <div className="gba:space-y-1">
            {allDayEvents.map(event => (
              <CalendarEventItem key={event.id} event={event} compact onClick={() => onEventClick(event)} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollContainerRef} className="gba:flex gba:flex-1 gba:overflow-y-auto">
        {/* Time labels */}
        <div className="gba:w-20 gba:flex-shrink-0 gba:border-r gba:border-border/50">
          {HOURS.map(hour => (
            <div
              key={hour}
              className="gba:text-center gba:text-xs gba:text-muted-foreground gba:flex gba:items-start gba:justify-center"
              style={{ height: HOUR_HEIGHT }}
            >
              {hour > 0 && <span className="gba:pt-0.5">{formatHour(hour, locale)}</span>}
            </div>
          ))}
        </div>

        {/* Events area */}
        <div className={cn('gba:flex-1 gba:relative', isTodayDate && 'gba:bg-primary/5')}>
          {/* Hour grid lines */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="gba:border-b gba:border-border/30 gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
              style={{ height: HOUR_HEIGHT }}
              onClick={() => {
                if (onTimeSlotClick) {
                  const slotDate = new Date(currentDate)
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
                <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-destructive" />
                <div className="gba:flex-1 gba:h-[2px] gba:bg-destructive" />
              </div>
            </div>
          )}

          {/* Events */}
          {timedEvents.map(event => {
            const dayStart = new Date(currentDate)
            dayStart.setHours(0, 0, 0, 0)
            const position = getEventPosition(event, dayStart)

            if (!position) return null

            return (
              <div
                key={event.id}
                className="gba:absolute gba:left-2 gba:right-2 gba:z-10"
                style={{
                  top: position.top,
                  height: position.height
                }}
              >
                <CalendarEventItem
                  event={event}
                  compact={position.height < 80}
                  height={position.height}
                  onClick={() => onEventClick(event)}
                  t={t}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
