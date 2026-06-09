import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, Button, useLocale } from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon, ArrowSquareOutIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import { useWeekEvents, type WeekEvent } from '../hooks/useWeekEvents'
import { addDays, weekDays, isSameDay, dayKey } from '../utils/weekDates'

const TEST_ID = 'digital-workplace-calendar'
const MAX_AGENDA_ITEMS = 4

interface WeekCalendarProps {
  context: BusinessAppContextProps
  className?: string
}

function openFullCalendar(): void {
  navigateTo(buildPlatformUrl(Navigation.PLATFORM_TEAM_CHAT, { view: 'calendar' }))
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({ context, className }) => {
  const { t } = useWorkplaceTranslation()
  const { locale } = useLocale()
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [selected, setSelected] = useState<Date>(() => new Date())

  const today = useMemo(() => new Date(), [])
  const days = useMemo(() => weekDays(anchor), [anchor])
  const rangeStart = days[0]
  const rangeEnd = useMemo(() => addDays(days[6], 1), [days])

  const { events } = useWeekEvents(context.accessToken, rangeStart, rangeEnd)

  const eventsByDay = useMemo(() => {
    const map = new Map<string, WeekEvent[]>()
    for (const event of events) {
      const key = dayKey(event.start)
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
    return map
  }, [events])

  const weekdayLabel = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale])
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(days[3]),
    [locale, days]
  )
  const timeLabel = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale])

  const selectedEvents = eventsByDay.get(dayKey(selected)) ?? []

  const goToPrevWeek = () => {
    const start = addDays(rangeStart, -7)
    setAnchor(start)
    setSelected(start)
  }
  const goToNextWeek = () => {
    const start = addDays(rangeStart, 7)
    setAnchor(start)
    setSelected(start)
  }
  const goToToday = () => {
    const now = new Date()
    setAnchor(now)
    setSelected(now)
  }

  return (
    <Card variant="surface" className={`gba:flex gba:shrink-0 gba:flex-col ${className ?? ''}`} data-testid={TEST_ID}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2 gba:space-y-0 gba:pb-3">
        <span className="gba:min-w-0 gba:truncate gba:text-base gba:font-semibold gba:text-foreground">
          {monthLabel}
        </span>
        <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-0.5">
          <Button variant="ghost" size="icon" onClick={goToPrevWeek} aria-label={t('calendar-prev-week')}>
            <CaretLeftIcon className="gba:size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday} data-testid={`${TEST_ID}-today`}>
            {t('calendar-today')}
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label={t('calendar-next-week')}>
            <CaretRightIcon className="gba:size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openFullCalendar}
            aria-label={t('calendar-open')}
            title={t('calendar-open')}
            data-testid={`${TEST_ID}-open`}
          >
            <ArrowSquareOutIcon className="gba:size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="gba:flex gba:flex-col gba:gap-3 gba:px-4 gba:pb-4">
        <div className="gba:grid gba:grid-cols-7 gba:gap-1">
          {days.map(day => {
            const dayEvents = eventsByDay.get(dayKey(day)) ?? []
            const isToday = isSameDay(day, today)
            const isSelected = isSameDay(day, selected)
            const numberClass = isToday
              ? 'gba:bg-primary gba:text-primary-foreground'
              : isSelected
                ? 'gba:bg-accent gba:text-foreground gba:ring-1 gba:ring-primary'
                : 'gba:text-foreground gba:group-hover/day:bg-accent'
            return (
              <button
                key={dayKey(day)}
                type="button"
                onClick={() => setSelected(day)}
                className="gba:group/day gba:flex gba:flex-col gba:items-center gba:gap-1 gba:rounded-lg gba:py-1.5 gba:transition-colors"
                data-testid={`${TEST_ID}-day-${dayKey(day)}`}
              >
                <span className="gba:text-[10px] gba:font-medium gba:uppercase gba:text-muted-foreground">
                  {weekdayLabel.format(day)}
                </span>
                <span
                  className={`gba:flex gba:size-7 gba:items-center gba:justify-center gba:rounded-full gba:text-sm gba:font-medium gba:transition-colors ${numberClass}`}
                >
                  {day.getDate()}
                </span>
                <span className="gba:flex gba:h-1.5 gba:items-center gba:gap-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <span
                      key={event.id}
                      className={`gba:size-1.5 gba:rounded-full ${isToday ? 'gba:bg-primary' : 'gba:bg-muted-foreground/50'}`}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="gba:flex gba:flex-col gba:gap-1.5" data-testid={`${TEST_ID}-agenda`}>
          {selectedEvents.length === 0 ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:py-2 gba:text-xs gba:text-muted-foreground">
              <CalendarBlankIcon className="gba:size-4" />
              {t('calendar-no-events')}
            </div>
          ) : (
            <>
              {selectedEvents.slice(0, MAX_AGENDA_ITEMS).map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={openFullCalendar}
                  className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-md gba:px-2 gba:py-1.5 gba:text-left gba:transition-colors gba:hover:bg-accent"
                  data-testid={`${TEST_ID}-event-${event.id}`}
                >
                  <span className="gba:w-12 gba:shrink-0 gba:text-xs gba:font-medium gba:text-muted-foreground">
                    {event.allDay ? t('calendar-all-day') : timeLabel.format(event.start)}
                  </span>
                  <span className="gba:size-1.5 gba:shrink-0 gba:rounded-full gba:bg-primary" />
                  <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:text-foreground">
                    {event.title}
                  </span>
                </button>
              ))}
              {selectedEvents.length > MAX_AGENDA_ITEMS ? (
                <button
                  type="button"
                  onClick={openFullCalendar}
                  className="gba:px-2 gba:py-1 gba:text-left gba:text-xs gba:font-medium gba:text-primary gba:transition-colors gba:hover:underline"
                  data-testid={`${TEST_ID}-more`}
                >
                  {t('calendar-more', { count: selectedEvents.length - MAX_AGENDA_ITEMS })}
                </button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default WeekCalendar
export { WeekCalendar }
