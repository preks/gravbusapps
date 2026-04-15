'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useTranslation
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from 'recharts'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import timeTrackingTranslations from '../_i18n'

interface WorkingHours {
  sundayHours?: number
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
}

interface ThisWeekCardProps {
  readonly allMonthEntries: TimeEntry[]
  readonly workingHours: WorkingHours | null | undefined
  readonly todayRecordedMinutes: number
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_TO_SHOW = 5
const HALF = Math.floor(DAYS_TO_SHOW / 2)

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const HOURS_BY_DOW: readonly (keyof WorkingHours)[] = [
  'sundayHours',
  'mondayHours',
  'tuesdayHours',
  'wednesdayHours',
  'thursdayHours',
  'fridayHours',
  'saturdayHours'
]

function buildWeekData(
  entries: TimeEntry[],
  todayRecordedMinutes: number
): Array<{ day: string; hours: number; isToday: boolean; dow: number }> {
  const now = new Date()
  const todayKey = toLocalDateKey(now)
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - HALF)

  const entryMap = new Map<string, number>()
  for (const entry of entries) {
    const key = toLocalDateKey(new Date(entry.attendanceDateISO))
    if (key === todayKey) continue
    entryMap.set(key, (entryMap.get(key) ?? 0) + (entry.totalMinutes ?? 0))
  }

  return Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const key = toLocalDateKey(date)
    const dow = date.getDay()
    const isToday = key === todayKey
    const minutes = isToday ? todayRecordedMinutes : (entryMap.get(key) ?? 0)
    return {
      day: SHORT_DAYS[dow],
      hours: Math.round((minutes / 60) * 10) / 10,
      isToday,
      dow
    }
  })
}

const chartConfig = {
  hours: { label: 'Hours', color: 'var(--nw-color-primary)' }
}

export const ThisWeekCard: React.FC<ThisWeekCardProps> = ({ allMonthEntries, workingHours, todayRecordedMinutes }) => {
  const { t } = useTranslation(timeTrackingTranslations)
  const weekData = useMemo(
    () => buildWeekData(allMonthEntries, todayRecordedMinutes),
    [allMonthEntries, todayRecordedMinutes]
  )
  const totalWorked = weekData.reduce((sum, d) => sum + d.hours, 0)
  const plannedHours = useMemo(() => {
    if (!workingHours) return 40
    return weekData.reduce((sum, d) => sum + (workingHours[HOURS_BY_DOW[d.dow]] ?? 0), 0)
  }, [workingHours, weekData])

  return (
    <Card className="gba:h-full" data-testid="timeclock-this-week-card">
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-xs gba:font-semibold gba:tracking-wide gba:text-muted-foreground">
            {t('this_week_card')}
          </CardTitle>
          <span className="gba:text-sm gba:font-semibold">
            {totalWorked.toFixed(1)}h / {plannedHours}h
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[160px] gba:w-full">
          <BarChart data={weekData} margin={{ top: 20, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="hours" position="top" fontSize={11} formatter={v => (Number(v) > 0 ? `${v}h` : '')} />
              {weekData.map(entry => (
                <Cell key={entry.day} fill={entry.isToday ? 'var(--nw-color-primary)' : 'var(--nw-color-muted)'} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
