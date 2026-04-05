import React, { useEffect, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { CalendarEvent } from '../types'
import { CalendarEventItem } from './CalendarEventItem'

export const MAX_VISIBLE_ALL_DAY = 2

/** Matches `gba:h-8` (32px) for compact single-line chips */
const ALL_DAY_CHIP_HEIGHT_PX = 32

export interface CalendarAllDayStackProps {
  events: CalendarEvent[]
  columnId: string
  onEventClick: (event: CalendarEvent) => void
  t: (key: string, params?: Record<string, any>) => string
  activeConversationCalls?: Map<string, any>
  onJoinCall?: (event: CalendarEvent) => void
}

export const CalendarAllDayStack: React.FC<CalendarAllDayStackProps> = ({
  events,
  columnId,
  onEventClick,
  t,
  activeConversationCalls,
  onJoinCall
}) => {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [columnId])

  const safeTestId = columnId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const overflowCount = events.length - MAX_VISIBLE_ALL_DAY
  const hasOverflow = overflowCount > 0
  const displayed = expanded || !hasOverflow ? events : events.slice(0, MAX_VISIBLE_ALL_DAY)

  return (
    <div className="gba:flex gba:flex-col gba:gap-0.5 gba:min-w-0">
      <div
        className={
          expanded && hasOverflow
            ? 'gba:flex gba:flex-col gba:gap-0.5 gba:max-h-[50vh] gba:overflow-y-auto gba:min-w-0'
            : 'gba:flex gba:flex-col gba:gap-0.5 gba:min-w-0'
        }
      >
        {displayed.map(event => (
          <div key={event.id} className="gba:h-8 gba:min-h-0 gba:shrink-0">
            <CalendarEventItem
              event={event}
              compact
              height={ALL_DAY_CHIP_HEIGHT_PX}
              onClick={() => onEventClick(event)}
              t={t}
              activeConversationCalls={activeConversationCalls}
              onJoinCall={onJoinCall}
            />
          </div>
        ))}
      </div>
      {hasOverflow && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:px-1.5 gba:text-[10px] gba:w-full gba:justify-center gba:gap-1"
          aria-expanded={expanded}
          aria-label={
            expanded ? t('calendar-allDay-collapse-aria') : t('calendar-allDay-expand-aria', { count: overflowCount })
          }
          onClick={() => setExpanded(e => !e)}
          data-testid={`calendar-allday-expand-${safeTestId}`}
        >
          {!expanded && <span>{t('calendar-allDay-more-count', { count: overflowCount })}</span>}
          {expanded ? (
            <CaretUp className="gba:h-3.5 gba:w-3.5" weight="bold" aria-hidden />
          ) : (
            <CaretDown className="gba:h-3.5 gba:w-3.5" weight="bold" aria-hidden />
          )}
        </Button>
      )}
    </div>
  )
}
