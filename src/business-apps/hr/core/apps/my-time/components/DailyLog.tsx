'use client'

import React from 'react'
import { Card, useTranslation } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../../employee-record/components/tabs/hooks/useTimeTrackingData'
import { useAbsenceData } from '../../employee-record/hooks/useAbsenceData'
import AbsenceCalendar from '../../employee-record/components/tabs/components/AbsenceCalendar'
import type { AbsenceListCardAbsence } from '../../employee-record/queries/types'
import dayjs, { Dayjs } from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import TimeSummaryCards from '../../employee-record/components/tabs/components/TimeSummaryCards'
import { parseDurationToMinutes, formatDurationToHHMM } from '../utils/duration'
import timeTrackingTranslations from '../_i18n'
import { getMyTimeErrorMessage, MyTimeErrorStateCard, MyTimeLoadingStateCard } from './MyTimeErrorStateCard'
dayjs.extend(weekday)
dayjs.extend(localeData)

interface DailyLogProps {
  employeeId: string
  accessToken: string
  employee: any
  hideSummaryCards?: boolean
}

const EMPTY_ABSENCE_ENTITLEMENTS: never[] = []

const DailyLog: React.FC<DailyLogProps> = ({ employeeId, employee, accessToken, hideSummaryCards }) => {
  const { t } = useTranslation(timeTrackingTranslations)
  const [currentDate, setCurrentDate] = React.useState<Dayjs>(dayjs())
  const [selectedStartDate, setSelectedStartDate] = React.useState<any>(null)
  const [selectedEndDate, setSelectedEndDate] = React.useState<any>(null)

  const { absenceList } = useAbsenceData(employeeId, accessToken, EMPTY_ABSENCE_ENTITLEMENTS)

  const employeeHireDate = employee?.workingCondition?.[0]?.hireDate

  const {
    allMonthEntries,
    holidayDates,
    error,
    isLoading,
    monthlyRequiredUntilYesterdayMinutes,
    monthlyWorkedUntilYesterdayMinutes,
    monthlyRequiredMinutes,
    dailyAverageWorkedMinutesUntilYesterday,
    overtimeMinutesUntilYesterday
  } = useTimeTrackingData({
    employeeId,
    accessToken,
    hireDate: employeeHireDate,
    workingHours: employee?.workingHours
  })

  const calendarAbsences = React.useMemo<AbsenceListCardAbsence[]>(() => {
    const entries = allMonthEntries
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

    const timeEntries: AbsenceListCardAbsence[] = entries.map(e => {
      const dayKey = toKey(new Date(e.attendanceDateISO))
      const label = formatDurationToHHMM(e.effectiveTime || e.recordedTime || '0h')
      const status = mapStatus(e.status)
      return {
        id: e.id,
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
        employeeAbsence: {
          id: e.id,
          version: e.version ?? 0,
          employeeId,
          typeRef: 'TIME',
          startDate: dayKey,
          endDate: dayKey,
          status
        },
        plannedMinutes: parseDurationToMinutes(e.plannedTime),
        effectiveMinutes: parseDurationToMinutes(e.effectiveTime)
      }
    })

    return [...absenceList, ...timeEntries]
  }, [allMonthEntries, absenceList])

  if (isLoading) {
    return (
      <div data-testid="time-tracking-history-container">
        <MyTimeLoadingStateCard message={t('loading_time_data')} />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="time-tracking-history-container">
        <MyTimeErrorStateCard message={getMyTimeErrorMessage(error, t('error_loading_time_entries'))} />
      </div>
    )
  }

  return (
    <div data-testid="time-tracking-history-container">
      {!hideSummaryCards && (
        <TimeSummaryCards
          monthlyRequiredMinutes={monthlyRequiredMinutes}
          monthlyRequiredUntilYesterdayMinutes={monthlyRequiredUntilYesterdayMinutes}
          monthlyWorkedUntilYesterdayMinutes={monthlyWorkedUntilYesterdayMinutes}
          dailyAverageWorkedMinutesUntilYesterday={dailyAverageWorkedMinutesUntilYesterday}
          overtimeMinutesUntilYesterday={overtimeMinutesUntilYesterday}
        />
      )}
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
          holidayDates={holidayDates}
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
    </div>
  )
}

export default DailyLog
