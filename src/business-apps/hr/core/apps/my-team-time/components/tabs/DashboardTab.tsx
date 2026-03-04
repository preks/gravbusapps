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
  PiUsers,
  PiClock,
  PiCalendar,
  PiFirstAid,
  PiWarning,
  PiTimer,
  PiClipboardText,
  PiCaretLeft,
  PiCaretRight,
  PiArrowUp,
  PiArrowDown
} from 'react-icons/pi'
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamOperationalStatus } from '../../hooks/useTeamOperationalStatus'
import { useTeamPendingActions } from '../../hooks/useTeamPendingActions'
import { useTeamCapacity } from '../../hooks/useTeamCapacity'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ABSENCES_CALENDAR_RANGE } from '../../queries/queries'
import { TeamMember, TeamAbsenceToday, CapacityRow } from '../../types/types'
import { formatMinutes, toDateString, toLocalDateKey, isWorkingDay } from '../../utils/timeUtils'
import { toAvatarSrc, goToProfile } from '../../utils/employeeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type PanelType =
  | 'working-now'
  | 'not-clocked-in'
  | 'on-leave'
  | 'sick-today'
  | 'overtime-mtd'
  | 'anomalies'
  | 'pending'
  | null

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  active: boolean
  onClick: () => void
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, color, active, onClick }) => (
  <Card
    className={`gba:shadow-sm gba:cursor-pointer gba:transition-all hover:gba:shadow-md gba:border ${
      active ? 'gba:ring-2 gba:ring-primary gba:border-primary' : 'gba:border-border'
    }`}
    onClick={onClick}
    data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="gba:p-3">
      <div className="gba:flex gba:items-center gba:gap-2.5">
        <div
          className="gba:w-8 gba:h-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:text-base gba:flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          {icon}
        </div>
        <div className="gba:min-w-0">
          <div className="gba:text-xl gba:font-bold gba:leading-tight" style={{ color }}>
            {value}
          </div>
          <div className="gba:text-[11px] gba:text-muted-foreground gba:leading-tight gba:truncate">{label}</div>
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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const DashboardTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, isLoading: membersLoading } = useTeamMembers(props)
  const {
    status,
    monthAttendance,
    isLoading: statusLoading
  } = useTeamOperationalStatus(props.accessToken, members, memberIds)
  const { pendingAbsences, isLoading: pendingLoading } = useTeamPendingActions(props)

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
  const [forecastLoading, setForecastLoading] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)

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

      const result = await graphqlClient.request<any>(GET_TEAM_ABSENCES_CALENDAR_RANGE, {
        employeeIds: memberIds,
        from: toDateString(calStart),
        to: toDateString(calEnd)
      })
      setForecastAbsences(
        (result?.EmployeeAbsenceCalendarView ?? []).map((r: any) => ({
          employeeId: r.employeeId,
          typeRef: r.typeRef,
          status: r.status,
          dayDate: r.dayDate,
          employeeAbsenceId: r.employeeAbsenceId
        }))
      )
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
    const total = members.filter(m => isWorkingDay(date, m.workingHours)).length
    const absentIds = new Set(
      forecastAbsences.filter(a => a.dayDate === date && a.status === 'APPROVED').map(a => a.employeeId)
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
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const monthLabel = currentMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

  const SortHeader: React.FC<{ label: string; sortKeyValue: SortKey }> = ({ label, sortKeyValue }) => (
    <th
      className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:cursor-pointer gba:select-none hover:gba:text-foreground gba:transition-colors gba:whitespace-nowrap"
      onClick={() => handleSort(sortKeyValue)}
    >
      <span className="gba:flex gba:items-center gba:gap-1">
        {label}
        {sortKey === sortKeyValue && (sortDir === 'asc' ? <PiArrowUp size={12} /> : <PiArrowDown size={12} />)}
      </span>
    </th>
  )

  const getPanelTitle = (): string => {
    switch (activePanel) {
      case 'working-now':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.working_now', 'Working Now')
      case 'not-clocked-in':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.not_clocked_in', 'Not Clocked In')
      case 'on-leave':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.on_leave_today', 'On Leave Today')
      case 'sick-today':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_today', 'Sick Today')
      case 'overtime-mtd':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime_this_month', 'Overtime This Month')
      case 'anomalies':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.active_anomalies', 'Active Anomalies')
      case 'pending':
        return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pending_actions', 'Pending Actions')
      default:
        return ''
    }
  }

  const getPanelDescription = (): string => {
    switch (activePanel) {
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
          'On approved leave today (excluding sick)'
        )
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
          'Absence requests awaiting your approval'
        )
      default:
        return ''
    }
  }

  const getPanelIcon = (): React.ReactNode => {
    switch (activePanel) {
      case 'working-now':
        return <PiUsers size={20} />
      case 'not-clocked-in':
        return <PiClock size={20} />
      case 'on-leave':
        return <PiCalendar size={20} />
      case 'sick-today':
        return <PiFirstAid size={20} />
      case 'overtime-mtd':
        return <PiTimer size={20} />
      case 'anomalies':
        return <PiWarning size={20} />
      case 'pending':
        return <PiClipboardText size={20} />
      default:
        return undefined
    }
  }

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'working-now':
        return (
          <MemberList
            members={status.workingNow}
            emptyText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:my_team_time.no_one_clocked_in',
              'No one is clocked in right now.'
            )}
          />
        )
      case 'not-clocked-in':
        return (
          <MemberList
            members={status.notClockedIn}
            emptyText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:my_team_time.everyone_clocked_in',
              'Everyone expected today has clocked in.'
            )}
          />
        )
      case 'on-leave':
        return (
          <MemberList
            members={status.onLeaveToday}
            emptyText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:my_team_time.no_one_on_leave',
              'No one is on leave today.'
            )}
          />
        )
      case 'sick-today':
        return (
          <MemberList
            members={status.sickToday}
            emptyText={getTranslationFromI18nKeyAndLabel(
              'lowcoder:my_team_time.no_one_sick',
              'No one is on sick leave today.'
            )}
          />
        )
      case 'overtime-mtd':
        return (
          <div className="gba:text-center gba:py-6">
            <div className="gba:text-4xl gba:font-bold gba:text-warning gba:mb-2">
              {formatMinutes(status.overtimeMinutesMTD)}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:my_team_time.total_team_overtime',
                'Total team overtime this month'
              )}
            </div>
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
                  <span className="gba:font-medium gba:text-sm">{anomaly.employeeName}</span>
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
        if (pendingAbsences.length === 0) {
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
            {pendingAbsences.map(absence => (
              <div key={absence.id} className="gba:flex gba:items-center gba:justify-between gba:py-3">
                <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                  <EmployeeAvatar
                    firstName={absence.employee.firstName}
                    lastName={absence.employee.lastName}
                    pictureThumbnail={absence.employee.pictureThumbnail}
                  />
                  <div className="gba:min-w-0">
                    <EmployeeName
                      id={absence.employee.id}
                      firstName={absence.employee.firstName}
                      lastName={absence.employee.lastName}
                      className="gba:font-medium gba:text-sm gba:truncate"
                    />
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {absence.type.value} &middot;{' '}
                      {absence.effectiveDays
                        ? `${absence.effectiveDays}d`
                        : `${new Date(absence.startDate).toLocaleDateString()} – ${new Date(absence.endDate).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="gba:text-warning gba:border-warning gba:flex-shrink-0 gba:ml-2">
                  Pending
                </Badge>
              </div>
            ))}
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

  return (
    <div className="gba:space-y-6" data-testid="my-team-time-dashboard">
      <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-7 gba:gap-3">
        <KpiCard
          icon={<PiUsers />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.working_now', 'Working Now')}
          value={status.workingNow.length}
          color="var(--nw-success)"
          active={activePanel === 'working-now'}
          onClick={() => togglePanel('working-now')}
        />
        <KpiCard
          icon={<PiClock />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.not_clocked_in', 'Not Clocked In')}
          value={status.notClockedIn.length}
          color={status.notClockedIn.length > 0 ? 'var(--nw-warning)' : 'var(--nw-muted-foreground)'}
          active={activePanel === 'not-clocked-in'}
          onClick={() => togglePanel('not-clocked-in')}
        />
        <KpiCard
          icon={<PiCalendar />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.on_leave', 'On Leave')}
          value={status.onLeaveToday.length}
          color="var(--nw-info)"
          active={activePanel === 'on-leave'}
          onClick={() => togglePanel('on-leave')}
        />
        <KpiCard
          icon={<PiFirstAid />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_today', 'Sick Today')}
          value={status.sickToday.length}
          color={status.sickToday.length > 0 ? 'var(--nw-destructive)' : 'var(--nw-muted-foreground)'}
          active={activePanel === 'sick-today'}
          onClick={() => togglePanel('sick-today')}
        />
        <KpiCard
          icon={<PiTimer />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime_mtd', 'Overtime MTD')}
          value={formatMinutes(status.overtimeMinutesMTD)}
          color={status.overtimeMinutesMTD > 0 ? 'var(--nw-warning)' : 'var(--nw-muted-foreground)'}
          active={activePanel === 'overtime-mtd'}
          onClick={() => togglePanel('overtime-mtd')}
        />
        <KpiCard
          icon={<PiWarning />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.anomalies', 'Anomalies')}
          value={status.anomalies.length}
          color={status.anomalies.length > 0 ? 'var(--nw-destructive)' : 'var(--nw-muted-foreground)'}
          active={activePanel === 'anomalies'}
          onClick={() => togglePanel('anomalies')}
        />
        <KpiCard
          icon={<PiClipboardText />}
          label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pending_actions', 'Pending Actions')}
          value={pendingLoading ? '…' : pendingAbsences.length}
          color={pendingAbsences.length > 0 ? 'var(--nw-warning)' : 'var(--nw-muted-foreground)'}
          active={activePanel === 'pending'}
          onClick={() => togglePanel('pending')}
        />
      </div>

      <Card className="gba:shadow-sm" data-testid="capacity-forecast-weekly">
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.capacity_forecast', 'Capacity Forecast')}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button variant="outline" size="sm" onClick={prevForecastMonth}>
                <PiCaretLeft />
              </Button>
              <span className="gba:px-3 gba:text-sm gba:font-medium gba:min-w-[140px] gba:text-center">
                {forecastMonthLabel}
              </span>
              <Button variant="outline" size="sm" onClick={nextForecastMonth}>
                <PiCaretRight />
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
                    <th className="gba:py-2 gba:px-2 gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-left gba:w-[130px]">
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
                              <div className="gba:rounded gba:h-[38px] gba:flex gba:items-center gba:justify-center gba:bg-muted/30 gba:text-muted-foreground gba:text-xs">
                                {isOutsideMonth ? '' : '—'}
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={day.date} className="gba:py-1.5 gba:px-1">
                            <div
                              className={`gba:rounded gba:h-[38px] gba:flex gba:flex-col gba:items-center gba:justify-center gba:relative gba:overflow-hidden ${
                                isPast ? 'gba:opacity-50' : ''
                              } ${isToday ? 'gba:ring-1 gba:ring-primary' : ''}`}
                              title={`${day.date}: ${available}/${total} available (${pct}%)`}
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
                            </div>
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

      <Card className="gba:shadow-sm" data-testid="capacity-balance-table">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:my_team_time.monthly_capacity_balance',
                'Monthly Capacity & Balance'
              )}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <PiCaretLeft />
              </Button>
              <span className="gba:px-3 gba:text-sm gba:font-medium gba:min-w-[140px] gba:text-center">
                {monthLabel}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <PiCaretRight />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-0">
          {capacityLoading ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
            </div>
          ) : capacityError ? (
            <div className="gba:text-center gba:py-12 gba:text-destructive">{capacityError}</div>
          ) : sortedRows.length === 0 ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_data_available', 'No data available.')}
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:text-left gba:text-sm">
                <thead>
                  <tr className="gba:border-b gba:border-border gba:bg-muted/30">
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.employee', 'Employee')}
                      sortKeyValue="name"
                    />
                    <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.target', 'Target')}
                    </th>
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.worked', 'Worked')}
                      sortKeyValue="worked"
                    />
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime', 'Overtime')}
                      sortKeyValue="overtime"
                    />
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.deficit', 'Deficit')}
                      sortKeyValue="deficit"
                    />
                    <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pto_used', 'PTO Used')}
                    </th>
                    <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_days', 'Sick Days')}
                    </th>
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.balance', 'Balance')}
                      sortKeyValue="balance"
                    />
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.missing', 'Missing')}
                      sortKeyValue="missing"
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
                      <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">{row.ptoUsedDays}d</td>
                      <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">{row.sickDays}d</td>
                      <td className="gba:py-3 gba:px-3">
                        <span
                          className={
                            row.netBalanceMinutes < 0
                              ? 'gba:text-destructive gba:font-semibold'
                              : row.netBalanceMinutes > 0
                                ? 'gba:text-success'
                                : ''
                          }
                        >
                          {formatMinutes(row.netBalanceMinutes)}
                        </span>
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
          )}
        </CardContent>
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
