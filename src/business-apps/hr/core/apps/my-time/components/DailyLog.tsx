'use client'

import React from 'react'
import { Card, Alert, useTranslation, ItemMedia } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../../employee-record/components/tabs/hooks/useTimeTrackingData'
import {
  FolderIcon,
  CurrencyDollarIcon,
  ClockIcon,
  SunIcon,
  CalculatorIcon,
  CalendarBlankIcon
} from '@phosphor-icons/react'
import AbsenceCalendar from '../../employee-record/components/tabs/components/AbsenceCalendar'
import type { AbsenceListCardAbsence } from '../../employee-record/queries/types'
import dayjs, { Dayjs } from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import timeTrackingTranslations from '../_i18n'
dayjs.extend(weekday)
dayjs.extend(localeData)

interface DailyLogProps {
  employeeId: string
  accessToken: string
  employee: any
}

const DailyLog: React.FC<DailyLogProps> = ({ employeeId, employee, accessToken }) => {
  const [currentDate, setCurrentDate] = React.useState<Dayjs>(dayjs())
  const [selectedStartDate, setSelectedStartDate] = React.useState<any>(null)
  const [selectedEndDate, setSelectedEndDate] = React.useState<any>(null)
  const {
    entries,
    error,
    monthlyRequiredUntilYesterdayMinutes,
    monthlyWorkedUntilYesterdayMinutes,
    monthlyRequiredMinutes,
    dailyAverageWorkedMinutesUntilYesterday,
    overtimeMinutesUntilYesterday
  } = useTimeTrackingData({
    employeeId,
    accessToken,
    workingHours: employee?.workingHours?.[0]
  })

  const { t } = useTranslation(timeTrackingTranslations)

  const calendarAbsences = React.useMemo<AbsenceListCardAbsence[]>(() => {
    const parseMinutes = (text?: string): number => {
      if (!text) return 0
      let hours = 0
      let minutes = 0
      const tokens = String(text).trim().split(/\s+/)
      for (const token of tokens) {
        if (/^\d+h$/i.test(token)) {
          hours = Number.parseInt(token.slice(0, -1), 10) || 0
        } else if (/^\d+m$/i.test(token)) {
          minutes = Number.parseInt(token.slice(0, -1), 10) || 0
        }
      }
      return hours * 60 + minutes
    }
    const mapStatus = (s?: string): string => {
      const t = String(s || '').toLowerCase()
      if (t === 'approved') return 'APPROVED'
      if (t === 'pending') return 'PENDING'
      if (t === 'rejected') return 'REJECTED'
      if (t === 'cancelled') return 'CANCELLED'
      if (t === 'open') return 'PENDING'
      return 'APPROVED'
    }
    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    return entries.map(e => {
      const dayKey = toKey(new Date(e.attendanceDateISO))
      const label = e.effectiveTime || e.recordedTime || '0h'
      const status = mapStatus(e.status)
      const item: AbsenceListCardAbsence = {
        type: label,
        typeId: 'TIME',
        status,
        originalStatus: status,
        title: 'Work Log',
        startDate: dayKey,
        endDate: dayKey,
        duration: label,
        description: e.notes || '',
        icon: null,
        typeColor: '',
        statusColor: '',
        requestDate: dayKey,
        plannedMinutes: parseMinutes(e.plannedTime),
        effectiveMinutes: parseMinutes(e.effectiveTime)
      }
      return item
    })
  }, [entries])

  const fmt = (m: number) => {
    const sign = m < 0 ? '-' : ''
    const abs = Math.abs(Math.round(m))
    const hours = Math.floor(abs / 60)
    const minutes = abs % 60
    return minutes === 0 ? `${sign}${hours}h` : `${sign}${hours}h ${minutes}m`
  }

  return (
    <div data-testid="time-tracking-history-container">
      <div className="gba:mt-6">
        {(() => {
          const missingMinutes = Math.max(0, monthlyRequiredUntilYesterdayMinutes - monthlyWorkedUntilYesterdayMinutes)
          return (
            <div
              className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-4"
              data-testid="time-tracking-monthly-summary"
            >
              <Card className="gba:p-6 gba:gap-0">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.summary.required_month',
                      'Required this month'
                    )}
                  </div>
                  <ItemMedia variant="icon" icon={CalendarBlankIcon} iconVariant="decorative" />
                </div>
                <div className="gba:text-4xl gba:font-bold">{fmt(monthlyRequiredMinutes)}</div>
                <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.summary.required_month_desc',
                    'Total required hours'
                  )}
                </div>
              </Card>

              <Card className="gba:p-6 gba:gap-0">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.summary.required_until_today',
                      'Required until today'
                    )}
                  </div>
                  <ItemMedia variant="icon" icon={ClockIcon} iconVariant="decorative" />
                </div>
                <div className="gba:text-4xl gba:font-bold">{fmt(monthlyRequiredUntilYesterdayMinutes)}</div>
                <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.summary.required_until_today_desc',
                    'Target up to yesterday'
                  )}
                </div>
              </Card>

              <Card className="gba:p-6 gba:gap-0">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.summary.worked_until_today',
                      'Worked until today'
                    )}
                  </div>
                  <ItemMedia variant="icon" icon={SunIcon} iconVariant="decorative" />
                </div>
                <div className="gba:text-4xl gba:font-bold">{fmt(monthlyWorkedUntilYesterdayMinutes)}</div>
                <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.summary.worked_until_today_desc',
                    'Logged up to yesterday'
                  )}
                </div>
              </Card>

              <Card className="gba:p-6 gba:gap-0">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.summary.missing_vs_required',
                      'Missing vs required'
                    )}
                  </div>
                  <ItemMedia variant="icon" icon={CalculatorIcon} iconVariant="decorative" />
                </div>
                <div className="gba:text-4xl gba:font-bold">{fmt(missingMinutes)}</div>
                <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.summary.missing_vs_required_desc',
                    'Hours needed to reach target'
                  )}
                </div>
              </Card>
            </div>
          )
        })()}

        {(() => {
          return (
            <div
              className="gba:mt-4 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4"
              data-testid="time-tracking-monthly-secondary"
            >
              <Card className="gba:p-6 gba:gap-0">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:text-base gba:font-semibold">{t('daily_average')}</div>
                  <ItemMedia variant="icon" icon={FolderIcon} iconVariant="decorative" />
                </div>
                <div className="gba:text-4xl gba:font-bold">{fmt(dailyAverageWorkedMinutesUntilYesterday)}</div>
              </Card>

              <Card className="gba:p-6 gba:gap-0">
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:text-base gba:font-semibold">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.overtime', 'Overtime')}
                  </div>
                  <ItemMedia variant="icon" icon={CurrencyDollarIcon} iconVariant="decorative" />
                </div>
                <div className="gba:text-4xl gba:font-bold">{fmt(overtimeMinutesUntilYesterday)}</div>
              </Card>
            </div>
          )
        })()}
      </div>

      {/* Month Calendar (reused AbsenceCalendar) based on table data */}
      <Card className="gba:p-4 gba:mt-4" data-testid="time-tracking-calendar">
        <AbsenceCalendar
          absenceList={calendarAbsences}
          loading={false}
          error={null}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          selectedStartDate={selectedStartDate}
          setSelectedStartDate={setSelectedStartDate}
          selectedEndDate={selectedEndDate}
          setSelectedEndDate={setSelectedEndDate}
          showToday={false}
          showPrevNext={false}
          enableSelection={false}
          showFooter={false}
          showStatusInTooltip={false}
          showDurationInTooltip={false}
          customLegend={
            <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-warning-secondary" />
                <span className="gba:text-xs">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.legend.hours_needed', 'Incomplete')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-success" />
                <span className="gba:text-xs">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.legend.hours_fulfilled', 'Complete')}
                </span>
              </div>
            </div>
          }
        />
      </Card>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-4">
          {error}
        </Alert>
      )}
    </div>
  )
}

export default DailyLog
