import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PageLayout,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton
} from '@newwork/nw-design-system'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Sparkles } from 'lucide-react'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

import { CalendarBlankIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ABSENCES } from './queries/graphql'
import { getAbsenceGroups } from '@/business-apps/hr/core/forms/create-new-absence/queries/getAbsenceGroups'
import {
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
  getCurrentActiveStructureId
} from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { startProcess } from '@/common/utils/start-process'
import { useEmployeeData } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData'
import { useAbsenceData } from '@/business-apps/hr/core/apps/employee-record/hooks/useAbsenceData'
import AbsenceCalendar from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/AbsenceCalendar'
import { fetchHolidayDates } from '@/business-apps/hr/core/apps/employee-record/components/tabs/utils/fetchHolidayDates'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action/AppAction'
import { useAbsenceTypeCatalog } from './hooks/useAbsenceTypeCatalog'
import { useEntitlementSnapshot } from './hooks/useEntitlementSnapshot'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { usePublicHolidays } from '@/business-apps/hr/absences/hooks/usePublicHolidays'
import { calculateWorkingDays } from '@/business-apps/hr/core/forms/create-new-absence/utils/workingDaysCalculator'
import { employeeWorkingHoursQuery } from '@/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences'

interface AbsenceRow {
  id: string
  type: string
  typeColor: string
  typeParentEntryId: string
  startDate: string
  endDate: string
  status: string
  originalStatus: string
  workingDays: number
  description: string
  createdAt: string
}

const statusVariant = (status: string): 'default' | 'success' | 'destructive' | 'pending' | 'warning' | 'outline' => {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'success'
    case 'REJECTED':
      return 'destructive'
    case 'PENDING':
      return 'pending'
    case 'PLANNED':
      return 'warning'
    case 'CANCELLED':
      return 'outline'
    default:
      return 'default'
  }
}

export const PersonalAbsences = (props: BusinessAppContextProps) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const [absences, setAbsences] = useState<AbsenceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [absenceGroups, setAbsenceGroups] = useState<any[]>([])
  const [refreshTick, setRefreshTick] = useState(0)
  const pageSize = 10

  const { accessToken, userInfo } = props
  const employeeId = userInfo?.employeeDetails?.employeeId
  const client = useGraphQLClient(accessToken)
  const rawStructureId = getCurrentActiveStructureId()
  const structureId = rawStructureId ?? ''

  const { mapType } = useAbsenceTypeCatalog(accessToken)
  const { entitlements: rawSnapshotEntitlements, refetch: refetchSnapshot } = useEntitlementSnapshot(
    accessToken,
    employeeId || '',
    mapType
  )

  const snapshotEntitlements = useMemo(
    () =>
      (rawSnapshotEntitlements || []).map(ent => {
        const mapped = mapType(ent.typeRef || ent.type)
        return {
          ...ent,
          type: mapped?.label || ent.type,
          color: mapped?.color || ent.color,
          display: mapped?.display === true
        }
      }),
    [rawSnapshotEntitlements, mapType]
  )

  const {
    loading: employeeLoading,
    employee,
    absenceEntitlements,
    refetch: refetchEmployeeData
  } = useEmployeeData(accessToken || '', structureId, employeeId || '')

  useProcessCompletion({
    onSuccess: () => {
      if (refetchSnapshot) refetchSnapshot()
      if (refetchEmployeeData) refetchEmployeeData()
      setRefreshTick(t => t + 1)
    }
  })

  const { holidays: publicHolidays } = usePublicHolidays({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const [workingHours, setWorkingHours] = useState<any>(null)

  useEffect(() => {
    if (!employeeId || !accessToken) return
    client
      .request(employeeWorkingHoursQuery, { employeeId })
      .then((res: any) => {
        const wh = res?.employee?.[0]?.workingHours
        if (!wh) {
          setWorkingHours(null)
          return
        }
        const hasAnyHours = [
          wh.mondayHours,
          wh.tuesdayHours,
          wh.wednesdayHours,
          wh.thursdayHours,
          wh.fridayHours,
          wh.saturdayHours,
          wh.sundayHours
        ].some(h => h != null && h > 0)
        setWorkingHours(hasAnyHours ? wh : null)
      })
      .catch(() => {})
  }, [employeeId, accessToken])

  useEffect(() => {
    if (!accessToken) return
    client
      .request(getAbsenceGroups, { activeUserLocale: getCurrentActiveUserLocale() })
      .then((res: any) => setAbsenceGroups(res?.CatalogEntry || []))
      .catch(() => {})
  }, [accessToken, client])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    client
      .request(GET_EMPLOYEE_ABSENCES, {
        where: { employee: { id: { _eq: employeeId } }, isDeleted: { _eq: false } },
        offset: 0,
        limit: 1000,
        orderBy: [{ createdAt: 'DESC' }],
        activeUserLocale: getCurrentActiveUserLocale()
      })
      .then((res: any) => {
        const rows = (res?.EmployeeAbsence || []).map((a: any) => ({
          id: a.id,
          type: a.type ? getCatalogValue(a.type) || '' : '',
          typeColor: a.type?.objectValue?.color || '6366f1',
          typeParentEntryId: a.type?.parentEntryId || '',
          startDate: a.startDate,
          endDate: a.endDate,
          status: getAbsenceStatusLabel(a.status),
          originalStatus: a.status || '',
          workingDays: a.workingDays ?? 0,
          description: a.description || '',
          createdAt: a.createdAt
        }))
        setAbsences(rows)
      })
      .catch(() => setError('Failed to load absence data.'))
      .finally(() => setLoading(false))
  }, [employeeId, accessToken, refreshTick])

  const getAbsenceGroupDisplayValue = useCallback((group: any) => {
    const t = group.translations?.find((tr: any) => tr.localeCode === getCurrentActiveUserLocale())
    return t?.value || group.id
  }, [])

  const getProcessName = useCallback(
    (groupId: string): string => {
      const map: Record<string, string> = {
        'sick-leave': 'createEmployeeSickLeave',
        'special-leave': 'createEmployeeSpecialLeave',
        vacation: 'createEmployeeVacation',
        'work-leave': 'createEmployeeWorkLeave'
      }
      const group = absenceGroups.find(g => g.id === groupId)
      if (group) {
        const name = getAbsenceGroupDisplayValue(group).toLowerCase()
        if (name.includes('sick') || name.includes('illness')) return 'createEmployeeSickLeave'
        if (name.includes('special') || name.includes('personal')) return 'createEmployeeSpecialLeave'
        if (name.includes('vacation') || name.includes('holiday') || name.includes('annual'))
          return 'createEmployeeVacation'
        if (name.includes('work') || name.includes('training')) return 'createEmployeeWorkLeave'
      }
      return map[groupId] || 'createEmployeeVacation'
    },
    [absenceGroups, getAbsenceGroupDisplayValue]
  )

  const handleCreateAbsence = useCallback(
    (absenceType: string) => {
      startProcess({
        domain: 'employee-time',
        processName: getProcessName(absenceType),
        payload: { employeeId, absenceType },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [getProcessName, employeeId]
  )

  const pendingRequests = useMemo(() => absences.filter(a => a.originalStatus === 'PENDING'), [absences])

  const upcomingAbsences = useMemo(
    () =>
      absences
        .filter(a => dayjs(a.startDate).isAfter(dayjs()) && a.originalStatus === 'APPROVED')
        .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))
        .slice(0, 5),
    [absences]
  )

  const nextHoliday = useMemo(() => {
    const today = dayjs()
    let closest: { name: string; date: dayjs.Dayjs } | null = null
    for (const h of publicHolidays) {
      const code = h.alternativeCode || h.code || ''
      if (!code || code.length !== 8) continue
      const y = code.slice(0, 4)
      const m = code.slice(4, 6)
      const d = code.slice(6, 8)
      const hDate = dayjs(`${y}-${m}-${d}`)
      if (!hDate.isValid() || !hDate.isAfter(today)) continue
      const name = (h as any).translations?.[0]?.value || h.value || ''
      if (!closest || hDate.isBefore(closest.date)) {
        closest = { name, date: hDate }
      }
    }
    return closest
  }, [publicHolidays])

  const typeOptions = useMemo(() => Array.from(new Set(absences.map(a => a.type).filter(Boolean))), [absences])

  const filteredAbsences = useMemo(() => {
    let list = absences
    if (statusFilter !== 'all') list = list.filter(a => a.originalStatus === statusFilter)
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter)
    return list.sort((a, b) => dayjs(b.startDate).diff(dayjs(a.startDate)))
  }, [absences, statusFilter, typeFilter])

  const totalPages = Math.ceil(filteredAbsences.length / pageSize)
  const paginatedAbsences = filteredAbsences.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const displayEntitlements = useMemo(() => (snapshotEntitlements || []).filter(e => e.display), [snapshotEntitlements])

  const otherEntitlements = useMemo(
    () => (snapshotEntitlements || []).filter(e => !e.display && e.used > 0),
    [snapshotEntitlements]
  )

  const ytdAbsentDays = useMemo(() => {
    const year = dayjs().year()
    return absences
      .filter(a => a.originalStatus === 'APPROVED' && dayjs(a.startDate).year() === year)
      .reduce((sum, a) => sum + (a.workingDays || 0), 0)
  }, [absences])

  const ytdTotalWorkingDays = useMemo(() => {
    const yearStart = new Date(dayjs().year(), 0, 1)
    const yearEnd = new Date(dayjs().year(), 11, 31)
    return calculateWorkingDays(yearStart, yearEnd, {
      holidays: publicHolidays,
      excludeWeekends: true,
      workingHours: workingHours
    })
  }, [publicHolidays, workingHours])

  const [wellnessInsight, setWellnessInsight] = useState<string | null>(null)
  const [wellnessLoading, setWellnessLoading] = useState(false)
  const [wellnessRequested, setWellnessRequested] = useState(false)

  const wellnessDataSummary = useMemo(() => {
    if (absences.length === 0) return null
    const year = dayjs().year()
    const yearAbsences = absences.filter(a => a.originalStatus === 'APPROVED' && dayjs(a.startDate).year() === year)

    const sickDays = yearAbsences
      .filter(a => a.typeParentEntryId?.includes('HEALTH'))
      .reduce((sum, a) => sum + (a.workingDays || 0), 0)

    const vacationDays = yearAbsences
      .filter(a => !a.typeParentEntryId?.includes('HEALTH'))
      .reduce((sum, a) => sum + (a.workingDays || 0), 0)

    const vacationEntitlement = displayEntitlements.reduce((sum, e) => sum + e.total, 0)
    const vacationUsed = displayEntitlements.reduce((sum, e) => sum + e.used, 0)

    const sortedAbsences = [...yearAbsences].sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))
    let longestWorkStreak = 0
    let lastEnd = dayjs().startOf('year')
    for (const a of sortedAbsences) {
      const gap = dayjs(a.startDate).diff(lastEnd, 'day')
      if (gap > longestWorkStreak) longestWorkStreak = gap
      const end = dayjs(a.endDate)
      if (end.isAfter(lastEnd)) lastEnd = end
    }
    const gapToToday = dayjs().diff(lastEnd, 'day')
    if (gapToToday > longestWorkStreak) longestWorkStreak = gapToToday

    return {
      totalAbsentDays: ytdAbsentDays,
      totalWorkingDays: ytdTotalWorkingDays,
      sickDays,
      vacationDays,
      vacationEntitlement,
      vacationUsed,
      vacationRemaining: Math.max(0, vacationEntitlement - vacationUsed),
      absenceCount: yearAbsences.length,
      longestWorkStreak,
      monthsElapsed: dayjs().month() + 1
    }
  }, [absences, ytdAbsentDays, ytdTotalWorkingDays, displayEntitlements])

  const requestWellnessAnalysis = useCallback(async () => {
    if (!wellnessDataSummary || !accessToken || wellnessLoading) return
    setWellnessLoading(true)
    setWellnessRequested(true)

    const d = wellnessDataSummary
    const prompt = `You are a workplace wellness advisor. Analyze this employee's absence data for the current year and provide a brief work-life balance insight.

Data:
- ${d.monthsElapsed} months into the year
- ${d.totalAbsentDays} total absent days out of ${d.totalWorkingDays} working days (${d.totalWorkingDays > 0 ? ((d.totalAbsentDays / d.totalWorkingDays) * 100).toFixed(1) : 0}% absence rate)
- ${d.sickDays} sick leave days
- ${d.vacationDays} vacation/leave days used
- ${d.vacationEntitlement} total vacation entitlement, ${d.vacationRemaining} remaining
- ${d.absenceCount} separate absence periods
- Longest uninterrupted work streak: ${d.longestWorkStreak} days

Based on the flight risk wellness methodology:
- >20 sick days/year = very high burnout risk
- >15 sick days/year = high risk
- >10 sick days/year = medium risk
- >5 sick days/year = low risk
- Work streaks >40 days without breaks need attention

Provide a 2-3 sentence personalized wellness insight. Be encouraging but honest. If vacation entitlement is significantly underused, suggest planning time off. If sick days are elevated, gently recommend attention to wellbeing. Keep the tone supportive and empathetic. Output ONLY the insight text, no JSON, no headers.`

    try {
      const form = new FormData()
      form.append('session_id', '')
      form.append('user_input_text', prompt)
      form.append('llm_model', 'gpt-4.1')
      form.append('use_web_search_tool', 'false')
      form.append(
        'current_page_context',
        JSON.stringify({ type: 'overview', entity_name: 'employee_wellness', url: globalThis.location.href })
      )

      const response = await fetch(`${globalThis.location.origin}/flowbot/api/agent/v2/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
        body: form
      })

      if (!response.ok || !response.body) throw new Error('FlowBot request failed')

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let result = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value
        const frames = buffer.split('\n\n')
        buffer = frames.pop() || ''
        for (const frame of frames) {
          const lines = frame.split('\n')
          let eventType = ''
          let data = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7)
            else if (line.startsWith('data: ')) data = line.slice(6)
          }
          if (eventType === 'output-item' && data) {
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'answer' && parsed.displayData) {
                for (const item of parsed.displayData) {
                  if (item.type === 'textBlock' && item.text) result += item.text
                }
              }
            } catch {}
          }
        }
      }

      setWellnessInsight(
        result.trim() || 'Your absence patterns look healthy. Keep maintaining a good work-life balance!'
      )
    } catch {
      setWellnessInsight(null)
      setWellnessRequested(false)
    } finally {
      setWellnessLoading(false)
    }
  }, [wellnessDataSummary, accessToken, wellnessLoading])

  const {
    absenceList: calendarAbsenceList,
    loading: calendarLoading,
    error: calendarError
  } = useAbsenceData(employee?.id, accessToken || '', absenceEntitlements || [])

  const [calendarDate, setCalendarDate] = useState(dayjs())
  const [selectedStartDate, setSelectedStartDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<dayjs.Dayjs | null>(null)
  const [holidayDates, setHolidayDates] = useState<string[]>([])

  useEffect(() => {
    if (!employee?.id || !accessToken) return
    const gqlClient = client
    fetchHolidayDates(gqlClient, employee.id, calendarDate.year(), calendarDate.month(), getCurrentActiveUserLocale())
      .then(dates => setHolidayDates(dates))
      .catch(() => {})
  }, [employee?.id, accessToken, calendarDate])

  const startDateFmt = selectedStartDate?.format('YYYY-MM-DD') ?? ''
  const endDateFmt = selectedEndDate?.format('YYYY-MM-DD') ?? ''
  const baseRequestText = getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')
  const requestAbsenceLabel =
    startDateFmt && endDateFmt ? `${baseRequestText} (${startDateFmt} - ${endDateFmt})` : baseRequestText

  if (showCalendar && employee && absenceEntitlements) {
    return (
      <div data-testid="personal-absences-container">
        <PageLayout
          headerIcon={CalendarBlankIcon}
          headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar', 'Calendar')}
          className="gba:min-h-screen"
        >
          <div className="gba:p-4 gba:space-y-4">
            <div className="gba:flex gba:justify-between gba:items-center">
              <Button variant="outline" onClick={() => setShowCalendar(false)}>
                <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.back_to_dashboard', 'Back to Dashboard')}
              </Button>
              <AppAction
                variant="update-primary"
                key={`cal-action-${startDateFmt}-${endDateFmt}`}
                data-testid="calendar-absence-request-button"
                lazyLoad
                emptyState="enable"
                contexts={[
                  {
                    context: FlowContextName.employeeAbsenceRecord,
                    contextData: {
                      employeeId: employee.id,
                      absenceType: absenceEntitlements.find((e: any) => e.type?.id === 'AbsenceType:v1:A001')?.type?.id,
                      flowType: 'vacation',
                      startDate: startDateFmt,
                      endDate: endDateFmt
                    }
                  }
                ]}
                prefixDataTestId="calendar-absence-request"
                accessToken={accessToken || ''}
              >
                {requestAbsenceLabel}
              </AppAction>
            </div>
            <AbsenceCalendar
              absenceList={calendarAbsenceList}
              loading={calendarLoading}
              error={calendarError}
              currentDate={calendarDate}
              setCurrentDate={setCalendarDate}
              selectedStartDate={selectedStartDate}
              setSelectedStartDate={setSelectedStartDate}
              selectedEndDate={selectedEndDate}
              setSelectedEndDate={setSelectedEndDate}
              holidayDates={holidayDates}
              employeeAbsenceEntitlement={absenceEntitlements}
              employee={employee as any}
              accessToken={accessToken || ''}
            />
          </div>
        </PageLayout>
      </div>
    )
  }

  const isLoading = loading || employeeLoading

  return (
    <div data-testid="personal-absences-container">
      <PageLayout
        headerIcon={CalendarBlankIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.absence_overview', 'Absences')}
        className="gba:min-h-screen"
      >
        <div className="gba:p-4 gba:space-y-6 gba:max-w-[1400px] gba:mx-auto">
          {/* Top actions */}
          <div className="gba:flex gba:justify-between gba:items-center">
            <h2 className="gba:text-2xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.absence_overview', 'Absences')}
            </h2>
            <div className="gba:flex gba:gap-2">
              <Button variant="outline" onClick={() => setShowCalendar(true)}>
                <CalendarIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar', 'Calendar')}
              </Button>
              {absenceGroups.length > 0 && (
                <Select onValueChange={handleCreateAbsence}>
                  <SelectTrigger className="gba:w-auto">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Plus className="gba:w-4 gba:h-4" />
                      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {absenceGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {getAbsenceGroupDisplayValue(group)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* My Balance */}
          <Card>
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:text-base gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.my_balance', 'My Balance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-2">
              {isLoading ? (
                <div className="gba:space-y-2">
                  <Skeleton className="gba:h-6 gba:w-full" />
                  <Skeleton className="gba:h-6 gba:w-full" />
                </div>
              ) : (
                <>
                  <div
                    className="gba:grid gba:grid-cols-2 gba:gap-2"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
                  >
                    {displayEntitlements.map((ent, i) => (
                      <div key={`display-${i}`} className="gba:rounded gba:border gba:px-3 gba:py-2 gba:space-y-1.5">
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mr-2">
                            {ent.type}
                          </span>
                          <span className="gba:font-semibold gba:whitespace-nowrap">
                            {ent.used}{' '}
                            <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">/ {ent.total}</span>{' '}
                            <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:absence_module.limited_pending_days_text.days',
                                'days'
                              )}
                            </span>
                          </span>
                        </div>
                        <Progress value={ent.total > 0 ? (ent.used / ent.total) * 100 : 0} className="gba:h-1.5" />
                      </div>
                    ))}
                    {otherEntitlements.map((ent, i) => (
                      <div
                        key={`other-${i}`}
                        className="gba:flex gba:items-center gba:justify-between gba:rounded gba:border gba:px-3 gba:py-2"
                      >
                        <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mr-2">{ent.type}</span>
                        <span className="gba:font-semibold gba:whitespace-nowrap">
                          {ent.used}{' '}
                          <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_module.limited_pending_days_text.days',
                              'days'
                            )}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="gba:space-y-1">
                    <div className="gba:flex gba:justify-between gba:text-sm">
                      <span className="gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.year_to_date', 'Year to Date')}:
                      </span>
                      <span className="gba:font-medium">
                        {ytdAbsentDays}{' '}
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absent_days', 'Absent')} /{' '}
                        {ytdTotalWorkingDays}{' '}
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.working_days', 'Working Days')}
                      </span>
                    </div>
                    <Progress
                      value={ytdTotalWorkingDays > 0 ? (ytdAbsentDays / ytdTotalWorkingDays) * 100 : 0}
                      className="gba:h-2"
                    />
                  </div>
                  <div className="gba:mt-2">
                    {wellnessInsight ? (
                      <div className="gba:flex gba:gap-2 gba:rounded gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-3 gba:py-2">
                        <Sparkles className="gba:w-4 gba:h-4 gba:text-primary gba:shrink-0 gba:mt-0.5" />
                        <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{wellnessInsight}</p>
                      </div>
                    ) : wellnessLoading ? (
                      <div className="gba:flex gba:gap-2 gba:rounded gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-3 gba:py-2">
                        <Sparkles className="gba:w-4 gba:h-4 gba:text-primary gba:shrink-0 gba:animate-pulse" />
                        <Skeleton className="gba:h-4 gba:w-full" />
                      </div>
                    ) : wellnessDataSummary && !wellnessRequested ? (
                      <button
                        onClick={requestWellnessAnalysis}
                        className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-primary hover:gba:text-primary/80 gba:transition-colors"
                      >
                        <Sparkles className="gba:w-3.5 gba:h-3.5" />
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.ai_wellness_insight',
                          'AI Wellness Insight'
                        )}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Absences + Pending Requests side-by-side */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Upcoming Absences */}
            <Card>
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-base gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.upcoming_absences', 'Upcoming Absences')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:space-y-2">
                    <Skeleton className="gba:h-6 gba:w-full" />
                    <Skeleton className="gba:h-6 gba:w-full" />
                  </div>
                ) : (
                  <div className="gba:space-y-2">
                    {upcomingAbsences.length === 0 && !nextHoliday && (
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                          'No upcoming absences'
                        )}
                      </p>
                    )}
                    {upcomingAbsences.map(a => (
                      <div
                        key={a.id}
                        className="gba:flex gba:items-center gba:gap-3 gba:rounded gba:border gba:px-3 gba:py-2"
                      >
                        <div
                          className="gba:w-2 gba:h-2 gba:rounded-full gba:shrink-0"
                          style={{ backgroundColor: `#${a.typeColor}` }}
                        />
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:text-sm gba:font-medium gba:truncate">
                            {dayjs(a.startDate).format('MMM D')}
                            {a.startDate !== a.endDate && ` – ${dayjs(a.endDate).format('MMM D, YYYY')}`}
                            {a.startDate === a.endDate && `, ${dayjs(a.startDate).format('YYYY')}`}
                            {' – '}
                            {a.type}
                          </p>
                        </div>
                        <Badge variant="success">{getAbsenceStatusLabel('APPROVED')}</Badge>
                      </div>
                    ))}
                    {nextHoliday && (
                      <div className="gba:rounded gba:border gba:px-3 gba:py-2 gba:bg-muted/30">
                        <p className="gba:text-xs gba:text-muted-foreground gba:font-medium gba:mb-1">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.company_holiday', 'Company Holiday')}
                        </p>
                        <p className="gba:text-sm gba:font-medium">
                          {nextHoliday.name} — {nextHoliday.date.format('MMM D, YYYY')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card>
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-base gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.pending_requests', 'Pending Requests')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:space-y-2">
                    <Skeleton className="gba:h-6 gba:w-full" />
                    <Skeleton className="gba:h-6 gba:w-full" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                      'No pending requests'
                    )}
                  </p>
                ) : (
                  <div className="gba:space-y-2">
                    {pendingRequests.slice(0, 4).map(a => (
                      <div
                        key={a.id}
                        className="gba:flex gba:items-center gba:justify-between gba:rounded gba:border gba:px-3 gba:py-2"
                      >
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:text-sm gba:font-medium">{dayjs(a.startDate).format('MMM D, YYYY')}</p>
                          <p className="gba:text-xs gba:text-muted-foreground">{a.type}</p>
                        </div>
                        <Badge variant="pending">{getAbsenceStatusLabel('PENDING')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* My Absence History */}
          <Card>
            <CardHeader>
              <div className="gba:flex gba:flex-col sm:gba:flex-row sm:gba:items-center sm:gba:justify-between gba:gap-3">
                <CardTitle className="gba:text-base gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.my_absence_history', 'My Absence History')}
                </CardTitle>
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  <Select
                    value={typeFilter}
                    onValueChange={v => {
                      setTypeFilter(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="gba:w-[140px] gba:h-8 gba:text-sm">
                      <SelectValue
                        placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.all_types', 'All Types')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.all_types', 'All Types')}
                      </SelectItem>
                      {typeOptions.map(t => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={v => {
                      setStatusFilter(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="gba:w-[140px] gba:h-8 gba:text-sm">
                      <SelectValue
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.status_all',
                          'Status: All'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.status_all', 'All')}
                      </SelectItem>
                      <SelectItem value="PENDING">{getAbsenceStatusLabel('PENDING')}</SelectItem>
                      <SelectItem value="APPROVED">{getAbsenceStatusLabel('APPROVED')}</SelectItem>
                      <SelectItem value="REJECTED">{getAbsenceStatusLabel('REJECTED')}</SelectItem>
                      <SelectItem value="CANCELLED">{getAbsenceStatusLabel('CANCELLED')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="gba:space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="gba:h-10 gba:w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive gba:py-4">
                  <AlertCircle className="gba:w-4 gba:h-4" />
                  <span>{error}</span>
                </div>
              ) : filteredAbsences.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                    'No data found'
                  )}
                </p>
              ) : (
                <>
                  <div className="gba:overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Date')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.type', 'Type')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:team_expenses_page.plan_details.duration',
                              'Duration'
                            )}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.status', 'Status')}
                          </TableHead>
                          <TableHead>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.description', 'Comments')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAbsences.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="gba:whitespace-nowrap">
                              {dayjs(a.startDate).format('MMM D')}
                              {a.startDate !== a.endDate && ` – ${dayjs(a.endDate).format('MMM D, YYYY')}`}
                              {a.startDate === a.endDate && `, ${dayjs(a.startDate).format('YYYY')}`}
                            </TableCell>
                            <TableCell>
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <div
                                  className="gba:w-2 gba:h-2 gba:rounded-full gba:shrink-0"
                                  style={{ backgroundColor: `#${a.typeColor}` }}
                                />
                                {a.type}
                              </div>
                            </TableCell>
                            <TableCell>
                              {a.workingDays}{' '}
                              {a.workingDays === 1
                                ? getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:absence_module.limited_pending_days_text.day',
                                    'day'
                                  )
                                : getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:absence_module.limited_pending_days_text.days',
                                    'days'
                                  )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(a.originalStatus)}>{a.status}</Badge>
                            </TableCell>
                            <TableCell className="gba:max-w-[200px] gba:truncate">{a.description || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="gba:flex gba:items-center gba:justify-between gba:pt-4">
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {filteredAbsences.length}{' '}
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'absences')}
                      </span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                        >
                          <ChevronLeft className="gba:w-4 gba:h-4" />
                        </Button>
                        <span className="gba:text-sm">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                        >
                          <ChevronRight className="gba:w-4 gba:h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
  )
}

export default PersonalAbsences
