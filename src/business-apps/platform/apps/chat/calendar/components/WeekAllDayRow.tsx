import React from 'react'
import { cn } from '@newwork/nw-design-system'
import type { CalendarEvent } from '../types'
import { CalendarAllDayStack } from './CalendarAllDayStack'

export interface WeekAllDayRowProps {
  dayKeys: string[]
  allDayColumns: CalendarEvent[][]
  onEventClick: (event: CalendarEvent) => void
  t: (key: string, params?: Record<string, any>) => string
  activeConversationCalls?: Map<string, any>
  onJoinCall?: (event: CalendarEvent) => void
}

export const WeekAllDayRow: React.FC<WeekAllDayRowProps> = ({
  dayKeys,
  allDayColumns,
  onEventClick,
  t,
  activeConversationCalls,
  onJoinCall
}) => {
  const hasAny = allDayColumns.some(col => col.length > 0)
  if (!hasAny) {
    return null
  }

  return (
    <div className="gba:flex gba:border-t gba:border-b gba:border-border/50 gba:bg-muted/20">
      <div
        className={cn(
          'gba:w-10 gba:sm:w-14 gba:flex-shrink-0 gba:border-r gba:border-border/50 gba:px-0.5 gba:py-1 gba:sm:px-1',
          'gba:flex gba:items-start gba:justify-center gba:pt-0.5'
        )}
      >
        <span className="gba:text-[9px] gba:sm:text-[10px] gba:text-muted-foreground gba:leading-tight gba:text-center">
          {t('calendar-allDay')}
        </span>
      </div>
      {dayKeys.map((dayKey, index) => (
        <div
          key={dayKey}
          className="gba:flex-1 gba:min-w-0 gba:border-r gba:border-border/50 gba:last:border-r-0 gba:px-0.5 gba:py-1"
        >
          <CalendarAllDayStack
            columnId={dayKey}
            events={allDayColumns[index] ?? []}
            onEventClick={onEventClick}
            t={t}
            activeConversationCalls={activeConversationCalls}
            onJoinCall={onJoinCall}
          />
        </div>
      ))}
    </div>
  )
}
