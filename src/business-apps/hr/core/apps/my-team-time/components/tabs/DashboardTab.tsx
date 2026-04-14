import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  UsersThreeIcon,
  ClockIcon,
  CalendarIcon,
  BriefcaseIcon,
  HeartbeatIcon,
  WarningIcon,
  TimerIcon,
  FileTextIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@phosphor-icons/react'
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamOperationalStatus } from '../../hooks/useTeamOperationalStatus'
import { useTeamPendingActions } from '../../hooks/useTeamPendingActions'
import { useTeamCapacity } from '../../hooks/useTeamCapacity'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamMember, TeamAbsenceToday, CapacityRow } from '../../types/types'
import {
  formatMinutes,
  toDateString,
  toLocalDateKey,
  isWorkingDay,
  getPlannedMinutesForDate
} from '../../utils/timeUtils'
import { toAvatarSrc, goToProfile } from '../../utils/employeeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  expandDateRange,
  fetchTeamDetailedAbsences,
  fetchTeamHolidayData,
  getActiveLocale,
  isSickAbsence,
  isWorkAbsence
} from '../../utils/teamTimeDomain'

type PanelType =
  | 'team-size'
  | 'working-now'
  | 'not-clocked-in'
  | 'on-leave'
  | 'work-away'
  | 'sick-today'
  | 'overtime-mtd'
  | 'anomalies'
  | 'pending'
  | 'forecast-day'
  | null

type KpiTone = 'success' | 'warning' | 'info' | 'destructive' | 'muted'

const t = (key: string, fallback: string, vars?: Record<string, unknown>) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:my_team_time.${key}`, fallback, vars)

const KPI_TONE_CLASSES: Record<KpiTone, { icon: string; value: string }> = {
  success: {
    icon: 'gba:bg-success/10 gba:text-success',
    value: 'gba:text-success'
  },
  warning: {
    icon: 'gba:bg-warning/10 gba:text-warning',
    value: 'gba:text-warning'
  },
  info: {
    icon: 'gba:bg-info/10 gba:text-info',
    value: 'gba:text-info'
  },
  destructive: {
    icon: 'gba:bg-destructive/10 gba:text-destructive',
    value: 'gba:text-destructive'
  },
  muted: {
    icon: 'gba:bg-muted gba:text-muted-foreground',
    value: 'gba:text-foreground'
  }
}

const DAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, index + 1))
)

const formatShortDayCount = (count: number): string => t('days_short', '{{count}}d', { count })

const getUniqueAbsencesByEmployee = (absences: TeamAbsenceToday[]): TeamAbsenceToday[] => {
  return Array.from(new Map(absences.map(absence => [absence.employeeId, absence])).values())
}

const formatAbsencePeriod = (absence: Pick<TeamAbsenceToday, 'startDate' | 'endDate'>): string => {
  if (!absence.startDate || !absence.endDate) {
    return ''
  }

  const startLabel = new Date(absence.startDate).toLocaleDateString()
  const endLabel = new Date(absence.endDate).toLocaleDateString()
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  tone: KpiTone
  active: boolean
  onClick: () => void
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, tone, active, onClick }) => (
  <Card
    className={`gba:cursor-pointer gba:border gba:transition-colors hover:gba:bg-muted/20 ${
      active ? 'gba:ring-2 gba:ring-primary gba:border-primary' : 'gba:border-border'
    }`}
    onClick={onClick}
    data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="gba:p-3">
      <div className="gba:flex gba:items-center gba:gap-2.5">
        <div
          className={`gba:flex gba:h-8 gba:w-8 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:text-base ${KPI_TONE_CLASSES[tone].icon}`}
        >
          {icon}
        </div>
        <div className="gba:min-w-0">
          <div className={`gba:text-xl gba:font-bold gba:leading-tight ${KPI_TONE_CLASSES[tone].value}`}>{value}</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:leading-tight gba:truncate">{label}</div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const EmployeeAvatar: React.FC<{ firstName?: string; lastName?: string; pictureThumbnail?: string; size?: string }> = ({
  firstName,
  lastName,
  pictureThumbnail,
  size = 'gba:h-8 gba:w-8'
}) => (
  <Avatar className={`${size} gba:flex-shrink-0`}>
    {pictureThumbnail && <AvatarImage src={toAvatarSrc(pictureThumbnail)} alt={`${firstName} ${lastName}`} />}
    <AvatarFallback className="gba:text-xs gba:font-medium">
      {firstName?.[0]}
      {lastName?.[0]}
    </AvatarFallback>
  </Avatar>
)

const EmployeeName: React.FC<{ id: string; firstName?: string; lastName?: string; className?: string }> = ({
  id,
  firstName,
  lastName,
  className = 'gba:text-sm gba:font-medium gba:truncate'
}) => (
  <button
    type="button"
    className={`${className} gba:text-left hover:gba:text-primary hover:gba:underline gba:transition-colors gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0`}
    onClick={e => {
      e.stopPropagation()
      goToProfile(id)
    }}
  >
    {firstName} {lastName}
  </button>
)

const MemberList: React.FC<{ members: TeamMember[]; emptyText: string }> = ({ members, emptyText }) => {
  if (members.length === 0) {
    return <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">{emptyText}</div>
  }
  return (
    <div className="gba:divide-y gba:divide-border">
      {members.map(m => (
        <div key={m.id} className="gba:flex gba:items-center gba:gap-3 gba:py-2.5">
          <EmployeeAvatar firstName={m.firstName} lastName={m.lastName} pictureThumbnail={m.pictureThumbnail} />
          <div className="gba:min-w-0">
            <EmployeeName id={m.id} firstName={m.firstName} lastName={m.lastName} />
            {m.orgUnit && <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{m.orgUnit}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

type SortKey = 'name' | 'worked' | 'overtime' | 'deficit' | 'balance' | 'missing'
type SortDir = 'asc' | 'desc'

const HighlightCell: React.FC<{
  value: number
  threshold: number
  format: (v: number) => string
  invert?: boolean
}> = ({ value, threshold, format, invert = false }) => {
  const isOver = invert ? value < threshold : value > threshold
  return <span className={isOver ? 'gba:text-destructive gba:font-semibold' : ''}>{format(value)}</span>
}

const SortHeader: React.FC<{
  label: string
  sortKeyValue: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}> = ({ label, sortKeyValue, sortKey, sortDir, onSort }) => (
  <th
    className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:cursor-pointer gba:select-none hover:gba:text-foreground gba:transition-colors gba:whitespace-nowrap"
    onClick={() => onSort(sortKeyValue)}
  >
    <span className="gba:flex gba:items-center gba:gap-1">
      {label}
      {sortKey === sortKeyValue &&
        (sortDir === 'asc' ? (
          <ArrowUpIcon className="gba:h-3 gba:w-3" />
        ) : (
          <ArrowDownIcon className="gba:h-3 gba:w-3" />
        ))}
    </span>
  </th>
)

const getBalanceClass = (minutes: number): string => {
  if (minutes < 0) return 'gba:text-destructive gba:font-semibold'
  if (minutes > 0) return 'gba:text-success'
  return ''
}

const getHeatmapColor = (pct: number): string => {
  if (pct >= 90) return 'gba:bg-success/25 gba:text-success'
  if (pct >= 80) return 'gba:bg-success/15 gba:text-success'
  if (pct >= 60) return 'gba:bg-warning/20 gba:text-warning'
  return 'gba:bg-destructive/20 gba:text-destructive'
}

const getProgressColor = (pct: number): string => {
  if (pct >= 80) return 'var(--nw-success)'
  if (pct >= 60) return 'var(--nw-warning)'
  return 'var(--nw-destructive)'
}

export const DashboardTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, isLoading: membersLoading } = useTeamMembers(props)
  const {
    status,
    todayAttendance,
    todayAbsences,
    monthAttendance,
    isLoading: statusLoading
  } = useTeamOperationalStatus(props.accessToken, members, memberIds)
  const { pendingActions, isLoading: pendingLoading } = useTeamPendingActions(props, members)

  const {
    rows: capacityRows,
    currentMonth,
    prevMonth,
    nextMonth,
    isLoading: capacityLoading,
    error: capacityError
  } = useTeamCapacity(props.accessToken, members, memberIds, monthAttendance)

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const graphqlClient = useGraphQLClient(props.accessToken)
  const [forecastAbsences, setForecastAbsences] = useState<TeamAbsenceToday[]>([])
  const [forecastHolidayDatesByEmployeeId, setForecastHolidayDatesByEmployeeId] = useState<Map<string, Set<string>>>(
    new Map()
  )
  const [forecastHolidayNamesByEmployeeId, setForecastHolidayNamesByEmployeeId] = useState<
    Map<string, Record<string, string>>
  >(new Map())
  const [forecastLoading, setForecastLoading] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [selectedForecastDay, setSelectedForecastDay] = useState<string | null>(null)

  const [forecastMonth, setForecastMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const forecastMonthLabel = forecastMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  const prevForecastMonth = useCallback(() => {
    setForecastMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])
  const nextForecastMonth = useCallback(() => {
    setForecastMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  const fetchForecast = useCallback(async () => {
    if (!graphqlClient || memberIds.length === 0) return
    setForecastLoading(true)
    try {
      const monthStart = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth(), 1)
      const monthEnd = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth() + 1, 0)
      const dow = monthStart.getDay()
      const calStart = new Date(monthStart)
      calStart.setDate(monthStart.getDate() - ((dow + 6) % 7))
      const calEnd = new Date(monthEnd)
      const endDow = monthEnd.getDay()
      if (endDow !== 0) calEnd.setDate(monthEnd.getDate() + (7 - endDow))

      const from = toDateString(calStart)
      const to = toDateString(calEnd)
      const locale = getActiveLocale()

      const [detailedAbsences, holidayData] = await Promise.all([
        fetchTeamDetailedAbsences(graphqlClient, memberIds, from, to, locale),
        fetchTeamHolidayData(graphqlClient, memberIds, from, to, locale)
      ])

      setForecastAbsences(
        detailedAbsences.flatMap(absence =>
          expandDateRange(absence.startDate, absence.endDate, from, to).map(dayDate => ({
            employeeId: absence.employeeId,
            typeRef: absence.typeRef,
            status: absence.status,
            dayDate,
            employeeAbsenceId: absence.id,
            typeLabel: absence.typeLabel,
            parentEntryId: absence.parentEntryId,
            startDate: absence.startDate,
            endDate: absence.endDate,
            employeeName: absence.employeeName,
            pictureThumbnail: absence.pictureThumbnail
          }))
        )
      )
      setForecastHolidayDatesByEmployeeId(holidayData.datesByEmployeeId)
      setForecastHolidayNamesByEmployeeId(holidayData.namesByEmployeeId)
    } catch {
      // secondary data, don't block
    } finally {
      setForecastLoading(false)
    }
  }, [graphqlClient, memberIds.join(','), forecastMonth])

  useEffect(() => {
    if (props.accessToken && memberIds.length > 0) fetchForecast()
  }, [props.accessToken, memberIds.join(','), fetchForecast])

  const isLoading = membersLoading || statusLoading

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => (prev === panel ? null : panel))
  }

  const getForecastCell = (date: string): { available: number; total: number; pct: number } => {
    const total = members.filter(member => {
      if (!isWorkingDay(date, member.workingHours)) {
        return false
      }

      return !forecastHolidayDatesByEmployeeId.get(member.id)?.has(date)
    }).length
    const absentIds = new Set(
      forecastAbsences
        .filter(absence => absence.dayDate === date && absence.status === 'APPROVED' && !isWorkAbsence(absence))
        .map(absence => absence.employeeId)
    )
    const available = Math.max(0, total - absentIds.size)
    const pct = total > 0 ? Math.round((available / total) * 100) : 100
    return { available, total, pct }
  }

  const buildCalendarWeeks = (): { weekLabel: string; days: { date: string; dayOfWeek: number }[] }[] => {
    const weeks: { weekLabel: string; days: { date: string; dayOfWeek: number }[] }[] = []
    const monthStart = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth(), 1)
    const monthEnd = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth() + 1, 0)

    const dow = monthStart.getDay()
    const firstMonday = new Date(monthStart)
    firstMonday.setDate(monthStart.getDate() - ((dow + 6) % 7))

    const cursor = new Date(firstMonday)
    while (cursor <= monthEnd) {
      const weekStart = new Date(cursor)
      const weekEnd = new Date(cursor)
      weekEnd.setDate(cursor.getDate() + 6)

      const startDay = weekStart.getDate()
      const endDay = weekEnd.getDate()
      const startMonth = weekStart.toLocaleDateString(undefined, { month: 'short' })
      const endMonth = weekEnd.toLocaleDateString(undefined, { month: 'short' })
      const weekLabel =
        startMonth === endMonth
          ? `${startDay} - ${endDay} ${startMonth}`
          : `${startDay} ${startMonth} - ${endDay} ${endMonth}`

      const days: { date: string; dayOfWeek: number }[] = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + d)
        days.push({ date: toLocalDateKey(day), dayOfWeek: d })
      }

      weeks.push({ weekLabel, days })
      cursor.setDate(cursor.getDate() + 7)
    }

    return weeks
  }

  const calendarWeeks = buildCalendarWeeks()
  const todayStr = toLocalDateKey(new Date())

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const getSortValue = (row: CapacityRow, key: SortKey): number | string => {
    switch (key) {
      case 'name':
        return `${row.employee.firstName} ${row.employee.lastName}`
      case 'worked':
        return row.workedMinutes
      case 'overtime':
        return row.overtimeMinutes
      case 'deficit':
        return row.deficitMinutes
      case 'balance':
        return row.netBalanceMinutes
      case 'missing':
        return row.missingEntries
      default:
        return 0
    }
  }

  const sortedRows = [...capacityRows].sort((a, b) => {
    const va = getSortValue(a, sortKey)
    const vb = getSortValue(b, sortKey)
    const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const monthLabel = currentMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  const pendingActionCount = pendingActions.length
  const todayAttendanceByEmployee = new Map(todayAttendance.map(entry => [entry.employeeId, entry]))
  const latestClosedAttendanceByEmployee = new Map<string, (typeof monthAttendance)[number]>()

  monthAttendance.forEach(entry => {
    if (!entry.endTime || latestClosedAttendanceByEmployee.has(entry.employeeId)) {
      return
    }

    latestClosedAttendanceByEmployee.set(entry.employeeId, entry)
  })

  const leaveAbsences = getUniqueAbsencesByEmployee(
    todayAbsences.filter(absence => !isSickAbsence(absence) && !isWorkAbsence(absence))
  )
  const workAbsences = getUniqueAbsencesByEmployee(todayAbsences.filter(absence => isWorkAbsence(absence)))
  const sickAbsences = getUniqueAbsencesByEmployee(todayAbsences.filter(absence => isSickAbsence(absence)))
  const overtimeRows = [...capacityRows]
    .filter(row => row.overtimeMinutes > 0)
    .sort((left, right) => right.overtimeMinutes - left.overtimeMinutes)
  const selectedForecastDateLabel = selectedForecastDay
    ? new Date(`${selectedForecastDay}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : ''
  const forecastAvailableMembers = selectedForecastDay
    ? members.filter(member => {
        if (!isWorkingDay(selectedForecastDay, member.workingHours)) {
          return false
        }

        if (forecastHolidayDatesByEmployeeId.get(member.id)?.has(selectedForecastDay)) {
          return false
        }

        return !forecastAbsences.some(
          absence =>
            absence.employeeId === member.id &&
            absence.dayDate === selectedForecastDay &&
            absence.status === 'APPROVED' &&
            !isWorkAbsence(absence)
        )
      })
    : []
  const forecastUnavailableMembers = selectedForecastDay
    ? members.flatMap(member => {
        if (!isWorkingDay(selectedForecastDay, member.workingHours)) {
          return []
        }

        const holidayLabel = forecastHolidayNamesByEmployeeId.get(member.id)?.[selectedForecastDay]
        if (holidayLabel) {
          return [{ member, reason: holidayLabel }]
        }

        const absence = forecastAbsences.find(
          item =>
            item.employeeId === member.id &&
            item.dayDate === selectedForecastDay &&
            item.status === 'APPROVED' &&
            !isWorkAbsence(item)
        )

        if (!absence) {
          return []
        }

        const periodLabel = formatAbsencePeriod(absence)
        return [
          {
            member,
            reason: periodLabel
              ? `${absence.typeLabel || absence.typeRef} · ${periodLabel}`
              : absence.typeLabel || absence.typeRef
          }
        ]
      })
    : []

  const getPanelTitle = (): string => {
    switch (activePanel) {
      case 'team-size':
        return t('total_subordinate_employees', 'Total Subordinate Employees')
      case 'working-now':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.working_now', 'Working Now')
      case 'not-clocked-in':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.not_clocked_in', 'Not Clocked In')
      case 'on-leave':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.on_leave_today', 'On Leave Today')
      case 'work-away':
        return t('work_away_today', 'Work Away Today')
      case 'sick-today':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_today', 'Sick Today')
      case 'overtime-mtd':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime_mtd', 'Overtime MTD')
      case 'anomalies':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.active_anomalies', 'Active Anomalies')
      case 'pending':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pending_actions', 'Pending Actions')
      case 'forecast-day':
        return t('forecast_day_details', 'Capacity Forecast Details')
      default:
        return ''
    }
  }

  const getPanelDescription = (): string => {
    switch (activePanel) {
      case 'team-size':
        return t('desc_total_subordinates', 'Direct reports included in this dashboard')
      case 'working-now':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_working_now',
          'Team members currently clocked in'
        )
      case 'not-clocked-in':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_not_clocked_in',
          'Expected today but no attendance record yet'
        )
      case 'on-leave':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_on_leave',
          'On approved leave today (excluding sick and WORK absences)'
        )
      case 'work-away':
        return t('desc_work_away', 'Employees marked with WORK absences such as remote work or business trips')
      case 'sick-today':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_sick_today',
          'On approved sick leave today'
        )
      case 'overtime-mtd':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_overtime_mtd',
          'Total overtime accumulated across the team this month'
        )
      case 'anomalies':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_anomalies',
          'Missing logs, unclosed clock-outs, and other issues'
        )
      case 'pending':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.desc_pending',
          'Absence requests and time corrections awaiting your review'
        )
      case 'forecast-day':
        return selectedForecastDateLabel
      default:
        return ''
    }
  }

  const getPanelIcon = (): React.ReactNode => {
    switch (activePanel) {
      case 'team-size':
        return <UsersThreeIcon size={20} />
      case 'working-now':
        return <UsersThreeIcon size={20} />
      case 'not-clocked-in':
        return <ClockIcon size={20} />
      case 'on-leave':
        return <CalendarIcon size={20} />
      case 'work-away':
        return <BriefcaseIcon size={20} />
      case 'sick-today':
        return <HeartbeatIcon size={20} />
      case 'overtime-mtd':
        return <TimerIcon size={20} />
      case 'anomalies':
        return <WarningIcon size={20} />
      case 'pending':
        return <FileTextIcon size={20} />
      case 'forecast-day':
        return <CalendarIcon size={20} />
      default:
        return undefined
    }
  }

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'team-size':
        return <MemberList members={members} emptyText={t('no_subordinates_found', 'No direct reports found.')} />
      case 'working-now':
        return (
          <div className="gba:divide-y gba:divide-border">
            {status.workingNow.length === 0 ? (
              <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:my_team_time.no_one_clocked_in',
                  'No one is clocked in right now.'
                )}
              </div>
            ) : (
              status.workingNow.map(member => {
                const entry = todayAttendanceByEmployee.get(member.id)
                const plannedMinutes = isWorkingDay(todayStr, member.workingHours)
                  ? formatMinutes(getPlannedMinutesForDate(todayStr, member.workingHours))
                  : '—'

                return (
                  <div key={member.id} className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:py-3">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                      <EmployeeAvatar
                        firstName={member.firstName}
                        lastName={member.lastName}
                        pictureThumbnail={member.pictureThumbnail}
                      />
                      <div className="gba:min-w-0">
                        <EmployeeName id={member.id} firstName={member.firstName} lastName={member.lastName} />
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                          {t('clocked_in_at', 'Clocked in at')}{' '}
                          {entry?.startTime
                            ? new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="gba:text-right gba:text-xs gba:text-muted-foreground">
                      {t('planned_today', 'Planned today')}: {entry?.plannedTime || plannedMinutes}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )
      case 'not-clocked-in':
        return (
          <div className="gba:divide-y gba:divide-border">
            {status.notClockedIn.length === 0 ? (
              <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:my_team_time.everyone_clocked_in',
                  'Everyone expected today has clocked in.'
                )}
              </div>
            ) : (
              status.notClockedIn.map(member => {
                const lastEntry = latestClosedAttendanceByEmployee.get(member.id)
                const sinceLabel = lastEntry?.endTime
                  ? `${new Date(lastEntry.attendanceDate).toLocaleDateString()} ${new Date(
                      lastEntry.endTime
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  : t('no_recent_clock_out', 'No recent clock-out recorded')

                return (
                  <div key={member.id} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
                    <EmployeeAvatar
                      firstName={member.firstName}
                      lastName={member.lastName}
                      pictureThumbnail={member.pictureThumbnail}
                    />
                    <div className="gba:min-w-0">
                      <EmployeeName id={member.id} firstName={member.firstName} lastName={member.lastName} />
                      <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                        {t('clocked_out_since', 'Clocked out since')} {sinceLabel}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )
      case 'on-leave':
        return (
          <div className="gba:divide-y gba:divide-border">
            {leaveAbsences.length === 0 ? (
              <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:my_team_time.no_one_on_leave',
                  'No one is on leave today.'
                )}
              </div>
            ) : (
              leaveAbsences.map(absence => (
                <div key={absence.employeeAbsenceId} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
                  <EmployeeAvatar
                    firstName={absence.employeeName?.split(' ')[0]}
                    lastName={absence.employeeName?.split(' ').slice(1).join(' ')}
                    pictureThumbnail={absence.pictureThumbnail}
                  />
                  <div className="gba:min-w-0">
                    <EmployeeName
                      id={absence.employeeId}
                      firstName={absence.employeeName?.split(' ')[0]}
                      lastName={absence.employeeName?.split(' ').slice(1).join(' ')}
                    />
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {absence.typeLabel || absence.typeRef}{' '}
                      {formatAbsencePeriod(absence) ? `· ${formatAbsencePeriod(absence)}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      case 'work-away':
        return (
          <div className="gba:divide-y gba:divide-border">
            {workAbsences.length === 0 ? (
              <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                {t('no_one_work_away', 'No one has a WORK absence today.')}
              </div>
            ) : (
              workAbsences.map(absence => (
                <div key={absence.employeeAbsenceId} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
                  <EmployeeAvatar
                    firstName={absence.employeeName?.split(' ')[0]}
                    lastName={absence.employeeName?.split(' ').slice(1).join(' ')}
                    pictureThumbnail={absence.pictureThumbnail}
                  />
                  <div className="gba:min-w-0">
                    <EmployeeName
                      id={absence.employeeId}
                      firstName={absence.employeeName?.split(' ')[0]}
                      lastName={absence.employeeName?.split(' ').slice(1).join(' ')}
                    />
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {absence.typeLabel || absence.typeRef}{' '}
                      {formatAbsencePeriod(absence) ? `· ${formatAbsencePeriod(absence)}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      case 'sick-today':
        return (
          <div className="gba:divide-y gba:divide-border">
            {sickAbsences.length === 0 ? (
              <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:my_team_time.no_one_sick',
                  'No one is on sick leave today.'
                )}
              </div>
            ) : (
              sickAbsences.map(absence => (
                <div key={absence.employeeAbsenceId} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
                  <EmployeeAvatar
                    firstName={absence.employeeName?.split(' ')[0]}
                    lastName={absence.employeeName?.split(' ').slice(1).join(' ')}
                    pictureThumbnail={absence.pictureThumbnail}
                  />
                  <div className="gba:min-w-0">
                    <EmployeeName
                      id={absence.employeeId}
                      firstName={absence.employeeName?.split(' ')[0]}
                      lastName={absence.employeeName?.split(' ').slice(1).join(' ')}
                    />
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {absence.typeLabel || absence.typeRef}{' '}
                      {formatAbsencePeriod(absence) ? `· ${formatAbsencePeriod(absence)}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      case 'overtime-mtd':
        if (overtimeRows.length === 0) {
          return (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
              {t('no_team_overtime', 'No overtime recorded this month.')}
            </div>
          )
        }
        return (
          <div className="gba:divide-y gba:divide-border">
            {overtimeRows.map(row => (
              <div key={row.employee.id} className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:py-3">
                <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                  <EmployeeAvatar
                    firstName={row.employee.firstName}
                    lastName={row.employee.lastName}
                    pictureThumbnail={row.employee.pictureThumbnail}
                  />
                  <EmployeeName
                    id={row.employee.id}
                    firstName={row.employee.firstName}
                    lastName={row.employee.lastName}
                  />
                </div>
                <span className="gba:text-sm gba:font-medium gba:text-warning">
                  {formatMinutes(row.overtimeMinutes)}
                </span>
              </div>
            ))}
          </div>
        )
      case 'anomalies':
        if (status.anomalies.length === 0) {
          return (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_anomalies', 'No anomalies detected.')}
            </div>
          )
        }
        return (
          <div className="gba:space-y-2">
            {status.anomalies.map((anomaly, idx) => (
              <div
                key={`${anomaly.employeeId}-${anomaly.type}-${idx}`}
                className="gba:py-2.5 gba:px-3 gba:rounded-md gba:bg-destructive/5 gba:border gba:border-destructive/20"
              >
                <div className="gba:flex gba:items-center gba:justify-between">
                  <EmployeeName
                    id={anomaly.employeeId}
                    firstName={anomaly.employeeName.split(' ')[0]}
                    lastName={anomaly.employeeName.split(' ').slice(1).join(' ')}
                    className="gba:font-medium gba:text-sm"
                  />
                  <span className="gba:text-xs gba:text-muted-foreground">{anomaly.date}</span>
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{anomaly.description}</div>
              </div>
            ))}
          </div>
        )
      case 'pending':
        if (pendingLoading) {
          return (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
            </div>
          )
        }
        if (pendingActions.length === 0) {
          return (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:my_team_time.no_pending_actions',
                'No pending actions. All caught up!'
              )}
            </div>
          )
        }
        return (
          <div className="gba:divide-y gba:divide-border">
            {pendingActions.map(action => (
              <div key={action.id} className="gba:flex gba:items-center gba:justify-between gba:py-3">
                <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                  <EmployeeAvatar
                    firstName={action.employee.firstName}
                    lastName={action.employee.lastName}
                    pictureThumbnail={action.employee.pictureThumbnail}
                  />
                  <div className="gba:min-w-0">
                    <EmployeeName
                      id={action.employee.id}
                      firstName={action.employee.firstName}
                      lastName={action.employee.lastName}
                      className="gba:font-medium gba:text-sm gba:truncate"
                    />
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {action.kind === 'absence'
                        ? `${action.typeLabel || t('absence_request', 'Absence request')} · ${
                            action.effectiveDays
                              ? formatShortDayCount(action.effectiveDays)
                              : `${new Date(action.startDate || '').toLocaleDateString()} – ${new Date(action.endDate || '').toLocaleDateString()}`
                          }`
                        : `${t('time_correction_request', 'Time correction request')} · ${new Date(
                            action.attendanceDate || action.createdAt
                          ).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="gba:text-warning gba:border-warning gba:flex-shrink-0 gba:ml-2">
                  {t('pending', 'Pending')}
                </Badge>
              </div>
            ))}
          </div>
        )
      case 'forecast-day':
        if (!selectedForecastDay) {
          return null
        }

        return (
          <div className="gba:space-y-4">
            <div>
              <div className="gba:mb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                {t('expected_available', 'Expected available')}
              </div>
              {forecastAvailableMembers.length === 0 ? (
                <div className="gba:text-sm gba:text-muted-foreground">
                  {t('no_one_available', 'No one available.')}
                </div>
              ) : (
                <MemberList members={forecastAvailableMembers} emptyText="" />
              )}
            </div>
            <div>
              <div className="gba:mb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                {t('expected_off', 'Expected off')}
              </div>
              {forecastUnavailableMembers.length === 0 ? (
                <div className="gba:text-sm gba:text-muted-foreground">
                  {t('no_one_off', 'No one is off that day.')}
                </div>
              ) : (
                <div className="gba:divide-y gba:divide-border">
                  {forecastUnavailableMembers.map(({ member, reason }) => (
                    <div key={member.id} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
                      <EmployeeAvatar
                        firstName={member.firstName}
                        lastName={member.lastName}
                        pictureThumbnail={member.pictureThumbnail}
                      />
                      <div className="gba:min-w-0">
                        <EmployeeName id={member.id} firstName={member.firstName} lastName={member.lastName} />
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground" data-testid="my-team-time-dashboard-loading">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }

  let capacityContent: React.ReactNode
  if (capacityLoading) {
    capacityContent = (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  } else if (capacityError) {
    capacityContent = <div className="gba:text-center gba:py-12 gba:text-destructive">{capacityError}</div>
  } else if (sortedRows.length === 0) {
    capacityContent = (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_data_available', 'No data available.')}
      </div>
    )
  } else {
    capacityContent = (
      <div className="gba:overflow-x-auto">
        <table className="gba:w-full gba:text-left gba:text-sm">
          <thead>
            <tr className="gba:border-b gba:border-border gba:bg-muted/30">
              <SortHeader
                label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.employee', 'Employee')}
                sortKeyValue="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
                {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.target', 'Target')}
              </th>
              <SortHeader
                label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.worked', 'Worked')}
                sortKeyValue="worked"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime', 'Overtime')}
                sortKeyValue="overtime"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.deficit', 'Deficit')}
                sortKeyValue="deficit"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
                {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pto_used', 'PTO Used')}
              </th>
              <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
                {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_days', 'Sick Days')}
              </th>
              <SortHeader
                label={t('overall_balance', 'Overall Balance')}
                sortKeyValue="balance"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.missing', 'Missing')}
                sortKeyValue="missing"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => (
              <tr
                key={row.employee.id}
                className="gba:border-b gba:border-border hover:gba:bg-muted/50 gba:transition-colors"
              >
                <td className="gba:py-3 gba:px-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <EmployeeAvatar
                      firstName={row.employee.firstName}
                      lastName={row.employee.lastName}
                      pictureThumbnail={row.employee.pictureThumbnail}
                      size="gba:h-7 gba:w-7"
                    />
                    <EmployeeName
                      id={row.employee.id}
                      firstName={row.employee.firstName}
                      lastName={row.employee.lastName}
                      className="gba:font-medium gba:text-sm"
                    />
                  </div>
                </td>
                <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">
                  {formatMinutes(row.contractTargetMinutes)}
                </td>
                <td className="gba:py-3 gba:px-3 gba:font-medium">{formatMinutes(row.workedMinutes)}</td>
                <td className="gba:py-3 gba:px-3">
                  <HighlightCell value={row.overtimeMinutes} threshold={600} format={formatMinutes} />
                </td>
                <td className="gba:py-3 gba:px-3">
                  <HighlightCell value={row.deficitMinutes} threshold={120} format={formatMinutes} />
                </td>
                <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">{formatShortDayCount(row.ptoUsedDays)}</td>
                <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">{formatShortDayCount(row.sickDays)}</td>
                <td className="gba:py-3 gba:px-3">
                  <span className={getBalanceClass(row.netBalanceMinutes)}>{formatMinutes(row.netBalanceMinutes)}</span>
                </td>
                <td className="gba:py-3 gba:px-3">
                  {row.missingEntries > 0 ? (
                    <Badge variant="destructive">{row.missingEntries}</Badge>
                  ) : (
                    <span className="gba:text-muted-foreground">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="my-team-time-dashboard">
      <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:lg:grid-cols-5 gba:xl:grid-cols-9 gba:gap-3">
        <KpiCard
          icon={<UsersThreeIcon />}
          label={t('total_subordinate_employees', 'Total Subordinate Employees')}
          value={members.length}
          tone="muted"
          active={activePanel === 'team-size'}
          onClick={() => togglePanel('team-size')}
        />
        <KpiCard
          icon={<UsersThreeIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.working_now', 'Working Now')}
          value={status.workingNow.length}
          tone="success"
          active={activePanel === 'working-now'}
          onClick={() => togglePanel('working-now')}
        />
        <KpiCard
          icon={<ClockIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.not_clocked_in', 'Not Clocked In')}
          value={status.notClockedIn.length}
          tone={status.notClockedIn.length > 0 ? 'warning' : 'muted'}
          active={activePanel === 'not-clocked-in'}
          onClick={() => togglePanel('not-clocked-in')}
        />
        <KpiCard
          icon={<CalendarIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.on_leave', 'On Leave')}
          value={status.onLeaveToday.length}
          tone="info"
          active={activePanel === 'on-leave'}
          onClick={() => togglePanel('on-leave')}
        />
        <KpiCard
          icon={<BriefcaseIcon />}
          label={t('work_away', 'Work Away')}
          value={workAbsences.length}
          tone={workAbsences.length > 0 ? 'warning' : 'muted'}
          active={activePanel === 'work-away'}
          onClick={() => togglePanel('work-away')}
        />
        <KpiCard
          icon={<HeartbeatIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_today', 'Sick Today')}
          value={status.sickToday.length}
          tone={status.sickToday.length > 0 ? 'destructive' : 'muted'}
          active={activePanel === 'sick-today'}
          onClick={() => togglePanel('sick-today')}
        />
        <KpiCard
          icon={<TimerIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime_mtd', 'Overtime MTD')}
          value={formatMinutes(status.overtimeMinutesMTD)}
          tone={status.overtimeMinutesMTD > 0 ? 'warning' : 'muted'}
          active={activePanel === 'overtime-mtd'}
          onClick={() => togglePanel('overtime-mtd')}
        />
        <KpiCard
          icon={<WarningIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.anomalies', 'Anomalies')}
          value={status.anomalies.length}
          tone={status.anomalies.length > 0 ? 'destructive' : 'muted'}
          active={activePanel === 'anomalies'}
          onClick={() => togglePanel('anomalies')}
        />
        <KpiCard
          icon={<FileTextIcon />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pending_actions', 'Pending Actions')}
          value={pendingLoading ? '…' : pendingActionCount}
          tone={pendingActionCount > 0 ? 'warning' : 'muted'}
          active={activePanel === 'pending'}
          onClick={() => togglePanel('pending')}
        />
      </div>

      <Card data-testid="capacity-forecast-weekly">
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.capacity_forecast', 'Capacity Forecast')}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={prevForecastMonth}
                aria-label={t('previous_month', 'Previous month')}
              >
                <CaretLeftIcon className="gba:h-4 gba:w-4" />
              </Button>
              <span className="gba:min-w-32 gba:px-3 gba:text-center gba:text-sm gba:font-medium">
                {forecastMonthLabel}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextForecastMonth}
                aria-label={t('next_month', 'Next month')}
              >
                <CaretRightIcon className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:pt-0">
          {forecastLoading ? (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr>
                    <th className="gba:w-32 gba:px-2 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.week', 'Week')}
                    </th>
                    {DAY_LABELS.map(day => (
                      <th
                        key={day}
                        className="gba:py-2 gba:px-1 gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-center"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks.map(week => (
                    <tr key={week.weekLabel} className="gba:border-t gba:border-border/50">
                      <td className="gba:py-1.5 gba:px-2 gba:text-xs gba:font-medium gba:text-foreground gba:whitespace-nowrap">
                        {week.weekLabel}
                      </td>
                      {week.days.map(day => {
                        const { pct, available, total } = getForecastCell(day.date)
                        const isPast = day.date < todayStr
                        const isToday = day.date === todayStr
                        const isWeekend = day.dayOfWeek >= 5
                        const dayDateObj = new Date(day.date + 'T00:00:00')
                        const isOutsideMonth =
                          dayDateObj.getMonth() !== forecastMonth.getMonth() ||
                          dayDateObj.getFullYear() !== forecastMonth.getFullYear()

                        if ((isWeekend && total === 0) || isOutsideMonth) {
                          return (
                            <td key={day.date} className="gba:py-1.5 gba:px-1">
                              <div className="gba:flex gba:h-10 gba:items-center gba:justify-center gba:rounded gba:bg-muted/30 gba:text-xs gba:text-muted-foreground">
                                {isOutsideMonth ? '' : '—'}
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={day.date} className="gba:py-1.5 gba:px-1">
                            <button
                              type="button"
                              className={`gba:relative gba:flex gba:h-10 gba:flex-col gba:items-center gba:justify-center gba:overflow-hidden gba:rounded ${
                                isPast ? 'gba:opacity-50' : ''
                              } ${isToday ? 'gba:ring-1 gba:ring-primary' : ''} gba:w-full gba:bg-transparent gba:border-0 gba:p-0`}
                              title={`${day.date}: ${available}/${total} available (${pct}%)`}
                              onClick={() => {
                                setSelectedForecastDay(day.date)
                                setActivePanel('forecast-day')
                              }}
                            >
                              <div
                                className="gba:absolute gba:inset-0 gba:rounded"
                                style={{
                                  background: `linear-gradient(90deg, ${getProgressColor(pct)}22 ${pct}%, transparent ${pct}%)`
                                }}
                              />
                              <span
                                className={`gba:text-sm gba:font-bold gba:relative gba:z-10 ${
                                  getHeatmapColor(pct)
                                    .split(' ')
                                    .find(c => c.startsWith('gba:text-')) || ''
                                }`}
                              >
                                {pct}%
                              </span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="capacity-balance-table">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:my_team_time.monthly_capacity_balance',
                'Monthly Capacity & Balance'
              )}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                aria-label={t('previous_month', 'Previous month')}
              >
                <CaretLeftIcon className="gba:h-4 gba:w-4" />
              </Button>
              <span className="gba:min-w-32 gba:px-3 gba:text-center gba:text-sm gba:font-medium">{monthLabel}</span>
              <Button variant="outline" size="sm" onClick={nextMonth} aria-label={t('next_month', 'Next month')}>
                <CaretRightIcon className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-0">{capacityContent}</CardContent>
      </Card>

      <DataDetailsDrawer
        title={getPanelTitle()}
        icon={getPanelIcon()}
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        width={440}
        placement="right"
        dataTestId="dashboard-details-drawer"
      >
        <div className="gba:mb-2 gba:text-sm gba:text-muted-foreground">{getPanelDescription()}</div>
        {renderPanelContent()}
      </DataDetailsDrawer>
    </div>
  )
}
