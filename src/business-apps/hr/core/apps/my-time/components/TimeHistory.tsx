'use client'

import React from 'react'
import { Button, Card, CardContent, Alert, useTranslation } from '@newwork/nw-design-system'
import { CalendarBlankIcon, ArrowLeftIcon } from '@phosphor-icons/react'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import { TimeEntriesTable } from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/TimeEntriesTable'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { exportTimeHistoryPdf } from '../utils/exportTimeHistoryPdf'
import { parseDurationToMinutes } from '../utils/duration'
import timeTrackingTranslations from '../_i18n'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery
} from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { getEmployeeAbsences } from '@/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences'
import DailyLog from './DailyLog'

interface TimeHistoryProps {
  employeeId: string
  accessToken: string
  userId?: string
  employee?: any
  employeeCode?: string
  employeeFirstName?: string
  employeeLastName?: string
  workingHours?: {
    sundayHours?: number
    mondayHours?: number
    tuesdayHours?: number
    wednesdayHours?: number
    thursdayHours?: number
    fridayHours?: number
    saturdayHours?: number
  }
}

const TimeHistory: React.FC<TimeHistoryProps> = ({
  employeeId,
  accessToken,
  userId,
  employee,
  employeeCode,
  employeeFirstName,
  employeeLastName,
  workingHours
}) => {
  const locale = getCurrentActiveUserLocale()
  const {
    currentMonth,
    prevMonth,
    nextMonth,
    entries,
    entriesForReport,
    pageSize,
    setPageSize,
    sortKey,
    sortDir,
    setSort,
    error,
    refresh
  } = useTimeTrackingData({
    employeeId,
    accessToken,
    workingHours
  })

  const { t } = useTranslation(timeTrackingTranslations)
  const [showCalendar, setShowCalendar] = React.useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  const summary = React.useMemo(() => {
    const all = entriesForReport ?? entries
    let daysWorked = 0
    let bankHolidays = 0
    let vacationDays = 0
    let totalPlannedMin = 0
    let totalEffectiveMin = 0

    for (const e of all) {
      const effectiveMin = parseDurationToMinutes(e.effectiveTime)
      const plannedMin = parseDurationToMinutes(e.plannedTime)
      totalPlannedMin += plannedMin
      totalEffectiveMin += effectiveMin

      if (effectiveMin > 0 || e.startTimeISO || e.endTimeISO) daysWorked += 1
      if (e.dayType === 'holiday') bankHolidays += 1
      if (e.absenceLabel && /\b(vacation|urlaub|concediu)\b/i.test(e.absenceLabel)) vacationDays += 1
    }

    const fmt = (mins: number) => {
      const sign = mins < 0 ? '-' : ''
      const abs = Math.abs(mins)
      const h = Math.floor(abs / 60)
      const m = abs % 60
      return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`
    }

    return {
      daysWorked,
      bankHolidays,
      vacationDays,
      plannedHours: fmt(totalPlannedMin),
      effectiveHours: fmt(totalEffectiveMin),
      difference: fmt(totalPlannedMin - totalEffectiveMin)
    }
  }, [entriesForReport, entries])

  const handleGenerateReport = async () => {
    try {
      // Collect holiday and vacation dates for the month
      const activeLocale = getCurrentActiveUserLocale()
      const holidayDates: string[] = []
      const vacationDates: string[] = []

      // Determine month boundaries
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const toLocalKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      // Holidays by employee region (normalize RO sub-regions to ROU like Absence Calendar)
      try {
        const regionRes = await graphqlClient.request<any>(employeeRegionLookupQuery, {
          employeeId,
          activeUserLocale: activeLocale
        })
        const regionIdRaw: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id
        if (regionIdRaw) {
          let regionId = regionIdRaw
          try {
            const seg = String(regionIdRaw).split(':').pop() || ''
            if (seg.startsWith('RO') && seg !== 'ROU') {
              regionId = 'EmploymentRegion:v1:ROU'
            }
          } catch {}
          const holRes = await graphqlClient.request<any>(employmentRegionHolidaysQuery, {
            activeUserLocale: activeLocale,
            regionId
          })
          const holidays: any[] = holRes?.holidays || []
          const targetYear = currentMonth.getFullYear()
          const codesForYear = holidays.filter(h => String(h?.additionalValue3 ?? '') === String(targetYear))
          for (const h of codesForYear) {
            const code = String(h?.alternativeCode ?? '')
            const m = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
            if (!m) continue
            const y = Number.parseInt(m[1], 10)
            const mo = Number.parseInt(m[2], 10)
            const da = Number.parseInt(m[3], 10)
            const d = new Date(y, mo - 1, da)
            if (d >= monthStart && d <= monthEnd) {
              holidayDates.push(toLocalKey(d))
            }
          }
        }
      } catch {}

      // Vacation dates: fetch absences for the month and detect those whose group name translates to Vacation/Urlaub/Concediu
      try {
        const startTs = new Date(
          Date.UTC(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate(), 0, 0, 0)
        ).toISOString()
        const endTs = new Date(
          Date.UTC(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59)
        ).toISOString()
        const absRes = await graphqlClient.request<any>(getEmployeeAbsences, {
          employeeId,
          startDate: startTs,
          endDate: endTs
        })
        const absences: any[] = absRes?.EmployeeAbsence || []
        const looksLikeVacationGroup = (type: any): boolean => {
          try {
            const translations = (type?.translations || []) as Array<{ value?: string }>
            return translations.some(tr =>
              String(tr?.value || '')
                .toLowerCase()
                .trim()
                .match(/\b(vacation|urlaub|concediu)\b/)
            )
          } catch {
            return false
          }
        }
        const addRangeDays = (fromIso: string, toIso: string) => {
          const from = new Date(fromIso)
          const to = new Date(toIso)
          const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
          const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
          while (cursor <= end) {
            if (cursor >= monthStart && cursor <= monthEnd) {
              const key = toLocalKey(cursor)
              if (!holidayDates.includes(key)) {
                vacationDates.push(key)
              }
            }
            cursor.setDate(cursor.getDate() + 1)
          }
        }
        for (const a of absences) {
          if (looksLikeVacationGroup(a?.type) && a.startDate && a.endDate) {
            addRangeDays(String(a.startDate), String(a.endDate))
          }
        }
      } catch {}

      await exportTimeHistoryPdf({
        reportTitle: t('report_title'),
        generatedLabel: t('generated'),
        t,
        holidayDates,
        vacationDates,
        workingHours,
        entries: entriesForReport ?? entries,
        monthDate: currentMonth,
        locale,
        employeeId,
        employeeCode,
        employeeFirstName,
        employeeLastName
      })
    } catch (e) {
      // Swallow errors silently; UI already has general error alert area
      // and PDF generation is a best-effort client-side feature.
      console.error('[TimeHistory] PDF export failed', e)
    }
  }

  // Refresh entries when a process triggered by AppAction completes successfully
  useProcessCompletion({
    onSuccess: () => {
      refresh().catch(() => {
        // ignore refresh errors; UI has alert for general errors
      })
    }
  })

  if (showCalendar) {
    return (
      <div data-testid="time-tracking-history-container">
        <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between gba:gap-2">
          <Button variant="outline" onClick={() => setShowCalendar(false)} data-testid="my-time-history-back-button">
            <ArrowLeftIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('history')}
          </Button>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button onClick={handleGenerateReport} data-testid="my-time-history-generate-report-button">
              {t('generate_report')}
            </Button>
            <AppAction
              variant="update-primary"
              data-testid="my-time-history-request-correction-button"
              contexts={[
                {
                  context: FlowContextName.employeeAttendanceCorrectionRequest,
                  contextData: { employeeId }
                }
              ]}
              prefixDataTestId="my-time-history-request-correction"
              accessToken={accessToken}
            >
              {t('manual_entry')}
            </AppAction>
          </div>
        </div>
        <DailyLog employee={employee} employeeId={employeeId} accessToken={accessToken} hideSummaryCards />
      </div>
    )
  }

  const summaryCards = [
    { label: t('time_tracking_summary_days_worked'), value: String(summary.daysWorked) },
    { label: t('time_tracking_summary_bank_holidays'), value: String(summary.bankHolidays) },
    { label: t('time_tracking_summary_vacation_days'), value: String(summary.vacationDays) },
    { label: t('time_tracking_summary_planned_hours'), value: summary.plannedHours },
    { label: t('time_tracking_summary_effective_hours'), value: summary.effectiveHours },
    { label: t('time_tracking_summary_difference_hours'), value: summary.difference }
  ]

  return (
    <div data-testid="time-tracking-history-container">
      <div
        className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-3 gba:mb-4"
        data-testid="history-summary"
      >
        {summaryCards.map(item => (
          <Card key={item.label}>
            <CardContent className="gba:p-4 gba:gap-0">
              <div className="gba:text-sm gba:text-muted-foreground">{item.label}</div>
              <div className="gba:text-2xl gba:font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="gba:mb-3 gba:flex gba:items-center gba:justify-end gba:gap-2">
        <Button variant="outline" onClick={() => setShowCalendar(true)} data-testid="my-time-history-calendar-button">
          <CalendarBlankIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('calendar_view')}
        </Button>
        <Button onClick={handleGenerateReport} data-testid="my-time-history-generate-report-button">
          {t('generate_report')}
        </Button>
        <AppAction
          variant="update-primary"
          data-testid="my-time-history-request-correction-button"
          contexts={[
            {
              context: FlowContextName.employeeAttendanceCorrectionRequest,
              contextData: { employeeId }
            }
          ]}
          prefixDataTestId="my-time-history-request-correction"
          accessToken={accessToken}
        >
          {t('manual_entry')}
        </AppAction>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-4">
          {error}
        </Alert>
      )}

      <Card className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-start gba:mb-3">
          <div className="gba:flex gba:gap-2" data-testid="history-month-selector">
            <Button variant="outline" onClick={prevMonth} data-testid="history-month-selector-prev">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.prev', 'Prev')}
            </Button>
            <div className="gba:self-center">
              {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" onClick={nextMonth} data-testid="history-month-selector-next">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.next', 'Next')}
            </Button>
          </div>
        </div>

        <TimeEntriesTable
          entries={entries}
          locale={locale}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          accessToken={accessToken}
          employeeId={employeeId}
          userId={userId}
          showRowsPerPage={false}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={setSort}
        />
      </Card>
    </div>
  )
}

export default TimeHistory
