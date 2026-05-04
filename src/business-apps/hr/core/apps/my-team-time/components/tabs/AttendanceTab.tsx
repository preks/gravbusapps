import React, { useMemo } from 'react'
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
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamAttendance } from '../../hooks/useTeamAttendance'
import { useAbsenceTypeCatalog } from '@/business-apps/hr/absences/apps/personal-absences/hooks/useAbsenceTypeCatalog'
import { TeamMember, TeamAttendanceEntry, TeamAbsenceToday, ViewMode } from '../../types/types'
import {
  formatTimeShort,
  formatMinutes,
  getLocationLabel,
  parseDurationToMinutes,
  toLocalDateKey,
  getPlannedMinutesForDate
} from '../../utils/timeUtils'
import { toAvatarSrc, goToProfile } from '../../utils/employeeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { isSickAbsence, isWorkAbsence } from '../../utils/teamTimeDomain'

type MapTypeFn = (codeOrId: string) => { label?: string; color?: string }

const t = (key: string, fallback: string, vars?: Record<string, unknown>) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:my_team_time.${key}`, fallback, vars)

const getViewModeLabel = (viewMode: ViewMode): string => {
  switch (viewMode) {
    case 'day':
      return t('view_mode_day', 'Day')
    case 'week':
      return t('view_mode_week', 'Week')
    case 'month':
      return t('view_mode_month', 'Month')
  }
}

const formatDaysLabel = (count: number): string => {
  const unit = count === 1 ? t('day_unit', 'day') : t('days_unit', 'days')
  return `${count} ${unit}`
}

const formatDifferenceLabel = (diffMinutes: number): string => {
  if (diffMinutes > 0) {
    return t('overtime_value', '{{value}} overtime', { value: `+${formatMinutes(diffMinutes)}` })
  }

  if (diffMinutes < 0) {
    return t('deficit_value', '{{value}} deficit', { value: formatMinutes(diffMinutes) })
  }

  return t('on_track', 'On track')
}

const getStatusColor = (
  entry: TeamAttendanceEntry | null,
  absence: TeamAbsenceToday | null,
  holidayLabel: string | undefined,
  plannedMinutes: number
): string => {
  if (holidayLabel) return 'gba:bg-info/10 gba:text-info'
  if (plannedMinutes === 0) return 'gba:bg-muted gba:text-muted-foreground'
  if (absence) {
    if (isSickAbsence(absence)) return 'gba:bg-destructive/10 gba:text-destructive'
    return 'gba:bg-info/10 gba:text-info'
  }
  if (!entry) return 'gba:bg-muted gba:text-muted-foreground'
  if (entry.startTime && !entry.endTime) return 'gba:bg-success/10 gba:text-success'
  const diff = parseDurationToMinutes(entry.differenceTime)
  if (diff > 0) return 'gba:bg-warning/10 gba:text-warning'
  if (diff < 0) return 'gba:bg-destructive/10 gba:text-destructive'
  return 'gba:bg-success/10 gba:text-success'
}

const resolveAbsenceLabel = (typeRef: string, mapType: MapTypeFn): string => {
  if (!typeRef) return t('leave', 'Leave')
  const resolved = mapType(typeRef)
  if (resolved?.label && resolved.label !== typeRef) return resolved.label
  const parts = typeRef.split(':')
  const code = parts[parts.length - 1]
  const mapped = mapType(code)
  return mapped?.label && mapped.label !== code ? mapped.label : t('leave', 'Leave')
}

const getEndTimeDisplay = (entry: TeamAttendanceEntry | null): string => {
  if (entry?.endTime) return formatTimeShort(entry.endTime)
  if (entry?.startTime) return t('active', 'Active')
  return '—'
}

const getRowStatus = (
  entry: TeamAttendanceEntry | null,
  absence: TeamAbsenceToday | null,
  mapType: MapTypeFn,
  holidayLabel: string | undefined,
  plannedMinutes: number
): string => {
  if (holidayLabel) return holidayLabel
  if (plannedMinutes === 0) return t('non_working_day', 'Non-working day')
  if (absence) return resolveAbsenceLabel(absence.typeRef, mapType)
  if (!entry) return t('no_data', 'No data')
  if (entry.startTime && !entry.endTime) return t('working', 'Working')
  if (entry.endTime) return t('completed', 'Completed')
  return '—'
}

const EmployeeCell: React.FC<{ member: TeamMember }> = ({ member }) => (
  <td className="gba:py-3 gba:px-4">
    <div className="gba:flex gba:items-center gba:gap-2">
      <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0">
        {member.pictureThumbnail && (
          <AvatarImage src={toAvatarSrc(member.pictureThumbnail)} alt={`${member.firstName} ${member.lastName}`} />
        )}
        <AvatarFallback className="gba:text-xs gba:font-medium">
          {member.firstName?.[0]}
          {member.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        className="gba:text-sm gba:font-medium gba:text-left hover:gba:text-primary hover:gba:underline gba:transition-colors gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0"
        onClick={() => goToProfile(member.id)}
      >
        {member.firstName} {member.lastName}
      </button>
    </div>
  </td>
)

interface PeriodSummary {
  targetMinutes: number
  actualMinutes: number
  daysOff: number
  diffMinutes: number
}

const PeriodEmployeeRow: React.FC<{ member: TeamMember; periodSummary: PeriodSummary }> = ({
  member,
  periodSummary
}) => {
  const { targetMinutes, actualMinutes, daysOff, diffMinutes } = periodSummary

  let diffColor = 'gba:text-success'
  if (diffMinutes < 0) diffColor = 'gba:text-destructive'
  else if (diffMinutes > 0) diffColor = 'gba:text-warning'

  const diffLabel = formatDifferenceLabel(diffMinutes)

  return (
    <tr className="gba:border-b gba:border-border hover:gba:bg-muted/50 gba:transition-colors">
      <EmployeeCell member={member} />
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">{formatMinutes(targetMinutes)}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {daysOff > 0 ? (
          <Badge variant="outline" className="gba:bg-info/10 gba:text-info">
            {formatDaysLabel(daysOff)}
          </Badge>
        ) : (
          '—'
        )}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:font-medium">{formatMinutes(actualMinutes)}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm">
        <span className={diffColor}>{diffLabel}</span>
      </td>
    </tr>
  )
}

const DayEmployeeRow: React.FC<{
  member: TeamMember
  entry: TeamAttendanceEntry | null
  absence: TeamAbsenceToday | null
  mapType: MapTypeFn
  dateKey: string
  holidayLabel?: string
}> = ({ member, entry, absence, mapType, dateKey, holidayLabel }) => {
  const plannedMinutes = getPlannedMinutesForDate(dateKey, member.workingHours)
  const statusColor = getStatusColor(entry, absence, holidayLabel, plannedMinutes)
  const status = getRowStatus(entry, absence, mapType, holidayLabel, plannedMinutes)

  return (
    <tr className="gba:border-b gba:border-border hover:gba:bg-muted/50 gba:transition-colors">
      <EmployeeCell member={member} />
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {entry?.startTime ? formatTimeShort(entry.startTime) : '—'}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">{getEndTimeDisplay(entry)}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">{entry?.breakTime || '—'}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:font-medium">{entry?.effectiveTime || '—'}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {entry?.plannedTime || (plannedMinutes > 0 ? formatMinutes(plannedMinutes) : '—')}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm">
        {entry?.differenceTime ? (
          <span
            className={parseDurationToMinutes(entry.differenceTime) < 0 ? 'gba:text-destructive' : 'gba:text-success'}
          >
            {entry.differenceTime}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {entry ? getLocationLabel(entry.attendanceLocation) : '—'}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm">
        <Badge variant="outline" className={statusColor}>
          {status}
        </Badge>
      </td>
    </tr>
  )
}

export const AttendanceTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, isLoading: membersLoading } = useTeamMembers(props)
  const { mapType } = useAbsenceTypeCatalog(props.accessToken)
  const {
    attendance,
    absences,
    absenceNet,
    holidayDatesByEmployeeId,
    holidayNamesByEmployeeId,
    currentDate,
    viewMode,
    setViewMode,
    goToPrev,
    goToNext,
    goToToday,
    isLoading: attendanceLoading,
    error
  } = useTeamAttendance(props.accessToken, members, memberIds)

  const isLoading = membersLoading || attendanceLoading

  let dateLabel: string
  if (viewMode === 'day') {
    dateLabel = currentDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } else if (viewMode === 'week') {
    const d = new Date(currentDate)
    const dayOfWeek = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    dateLabel = `${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
  } else {
    dateLabel = currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  }

  const todayStr = toLocalDateKey(currentDate)

  const dateRange = useMemo((): { from: Date; to: Date } => {
    const d = new Date(currentDate)
    if (viewMode === 'day') return { from: d, to: d }
    if (viewMode === 'week') {
      const dayOfWeek = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: monday, to: sunday }
    }
    return { from: new Date(d.getFullYear(), d.getMonth(), 1), to: new Date(d.getFullYear(), d.getMonth() + 1, 0) }
  }, [currentDate, viewMode])

  const netByEmployeeAndDay = useMemo((): Map<string, Map<string, number>> => {
    const map = new Map<string, Map<string, number>>()
    for (const row of absenceNet) {
      const value = Number(row.netSignedEps ?? row.netConsumed) || 0
      if (value <= 0) continue
      if (!map.has(row.employeeId)) map.set(row.employeeId, new Map())
      const dayMap = map.get(row.employeeId)!
      dayMap.set(row.dayDate, (dayMap.get(row.dayDate) ?? 0) + value)
    }
    return map
  }, [absenceNet])

  const periodSummaries = useMemo((): Record<string, PeriodSummary> => {
    if (viewMode === 'day') return {}
    const result: Record<string, PeriodSummary> = {}
    const { from, to } = dateRange

    for (const member of members) {
      const memberAttendance = attendance.filter(a => a.employeeId === member.id)
      const memberNetByDay = netByEmployeeAndDay.get(member.id) ?? new Map<string, number>()
      const holidayDates = holidayDatesByEmployeeId.get(member.id) ?? new Set<string>()

      let targetMinutes = 0
      let daysOff = 0
      const d = new Date(from)
      while (d <= to) {
        const dateKey = toLocalDateKey(d)
        const planned = getPlannedMinutesForDate(dateKey, member.workingHours)
        if (planned > 0) {
          if (holidayDates.has(dateKey)) {
            d.setDate(d.getDate() + 1)
            continue
          }

          const dayAbsences = absences.filter(
            absence => absence.employeeId === member.id && absence.dayDate === dateKey && absence.status === 'APPROVED'
          )
          const nonWorkAbsence = dayAbsences.find(absence => !isWorkAbsence(absence))

          if (nonWorkAbsence) {
            const netFraction = Math.min(memberNetByDay.get(dateKey) ?? 1, 1)
            daysOff += netFraction
            targetMinutes += planned * (1 - netFraction)
          } else {
            targetMinutes += planned
          }
        }
        d.setDate(d.getDate() + 1)
      }

      const actualMinutes = memberAttendance.reduce((sum, e) => sum + parseDurationToMinutes(e.effectiveTime), 0)
      const diffMinutes = actualMinutes - targetMinutes

      result[member.id] = {
        targetMinutes: Math.round(targetMinutes),
        actualMinutes,
        daysOff: Math.round(daysOff * 10) / 10,
        diffMinutes: Math.round(diffMinutes)
      }
    }
    return result
  }, [viewMode, dateRange, members, attendance, absences, holidayDatesByEmployeeId, netByEmployeeAndDay])

  const getMemberEntry = (memberId: string): TeamAttendanceEntry | null => {
    if (viewMode === 'day') {
      return attendance.find(a => a.employeeId === memberId && a.attendanceDate === todayStr) ?? null
    }
    const entries = attendance.filter(a => a.employeeId === memberId)
    if (entries.length === 0) return null
    const totalEffective = entries.reduce((sum, e) => sum + parseDurationToMinutes(e.effectiveTime), 0)
    return {
      ...entries[0],
      effectiveTime: formatMinutes(totalEffective)
    }
  }

  const getMemberAbsence = (memberId: string): TeamAbsenceToday | null => {
    if (viewMode === 'day') {
      return absences.find(a => a.employeeId === memberId && a.dayDate === todayStr && a.status === 'APPROVED') ?? null
    }
    return absences.find(a => a.employeeId === memberId && a.status === 'APPROVED') ?? null
  }

  let attendanceContent: React.ReactNode
  if (isLoading) {
    attendanceContent = (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  } else if (error) {
    attendanceContent = <div className="gba:text-center gba:py-12 gba:text-destructive">{error}</div>
  } else if (members.length === 0) {
    attendanceContent = (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_team_members', 'No team members found.')}
      </div>
    )
  } else {
    attendanceContent = renderAttendanceTableContent(
      viewMode,
      mapType,
      members,
      getMemberEntry,
      getMemberAbsence,
      periodSummaries,
      todayStr,
      holidayNamesByEmployeeId
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="my-team-time-attendance">
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.attendance_timeline', 'Attendance & Timeline')}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:flex gba:rounded-md gba:border gba:border-border gba:overflow-hidden">
                {(['day', 'week', 'month'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:transition-colors ${
                      viewMode === mode
                        ? 'gba:bg-primary gba:text-primary-foreground'
                        : 'gba:bg-background gba:text-muted-foreground hover:gba:bg-muted'
                    }`}
                  >
                    {getViewModeLabel(mode)}
                  </button>
                ))}
              </div>
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrev}
                  aria-label={t('previous_period', 'Previous period')}
                >
                  <CaretLeftIcon className="gba:h-4 gba:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.today', 'Today')}
                </Button>
                <Button variant="outline" size="sm" onClick={goToNext} aria-label={t('next_period', 'Next period')}>
                  <CaretRightIcon className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            </div>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{dateLabel}</p>
        </CardHeader>
        <CardContent className="gba:p-0">{attendanceContent}</CardContent>
      </Card>
    </div>
  )
}

// ─── Attendance table content (extracted to avoid nested JSX ternaries) ────────

function renderAttendanceTableContent(
  viewMode: ViewMode,
  mapType: MapTypeFn,
  members: TeamMember[],
  getMemberEntry: (id: string) => TeamAttendanceEntry | null,
  getMemberAbsence: (id: string) => TeamAbsenceToday | null,
  periodSummaries: Record<string, PeriodSummary>,
  dateKey: string,
  holidayNamesByEmployeeId: Map<string, Record<string, string>>
): React.ReactNode {
  const thClass = 'gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground'
  return (
    <div className="gba:overflow-x-auto">
      <table className="gba:w-full gba:text-left">
        <thead>
          <tr className="gba:border-b gba:border-border gba:bg-muted/30">
            <th className={thClass}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.employee', 'Employee')}
            </th>
            {viewMode === 'day' ? (
              <>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.clock_in', 'Clock In')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.clock_out', 'Clock Out')}
                </th>
                <th className={thClass}>{getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.break', 'Break')}</th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.effective', 'Effective')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.planned', 'Planned')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.difference', 'Diff')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.location', 'Location')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.status', 'Status')}
                </th>
              </>
            ) : (
              <>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.target_hours', 'Target Hours')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.days_off', 'Days Off')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.actual_hours', 'Actual Hours')}
                </th>
                <th className={thClass}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.status', 'Status')}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map(member =>
            viewMode === 'day' ? (
              <DayEmployeeRow
                key={member.id}
                member={member}
                entry={getMemberEntry(member.id)}
                absence={getMemberAbsence(member.id)}
                mapType={mapType}
                dateKey={dateKey}
                holidayLabel={holidayNamesByEmployeeId.get(member.id)?.[dateKey]}
              />
            ) : (
              <PeriodEmployeeRow key={member.id} member={member} periodSummary={periodSummaries[member.id]} />
            )
          )}
        </tbody>
      </table>
    </div>
  )
}
