import React, { useMemo } from 'react'
import { useLocale, useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import type { CalendarEvent, DateRange } from '../types'
import { getDaysInDateRange } from '../types'
import { CalendarEventItem } from './CalendarEventItem'
import translations from '../../_i18n'

dayjs.extend(localizedFormat)

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface CalendarListViewProps {
  dateRange: DateRange
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  activeConversationCalls?: Map<string, any>
  onJoinCall?: (event: CalendarEvent) => void
}

export const CalendarListView: React.FC<CalendarListViewProps> = ({
  dateRange,
  events,
  onEventClick,
  activeConversationCalls,
  onJoinCall
}) => {
  const { locale } = useLocale()
  const { t } = useTranslation(translations)
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'

  const days = useMemo(() => getDaysInDateRange(dateRange), [dateRange])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const day of days) {
      map.set(getLocalDateKey(day), [])
    }
    const dayStart = (d: Date) => {
      const x = new Date(d)
      x.setHours(0, 0, 0, 0)
      return x.getTime()
    }
    const dayEnd = (d: Date) => {
      const x = new Date(d)
      x.setHours(23, 59, 59, 999)
      return x.getTime()
    }
    for (const event of events) {
      const eventStart = event.start instanceof Date ? event.start : new Date(event.start)
      const eventEnd = event.end instanceof Date ? event.end : new Date(event.end)
      const es = eventStart.getTime()
      const ee = eventEnd.getTime()
      for (const day of days) {
        const ds = dayStart(day)
        const de = dayEnd(day)
        if (es <= de && ee >= ds) {
          const key = getLocalDateKey(day)
          const list = map.get(key) ?? []
          list.push(event)
          map.set(key, list)
        }
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime())
    }
    return map
  }, [days, events])

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:overflow-y-auto gba:bg-background"
      data-testid="calendar-list-view"
    >
      {days.map(day => {
        const dayKey = getLocalDateKey(day)
        const dayEvents = eventsByDay.get(dayKey) ?? []
        const header =
          baseLocale === 'de' || baseLocale === 'ro'
            ? dayjs(day).locale(baseLocale).format('dddd, DD. MMMM YYYY')
            : dayjs(day).locale(baseLocale).format('dddd, MMMM D, YYYY')

        return (
          <section key={dayKey} className="gba:border-b gba:border-border/50 gba:last:border-b-0">
            <div className="gba:sticky gba:top-0 gba:z-10 gba:bg-muted/40 gba:px-3 gba:py-2 gba:text-xs gba:font-semibold gba:text-foreground gba:backdrop-blur-sm">
              {header}
            </div>
            {dayEvents.length === 0 ? (
              <div className="gba:px-3 gba:py-4 gba:text-xs gba:text-muted-foreground">
                {t('calendar-list-no-events')}
              </div>
            ) : (
              <ul className="gba:flex gba:flex-col gba:gap-1 gba:px-2 gba:pb-3 gba:pt-1">
                {dayEvents.map(event => (
                  <li
                    key={`${getLocalDateKey(day)}-${event.id}`}
                    className="gba:rounded-md gba:border gba:border-border/50 gba:bg-card"
                    data-testid={`calendar-list-event-${getLocalDateKey(day)}-${event.id}`}
                  >
                    <CalendarEventItem
                      event={event}
                      compact={false}
                      onClick={() => onEventClick(event)}
                      t={t}
                      activeConversationCalls={activeConversationCalls}
                      onJoinCall={onJoinCall}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
