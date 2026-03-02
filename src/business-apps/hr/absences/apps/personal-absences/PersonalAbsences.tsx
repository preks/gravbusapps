import { useState, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { fetchHolidayDates } from '@/business-apps/hr/core/apps/employee-record/components/tabs/utils/fetchHolidayDates'
import { GET_ABSENCE_DAILY_FACTS } from '@/business-apps/hr/core/apps/employee-record/queries/queries'
import { useEmployeeWeeklySchedule } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeWeeklySchedule'

import personalAbsencesTranslations from './_i18n'
import { usePersonalAbsencesData } from './hooks/usePersonalAbsencesData'
import { useWellnessInsight } from './hooks/useWellnessInsight'
import { PersonalAbsencesCalendarView } from './components/PersonalAbsencesCalendarView'
import { PersonalAbsencesDashboardView } from './components/PersonalAbsencesDashboardView'

export const PersonalAbsences = (props: BusinessAppContextProps) => {
  const { t } = useTranslation(personalAbsencesTranslations)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(dayjs())
  const [selectedStartDate, setSelectedStartDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<dayjs.Dayjs | null>(null)
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [effectiveDates, setEffectiveDates] = useState<Set<string> | null>(null)
  const [allowWeekendPaintingInFallback, setAllowWeekendPaintingInFallback] = useState(false)

  const { accessToken, userInfo } = props
  const employeeId = userInfo?.employeeDetails?.employeeId
  const client = useGraphQLClient(accessToken)

  const data = usePersonalAbsencesData(accessToken, employeeId)
  const {
    employee,
    absenceEntitlements,
    absences,
    displayEntitlements,
    ytdAbsentDays,
    ytdTotalWorkingDays,
    loading,
    error,
    employeeLoading,
    absenceGroups,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    pendingRequests,
    upcomingAbsences,
    nextHoliday,
    typeOptions,
    filteredAbsences,
    paginatedAbsences,
    totalPages,
    getAbsenceGroupDisplayValue,
    handleCreateAbsence
  } = data
  const nonWorkingDates = useEmployeeWeeklySchedule(accessToken, employee?.id, calendarDate)

  const wellness = useWellnessInsight(absences, displayEntitlements, ytdAbsentDays, ytdTotalWorkingDays, accessToken)
  const { wellnessDataSummary, wellnessInsight, wellnessLoading, wellnessRequested, requestWellnessAnalysis } = wellness

  useEffect(() => {
    if (!employee?.id || !accessToken) return
    fetchHolidayDates(client, employee.id, calendarDate.year(), calendarDate.month(), getCurrentActiveUserLocale())
      .then(dates => setHolidayDates(dates))
      .catch(() => {})
  }, [employee?.id, accessToken, calendarDate, client])

  useEffect(() => {
    const loadDailyFacts = async () => {
      try {
        if (!client || !employee?.id) {
          setEffectiveDates(null)
          return
        }
        const from = calendarDate.startOf('month').format('YYYY-MM-DD')
        const to = calendarDate.endOf('month').format('YYYY-MM-DD')
        const res: any = await client.request(GET_ABSENCE_DAILY_FACTS, {
          employeeId: employee.id,
          from,
          to
        })
        const facts: Array<{
          dayDate?: string
          day_date?: string
          dayFraction?: number | string | null
          day_fraction?: number | string | null
          signedDayFraction?: number | string | null
          signed_day_fraction?: number | string | null
        }> = res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []
        const set = new Set<string>()
        let anyDefinedFraction = false
        let weekendEffective = false

        const perDayNet: Record<string, number> = {}
        facts.forEach(f => {
          const rawDate = (f.dayDate ?? f.day_date) as string | undefined
          const rawSigned = (f.signedDayFraction ?? f.signed_day_fraction) as number | string | null | undefined
          const rawFrac = (f.dayFraction ?? f.day_fraction) as number | string | null | undefined
          const value =
            rawSigned !== null && rawSigned !== undefined
              ? typeof rawSigned === 'number'
                ? rawSigned
                : Number(rawSigned)
              : rawFrac !== null && rawFrac !== undefined
                ? typeof rawFrac === 'number'
                  ? rawFrac
                  : Number(rawFrac)
                : null
          if (value === null || rawDate === undefined) return
          anyDefinedFraction = true
          perDayNet[rawDate] = (perDayNet[rawDate] || 0) + value
        })

        Object.entries(perDayNet).forEach(([date, sum]) => {
          if (sum > 0) {
            set.add(date)
            const d = dayjs(date)
            if (d.day() === 0 || d.day() === 6) weekendEffective = true
          }
        })

        if (facts.length === 0 || !anyDefinedFraction) {
          setEffectiveDates(null)
          setAllowWeekendPaintingInFallback(false)
        } else {
          setEffectiveDates(set)
          setAllowWeekendPaintingInFallback(weekendEffective)
        }
      } catch {
        setEffectiveDates(null)
      }
    }
    loadDailyFacts()
  }, [client, employee?.id, calendarDate])

  if (showCalendar && employee && absenceEntitlements) {
    return (
      <PersonalAbsencesCalendarView
        accessToken={accessToken || ''}
        employee={employee}
        absenceEntitlements={absenceEntitlements}
        calendarDate={calendarDate}
        setCalendarDate={setCalendarDate}
        selectedStartDate={selectedStartDate}
        setSelectedStartDate={setSelectedStartDate}
        selectedEndDate={selectedEndDate}
        setSelectedEndDate={setSelectedEndDate}
        holidayDates={holidayDates}
        onBackToDashboard={() => setShowCalendar(false)}
        t={t}
        absences={absences}
        loading={loading}
        error={error}
        effectiveDates={effectiveDates ?? undefined}
        allowWeekendPaintingInFallback={allowWeekendPaintingInFallback}
        nonWorkingDates={!effectiveDates ? (nonWorkingDates ?? undefined) : undefined}
      />
    )
  }

  const isLoading = loading || employeeLoading

  return (
    <PersonalAbsencesDashboardView
      onShowCalendar={() => setShowCalendar(true)}
      absenceGroups={absenceGroups}
      getAbsenceGroupDisplayValue={getAbsenceGroupDisplayValue}
      onCreateAbsence={handleCreateAbsence}
      isLoading={isLoading}
      displayEntitlements={displayEntitlements}
      otherEntitlements={data.otherEntitlements}
      ytdAbsentDays={ytdAbsentDays}
      ytdTotalWorkingDays={ytdTotalWorkingDays}
      wellnessInsight={wellnessInsight}
      wellnessLoading={wellnessLoading}
      wellnessDataSummary={wellnessDataSummary}
      wellnessRequested={wellnessRequested}
      onRequestWellnessAnalysis={requestWellnessAnalysis}
      pendingRequests={pendingRequests}
      upcomingAbsences={upcomingAbsences}
      nextHoliday={nextHoliday}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      typeOptions={typeOptions}
      filteredAbsences={filteredAbsences}
      paginatedAbsences={paginatedAbsences}
      totalPages={totalPages}
      error={error}
      t={t}
    />
  )
}

export default PersonalAbsences
