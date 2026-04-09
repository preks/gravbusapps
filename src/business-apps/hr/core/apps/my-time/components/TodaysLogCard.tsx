'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import timeTrackingTranslations from '../_i18n'

interface TodaysLogCardProps {
  readonly entries: TimeEntry[]
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  try {
    const locale = (typeof globalThis !== 'undefined' && (globalThis as any)?.lowcoder?.i18n?.selectedLocale) || 'en-US'
    const use12h = String(locale).toLowerCase().startsWith('en')
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: use12h })
  } catch {
    return ''
  }
}

interface LogEvent {
  id: string
  type: 'in' | 'out'
  time: string
}

function buildTodayEvents(entries: TimeEntry[]): LogEvent[] {
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const events: LogEvent[] = []
  for (const entry of entries) {
    const d = new Date(entry.attendanceDateISO)
    const entryKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (entryKey !== todayKey) continue

    if (entry.startTimeISO) {
      events.push({ id: `${entry.id}-in`, type: 'in', time: formatTime(entry.startTimeISO) })
    }
    if (entry.endTimeISO) {
      events.push({ id: `${entry.id}-out`, type: 'out', time: formatTime(entry.endTimeISO) })
    }
  }
  return events
}

export const TodaysLogCard: React.FC<TodaysLogCardProps> = ({ entries }) => {
  const { t } = useTranslation(timeTrackingTranslations)
  const events = useMemo(() => buildTodayEvents(entries), [entries])

  return (
    <Card className="gba:h-full" data-testid="timeclock-todays-log-card">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-xs gba:font-semibold gba:tracking-wide gba:text-muted-foreground">
          {t('todays_log')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground gba:py-4 gba:text-center">{t('no_log_entries')}</p>
        ) : (
          <div className="gba:space-y-3">
            {events.map(event => (
              <div key={event.id} className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span
                    className={`gba:h-2.5 gba:w-2.5 gba:rounded-full gba:shrink-0 ${
                      event.type === 'in' ? 'gba:bg-success' : 'gba:bg-destructive'
                    }`}
                  />
                  <span className="gba:text-sm">
                    {event.type === 'in' ? t('clocked_in_log') : t('clocked_out_log')}
                  </span>
                </div>
                <span className="gba:text-sm gba:text-muted-foreground">{event.time}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
