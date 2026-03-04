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
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamAttendance } from '../../hooks/useTeamAttendance'
import { useAbsenceTypeCatalog } from '@/business-apps/hr/absences/apps/personal-absences/hooks/useAbsenceTypeCatalog'
import { TeamMember, TeamAttendanceEntry, TeamAbsenceToday } from '../../types/types'
import {
  formatTimeShort,
  formatMinutes,
  getLocationLabel,
  parseDurationToMinutes,
  toLocalDateKey,
  getPlannedMinutesForDate,
  toDateString
} from '../../utils/timeUtils'
import { toAvatarSrc, goToProfile } from '../../utils/employeeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type MapTypeFn = (codeOrId: string) => { label?: string; color?: string }

const getStatusColor = (entry: TeamAttendanceEntry | null, absence: TeamAbsenceToday | null): string => {
  if (absence) {
    const typeUpper = (absence.typeRef || '').toUpperCase()
    if (typeUpper.includes('ILLNESS') || typeUpper.includes('SICK')) return 'gba:bg-destructive/10 gba:text-destructive'
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
  if (!typeRef) return 'Leave'
  const resolved = mapType(typeRef)
  if (resolved?.label && resolved.label !== typeRef) return resolved.label
  const parts = typeRef.split(':')
  const code = parts[parts.length - 1]
  const mapped = mapType(code)
  return mapped?.label && mapped.label !== code ? mapped.label : 'Leave'
}

const getRowStatus = (
  entry: TeamAttendanceEntry | null,
  absence: TeamAbsenceToday | null,
  mapType: MapTypeFn
): string => {
  if (absence) return resolveAbsenceLabel(absence.typeRef, mapType)
  if (!entry) return 'No data'
  if (entry.startTime && !entry.endTime) return 'Working'
  if (entry.endTime) return 'Completed'
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

interface EmployeeRowProps {
  member: TeamMember
  entry: TeamAttendanceEntry | null
  absence: TeamAbsenceToday | null
  viewMode: 'day' | 'week' | 'month'
  mapType: MapTypeFn
  periodSummary?: PeriodSummary
}

const PeriodEmployeeRow: React.FC<{ member: TeamMember; periodSummary: PeriodSummary }> = ({
  member,
  periodSummary
}) => {
  const { targetMinutes, actualMinutes, daysOff, diffMinutes } = periodSummary
  const diffColor = diffMinutes < 0 ? 'gba:text-destructive' : diffMinutes > 0 ? 'gba:text-warning' : 'gba:text-success'
  const diffLabel =
    diffMinutes === 0
      ? 'On track'
      : diffMinutes > 0
        ? `+${formatMinutes(diffMinutes)} overtime`
        : `${formatMinutes(diffMinutes)} deficit`

  return (
    <tr className="gba:border-b gba:border-border hover:gba:bg-muted/50 gba:transition-colors">
      <EmployeeCell member={member} />
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">{formatMinutes(targetMinutes)}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {daysOff > 0 ? (
          <Badge variant="outline" className="gba:bg-info/10 gba:text-info">
            {daysOff} {daysOff === 1 ? 'day' : 'days'}
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
}> = ({ member, entry, absence, mapType }) => {
  const statusColor = getStatusColor(entry, absence)
  const status = getRowStatus(entry, absence, mapType)

  return (
    <tr className="gba:border-b gba:border-border hover:gba:bg-muted/50 gba:transition-colors">
      <EmployeeCell member={member} />
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {entry?.startTime ? formatTimeShort(entry.startTime) : '—'}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">
        {entry?.endTime ? formatTimeShort(entry.endTime) : entry?.startTime ? 'Active' : '—'}
      </td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">{entry?.breakTime || '—'}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:font-medium">{entry?.effectiveTime || '—'}</td>
      <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-muted-foreground">{entry?.plannedTime || '—'}</td>
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

const EmployeeRow: React.FC<EmployeeRowProps> = ({ member, entry, absence, viewMode, mapType, periodSummary }) => {
  if (viewMode !== 'day' && periodSummary) {
    return <PeriodEmployeeRow member={member} periodSummary={periodSummary} />
  }
  return <DayEmployeeRow member={member} entry={entry} absence={absence} mapType={mapType} />
}

export const AttendanceTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, isLoading: membersLoading } = useTeamMembers(props)
  const { mapType } = useAbsenceTypeCatalog(props.accessToken)
  const {
    attendance,
    absences,
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

  const dateLabel =
    viewMode === 'day'
      ? currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : viewMode === 'week'
        ? (() => {
            const d = new Date(currentDate)
            const dayOfWeek = d.getDay()
            const monday = new Date(d)
            monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
            const sunday = new Date(monday)
            sunday.setDate(monday.getDate() + 6)
            return `${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
          })()
        : currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

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

  const periodSummaries = useMemo((): Record<string, PeriodSummary> => {
    if (viewMode === 'day') return {}
    const result: Record<string, PeriodSummary> = {}
    const { from, to } = dateRange

    for (const member of members) {
      const memberAttendance = attendance.filter(a => a.employeeId === member.id)
      const memberAbsences = absences.filter(a => a.employeeId === member.id && a.status === 'APPROVED')
      const absenceDates = new Set(memberAbsences.map(a => a.dayDate))

      let targetMinutes = 0
      let daysOff = 0
      const d = new Date(from)
      while (d <= to) {
        const dateKey = toDateString(d)
        const planned = getPlannedMinutesForDate(dateKey, member.workingHours)
        if (absenceDates.has(dateKey)) {
          daysOff++
        } else {
          targetMinutes += planned
        }
        d.setDate(d.getDate() + 1)
      }

      const actualMinutes = memberAttendance.reduce((sum, e) => sum + parseDurationToMinutes(e.effectiveTime), 0)
      const diffMinutes = actualMinutes - targetMinutes

      result[member.id] = { targetMinutes, actualMinutes, daysOff, diffMinutes }
    }
    return result
  }, [viewMode, dateRange, members, attendance, absences])

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
      return absences.find(a => a.employeeId === memberId && a.status === 'APPROVED') ?? null
    }
    return absences.find(a => a.employeeId === memberId && a.status === 'APPROVED') ?? null
  }

  return (
    <div className="gba:space-y-4" data-testid="my-team-time-attendance">
      <Card className="gba:shadow-sm">
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
                    className={`gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:capitalize gba:transition-colors ${
                      viewMode === mode
                        ? 'gba:bg-primary gba:text-primary-foreground'
                        : 'gba:bg-background gba:text-muted-foreground hover:gba:bg-muted'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button variant="outline" size="sm" onClick={goToPrev}>
                  <PiCaretLeft />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.today', 'Today')}
                </Button>
                <Button variant="outline" size="sm" onClick={goToNext}>
                  <PiCaretRight />
                </Button>
              </div>
            </div>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{dateLabel}</p>
        </CardHeader>
        <CardContent className="gba:p-0">
          {isLoading ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
            </div>
          ) : error ? (
            <div className="gba:text-center gba:py-12 gba:text-destructive">{error}</div>
          ) : members.length === 0 ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_team_members', 'No team members found.')}
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:text-left">
                <thead>
                  <tr className="gba:border-b gba:border-border gba:bg-muted/30">
                    <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.employee', 'Employee')}
                    </th>
                    {viewMode === 'day' ? (
                      <>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.clock_in', 'Clock In')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.clock_out', 'Clock Out')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.break', 'Break')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.effective', 'Effective')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.planned', 'Planned')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.difference', 'Diff')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.location', 'Location')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.status', 'Status')}
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.target_hours', 'Target Hours')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.days_off', 'Days Off')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.actual_hours', 'Actual Hours')}
                        </th>
                        <th className="gba:py-2.5 gba:px-4 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.status', 'Status')}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <EmployeeRow
                      key={member.id}
                      member={member}
                      entry={getMemberEntry(member.id)}
                      absence={getMemberAbsence(member.id)}
                      viewMode={viewMode}
                      mapType={mapType}
                      periodSummary={viewMode !== 'day' ? periodSummaries[member.id] : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
