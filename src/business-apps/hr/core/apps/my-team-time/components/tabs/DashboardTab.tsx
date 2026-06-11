import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamOperationalStatus } from '../../hooks/useTeamOperationalStatus'
import { useTeamPendingActions } from '../../hooks/useTeamPendingActions'
import { useTeamCapacity } from '../../hooks/useTeamCapacity'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamMember, TeamAbsenceToday, CapacityRow, AbsenceNetEntry, Anomaly } from '../../types/types'
import {
  formatMinutes,
  toDateString,
  toLocalDateKey,
  toComparableDateKey,
  isWorkingDay,
  getPlannedMinutesForDate
} from '../../utils/timeUtils'
import { toAvatarSrc, goToProfile } from '../../utils/employeeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { GET_TEAM_ABSENCE_NET_FOR_RANGE } from '../../queries/queries'
import { DetailsSheet } from '../DetailsSheet'
import {
  buildApprovedNonWorkTimeOffByEmployeeDate,
  expandDetailedAbsencesToCalendarDays,
  fetchTeamDetailedAbsences,
  fetchTeamHolidayData,
  getActiveLocale,
  getTimeOffFractionForEmployeeDate,
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

type PanelKey = Exclude<PanelType, null>
const t = (key: string, fallback: string, vars?: Record<string, unknown>) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:my_team_time.${key}`, fallback, vars)

const DAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, index + 1))
)

const formatShortDayCount = (count: number): string => {
  const normalizedCount = Number.isInteger(count) ? String(count) : count.toFixed(1).replace(/\.0$/, '')
  const template = t('days_short', '{{count}}d', { count: normalizedCount })

  if (template.includes('{{count}}')) {
    return template.replace(/\{\{count\}\}/g, normalizedCount)
  }

  if (template.includes('{count}')) {
    return template.replace(/\{count\}/g, normalizedCount)
  }

  return template
}

const getUniqueAbsencesByEmployee = (absences: TeamAbsenceToday[]): TeamAbsenceToday[] => {
  return Array.from(new Map(absences.map(absence => [absence.employeeId, absence])).values())
}

const formatNamePreview = (items: Array<{ firstName?: string; name?: string }>, max = 2): string => {
  if (items.length === 0) return ''
  const shown = items.slice(0, max).map(m => m.firstName ?? m.name ?? '')
  const remaining = items.length - shown.length
  return remaining > 0 ? `${shown.join(' · ')} · +${remaining}` : shown.join(' · ')
}

const formatSickWorkAwayPreview = (entries: Array<{ name: string; returnDate?: string }>): string => {
  if (entries.length === 0) return ''
  if (entries.length === 1) {
    const first = entries[0]
    return first.returnDate ? `${first.name} · ${first.returnDate}` : first.name
  }
  const shown = entries.slice(0, 3).map(e => e.name)
  const remaining = entries.length - shown.length
  return remaining > 0 ? `${shown.join(' · ')} · +${remaining}` : shown.join(' · ')
}

const formatAnomalyPreview = (anomalies: Anomaly[], severeCount: number): string => {
  if (anomalies.length === 0) return ''
  if (severeCount > 0) {
    return `${severeCount} ${t('severe', 'severe')} · +${anomalies.length - severeCount}`
  }
  return formatNamePreview(anomalies.map(a => ({ firstName: a.employeeName.split(' ')[0] })))
}

const formatPendingPreview = (total: number, absenceCount: number): string => {
  if (total === 0) return t('all_caught_up', 'All caught up')
  if (absenceCount > 0) return `${absenceCount} ${t('approvals_due', 'approvals due')}`
  return t('corrections_pending', 'corrections pending')
}

const formatActionDescription = (action: any): string => {
  if (action.kind === 'absence') {
    const label = action.typeLabel || t('absence_request', 'Absence request')
    const duration = action.effectiveDays
      ? formatShortDayCount(action.effectiveDays)
      : `${new Date(action.startDate || '').toLocaleDateString()} – ${new Date(action.endDate || '').toLocaleDateString()}`
    return `${label} · ${duration}`
  }
  const date = new Date(action.attendanceDate || action.createdAt).toLocaleDateString()
  return `${t('time_correction_request', 'Time correction request')} · ${date}`
}

const formatShortName = (firstName: string, lastName?: string): string =>
  lastName ? `${firstName} ${lastName[0]}.` : firstName

const formatAbsencePeriod = (absence: Pick<TeamAbsenceToday, 'startDate' | 'endDate'>): string => {
  if (!absence.startDate || !absence.endDate) {
    return ''
  }

  const startLabel = new Date(absence.startDate).toLocaleDateString()
  const endLabel = new Date(absence.endDate).toLocaleDateString()
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`
}

const splitEmployeeName = (employeeName?: string): { firstName?: string; lastName?: string } => {
  const [firstName, ...rest] = String(employeeName || '').split(' ')
  return { firstName, lastName: rest.join(' ') }
}

const filterMembersByHireDateOnOrBefore = (list: TeamMember[], referenceDate: Date): TeamMember[] => {
  const referenceKey = toLocalDateKey(referenceDate)
  return list.filter(member => {
    const hireDateKey = toComparableDateKey(member.hireDate)
    if (!hireDateKey) {
      return true
    }

    return hireDateKey <= referenceKey
  })
}

interface AbsenceMemberListProps {
  absences: TeamAbsenceToday[]
  emptyText: string
}

const AbsenceMemberList: React.FC<AbsenceMemberListProps> = ({ absences, emptyText }) => {
  if (absences.length === 0) {
    return <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">{emptyText}</div>
  }

  return (
    <div className="gba:divide-y gba:divide-border">
      {absences.map(absence => {
        const { firstName, lastName } = splitEmployeeName(absence.employeeName)
        const periodLabel = formatAbsencePeriod(absence)
        return (
          <div key={absence.employeeAbsenceId} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
            <EmployeeAvatar firstName={firstName} lastName={lastName} pictureThumbnail={absence.pictureThumbnail} />
            <div className="gba:min-w-0">
              <EmployeeName id={absence.employeeId} firstName={firstName} lastName={lastName} />
              <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                {absence.typeLabel || absence.typeRef} {periodLabel ? `· ${periodLabel}` : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

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

interface DashboardPanelContentProps {
  activePanel: PanelType
  members: TeamMember[]
  status: { workingNow: TeamMember[]; notClockedIn: TeamMember[]; anomalies: Anomaly[] }
  todayAttendanceByEmployee: Map<string, any>
  latestClosedAttendanceByEmployee: Map<string, any>
  todayStr: string
  leaveAbsences: TeamAbsenceToday[]
  workAbsences: TeamAbsenceToday[]
  sickAbsences: TeamAbsenceToday[]
  overtimeRows: CapacityRow[]
  pendingLoading: boolean
  pendingActions: Array<any>
  selectedForecastDay: string | null
  forecastAvailableMembers: TeamMember[]
  forecastUnavailableMembers: Array<{ member: TeamMember; reason: string }>
}

const DashboardPanelContent: React.FC<DashboardPanelContentProps> = ({
  activePanel,
  members,
  status,
  todayAttendanceByEmployee,
  latestClosedAttendanceByEmployee,
  todayStr,
  leaveAbsences,
  workAbsences,
  sickAbsences,
  overtimeRows,
  pendingLoading,
  pendingActions,
  selectedForecastDay,
  forecastAvailableMembers,
  forecastUnavailableMembers
}) => {
  switch (activePanel) {
    case 'team-size':
      return <MemberList members={members} emptyText={t('no_subordinates_found', 'No direct reports found.')} />
    case 'working-now':
      return (
        <WorkingNowPanel
          workingNow={status.workingNow}
          todayAttendanceByEmployee={todayAttendanceByEmployee}
          todayStr={todayStr}
        />
      )
    case 'not-clocked-in':
      return (
        <NotClockedInPanel
          notClockedIn={status.notClockedIn}
          latestClosedAttendanceByEmployee={latestClosedAttendanceByEmployee}
        />
      )
    case 'on-leave':
      return (
        <AbsenceMemberList
          absences={leaveAbsences}
          emptyText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:my_team_time.no_one_on_leave',
            'No one is on leave today.'
          )}
        />
      )
    case 'work-away':
      return (
        <AbsenceMemberList
          absences={workAbsences}
          emptyText={t('no_one_work_away', 'No one has a WORK absence today.')}
        />
      )
    case 'sick-today':
      return (
        <AbsenceMemberList
          absences={sickAbsences}
          emptyText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:my_team_time.no_one_sick',
            'No one is on sick leave today.'
          )}
        />
      )
    case 'overtime-mtd':
      return <OvertimePanel overtimeRows={overtimeRows} />
    case 'anomalies':
      return <AnomaliesPanel anomalies={status.anomalies} />
    case 'pending':
      return <PendingPanel pendingLoading={pendingLoading} pendingActions={pendingActions} />
    case 'forecast-day':
      return (
        <ForecastDayPanel
          selectedDay={selectedForecastDay}
          availableMembers={forecastAvailableMembers}
          unavailableMembers={forecastUnavailableMembers}
        />
      )
    default:
      return null
  }
}

const WorkingNowPanel: React.FC<{
  workingNow: TeamMember[]
  todayAttendanceByEmployee: Map<string, any>
  todayStr: string
}> = ({ workingNow, todayAttendanceByEmployee, todayStr }) => {
  if (workingNow.length === 0) {
    return (
      <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.no_one_clocked_in',
          'No one is clocked in right now.'
        )}
      </div>
    )
  }
  return (
    <div className="gba:divide-y gba:divide-border">
      {workingNow.map(member => {
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
      })}
    </div>
  )
}

const NotClockedInPanel: React.FC<{
  notClockedIn: TeamMember[]
  latestClosedAttendanceByEmployee: Map<string, any>
}> = ({ notClockedIn, latestClosedAttendanceByEmployee }) => {
  if (notClockedIn.length === 0) {
    return (
      <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.everyone_clocked_in',
          'Everyone expected today has clocked in.'
        )}
      </div>
    )
  }
  return (
    <div className="gba:divide-y gba:divide-border">
      {notClockedIn.map(member => {
        const lastEntry = latestClosedAttendanceByEmployee.get(member.id)
        const sinceLabel = lastEntry?.endTime
          ? `${new Date(lastEntry.attendanceDate).toLocaleDateString()} ${new Date(lastEntry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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
      })}
    </div>
  )
}

const OvertimePanel: React.FC<{ overtimeRows: CapacityRow[] }> = ({ overtimeRows }) => {
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
            <EmployeeName id={row.employee.id} firstName={row.employee.firstName} lastName={row.employee.lastName} />
          </div>
          <span className="gba:text-sm gba:font-medium gba:text-warning">{formatMinutes(row.overtimeMinutes)}</span>
        </div>
      ))}
    </div>
  )
}

const AnomaliesPanel: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  if (anomalies.length === 0) {
    return (
      <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
        {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_anomalies', 'No anomalies detected.')}
      </div>
    )
  }
  return (
    <div className="gba:space-y-2">
      {anomalies.map((anomaly, idx) => (
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
}

const PendingPanel: React.FC<{ pendingLoading: boolean; pendingActions: Array<any> }> = ({
  pendingLoading,
  pendingActions
}) => {
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
                {formatActionDescription(action)}
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
}

const ForecastDayPanel: React.FC<{
  selectedDay: string | null
  availableMembers: TeamMember[]
  unavailableMembers: Array<{ member: TeamMember; reason: string }>
}> = ({ selectedDay, availableMembers, unavailableMembers }) => {
  if (!selectedDay) return null
  return (
    <div className="gba:space-y-4">
      <div>
        <div className="gba:mb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
          {t('expected_available', 'Expected available')}
        </div>
        {availableMembers.length === 0 ? (
          <div className="gba:text-sm gba:text-muted-foreground">{t('no_one_available', 'No one available.')}</div>
        ) : (
          <MemberList members={availableMembers} emptyText="" />
        )}
      </div>
      <div>
        <div className="gba:mb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
          {t('expected_off', 'Expected off')}
        </div>
        {unavailableMembers.length === 0 ? (
          <div className="gba:text-sm gba:text-muted-foreground">{t('no_one_off', 'No one is off that day.')}</div>
        ) : (
          <div className="gba:divide-y gba:divide-border">
            {unavailableMembers.map(({ member, reason }) => (
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

const getBalanceClass = (minutes: number): string => {
  if (minutes > 0) {
    return 'gba:text-success gba:font-semibold'
  }
  if (minutes < 0) {
    return 'gba:text-destructive gba:font-semibold'
  }
  return 'gba:text-muted-foreground'
}

const buildCalendarWeeks = (month: Date): { weekLabel: string; days: { date: string; dayOfWeek: number }[] }[] => {
  const weeks: { weekLabel: string; days: { date: string; dayOfWeek: number }[] }[] = []
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

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

const computeForecastCell = (
  date: string,
  members: TeamMember[],
  holidayDatesByEmployeeId: Map<string, Set<string>>,
  timeOffByEmployeeDate: Map<string, number>
): { available: number; total: number; pct: number } => {
  const workingMembers = members.filter(member => {
    if (!isWorkingDay(date, member.workingHours)) return false
    return !holidayDatesByEmployeeId.get(member.id)?.has(date)
  })
  const total = workingMembers.length
  const fullyUnavailableCount = workingMembers.filter(
    member => getTimeOffFractionForEmployeeDate(timeOffByEmployeeDate, member.id, date) >= 1
  ).length
  const available = Math.max(0, total - fullyUnavailableCount)
  const pct = total > 0 ? Math.round((available / total) * 100) : 100
  return { available, total, pct }
}

const computeForecastCellReason = (
  date: string,
  members: TeamMember[],
  holidayDatesByEmployeeId: Map<string, Set<string>>,
  timeOffByEmployeeDate: Map<string, number>,
  absences: TeamAbsenceToday[]
): string => {
  const offNames: string[] = []
  const awayNames: string[] = []

  members.forEach(member => {
    if (!isWorkingDay(date, member.workingHours)) return
    if (holidayDatesByEmployeeId.get(member.id)?.has(date)) return
    if (getTimeOffFractionForEmployeeDate(timeOffByEmployeeDate, member.id, date) < 1) return

    const absence = absences.find(a => a.employeeId === member.id && a.dayDate === date && a.status === 'APPROVED')

    if (absence && isWorkAbsence(absence)) {
      awayNames.push(member.firstName)
    } else {
      offNames.push(member.firstName)
    }
  })

  const parts: string[] = []
  if (offNames.length === 1) parts.push(`${offNames[0]} OOF`)
  else if (offNames.length > 1) parts.push(`${offNames.length} OOF`)
  if (awayNames.length === 1) parts.push(`${awayNames[0]} away`)
  else if (awayNames.length > 1) parts.push(`${awayNames.length} away`)

  return parts.join(', ')
}

const formatUnavailableReason = (absence?: TeamAbsenceToday): string => {
  if (!absence) return t('approved_absence', 'Approved absence')
  const periodLabel = formatAbsencePeriod(absence)
  const typeLabel = absence.typeLabel || absence.typeRef
  return periodLabel ? `${typeLabel} · ${periodLabel}` : typeLabel
}

const buildForecastUnavailableMembers = (
  selectedDay: string,
  members: TeamMember[],
  holidayNamesByEmployeeId: Map<string, Record<string, string>>,
  timeOffByEmployeeDate: Map<string, number>,
  absences: TeamAbsenceToday[]
): Array<{ member: TeamMember; reason: string }> =>
  members.flatMap(member => {
    if (!isWorkingDay(selectedDay, member.workingHours)) return []

    const holidayLabel = holidayNamesByEmployeeId.get(member.id)?.[selectedDay]
    if (holidayLabel) return [{ member, reason: holidayLabel }]

    if (getTimeOffFractionForEmployeeDate(timeOffByEmployeeDate, member.id, selectedDay) < 1) return []

    const absence = absences.find(
      item =>
        item.employeeId === member.id &&
        item.dayDate === selectedDay &&
        item.status === 'APPROVED' &&
        !isWorkAbsence(item)
    )

    const reason = formatUnavailableReason(absence)
    return [{ member, reason }]
  })

const buildForecastAvailableMembers = (
  selectedDay: string,
  members: TeamMember[],
  holidayDatesByEmployeeId: Map<string, Set<string>>,
  timeOffByEmployeeDate: Map<string, number>
): TeamMember[] =>
  members.filter(member => {
    if (!isWorkingDay(selectedDay, member.workingHours)) return false
    if (holidayDatesByEmployeeId.get(member.id)?.has(selectedDay)) return false
    return getTimeOffFractionForEmployeeDate(timeOffByEmployeeDate, member.id, selectedDay) < 1
  })

const buildSickWorkAwayEntries = (
  sickAbsences: TeamAbsenceToday[],
  workAbsences: TeamAbsenceToday[]
): Array<{ name: string; employeeId: string; returnDate?: string }> => {
  const entries: Array<{ name: string; employeeId: string; returnDate?: string }> = []
  const seen = new Set<string>()

  ;[...sickAbsences, ...workAbsences].forEach(a => {
    if (seen.has(a.employeeId)) return
    seen.add(a.employeeId)
    entries.push({
      name: formatShortName(a.employeeName?.split(' ')[0] || '', a.employeeName?.split(' ').slice(1).join(' ')),
      employeeId: a.employeeId,
      returnDate: a.endDate
        ? `${t('returns', 'Returns')} ${new Date(a.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : undefined
    })
  })
  return entries
}

const getCalendarRange = (month: Date): { from: string; to: string } => {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const dow = monthStart.getDay()
  const calStart = new Date(monthStart)
  calStart.setDate(monthStart.getDate() - ((dow + 6) % 7))
  const calEnd = new Date(monthEnd)
  const endDow = monthEnd.getDay()
  if (endDow !== 0) calEnd.setDate(monthEnd.getDate() + (7 - endDow))
  return { from: toDateString(calStart), to: toDateString(calEnd) }
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

const sortCapacityRows = (rows: CapacityRow[], key: SortKey, dir: SortDir): CapacityRow[] =>
  [...rows].sort((a, b) => {
    const va = getSortValue(a, key)
    const vb = getSortValue(b, key)
    const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb)
    return dir === 'asc' ? cmp : -cmp
  })

const buildLatestClosedAttendanceMap = (
  entries: Array<{ employeeId: string; endTime?: string | null; attendanceDate: string }>
): Map<string, (typeof entries)[number]> => {
  const map = new Map<string, (typeof entries)[number]>()
  entries.forEach(entry => {
    if (entry.endTime && !map.has(entry.employeeId)) {
      map.set(entry.employeeId, entry)
    }
  })
  return map
}

const CapacityTableContent: React.FC<{
  isLoading: boolean
  error: string | null
  rows: CapacityRow[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}> = ({ isLoading: loading, error, rows, sortKey: sk, sortDir: sd, onSort }) => {
  if (loading) {
    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }
  if (error) {
    return <div className="gba:text-center gba:py-12 gba:text-destructive">{error}</div>
  }
  if (rows.length === 0) {
    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_data_available', 'No data available.')}
      </div>
    )
  }
  return (
    <div className="gba:overflow-x-auto">
      <table className="gba:w-full gba:text-left gba:text-sm">
        <thead>
          <tr className="gba:border-b gba:border-border gba:bg-muted/30">
            <SortHeader
              label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.employee', 'Employee')}
              sortKeyValue="name"
              sortKey={sk}
              sortDir={sd}
              onSort={onSort}
            />
            <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.target', 'Target')}
            </th>
            <SortHeader
              label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.worked', 'Worked')}
              sortKeyValue="worked"
              sortKey={sk}
              sortDir={sd}
              onSort={onSort}
            />
            <SortHeader
              label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime', 'Overtime')}
              sortKeyValue="overtime"
              sortKey={sk}
              sortDir={sd}
              onSort={onSort}
            />
            <SortHeader
              label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.deficit', 'Deficit')}
              sortKeyValue="deficit"
              sortKey={sk}
              sortDir={sd}
              onSort={onSort}
            />
            <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pto_used', 'PTO Used')}
            </th>
            <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_days', 'Sick Days')}
            </th>
            <SortHeader
              label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overall_balance', 'Overall Balance')}
              sortKeyValue="balance"
              sortKey={sk}
              sortDir={sd}
              onSort={onSort}
            />
            <SortHeader
              label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.missing', 'Missing')}
              sortKeyValue="missing"
              sortKey={sk}
              sortDir={sd}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
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

export const DashboardTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, allMembers, isLoading: membersLoading } = useTeamMembers(props)
  const {
    status,
    todayAttendance,
    todayAbsences,
    monthAttendance,
    isLoading: statusLoading
  } = useTeamOperationalStatus(props.accessToken, members, memberIds)
  const { pendingActions, isLoading: pendingLoading } = useTeamPendingActions(props, members)

  const [capacityExpanded, setCapacityExpanded] = useState(false)
  const {
    rows: capacityRows,
    currentMonth,
    prevMonth,
    nextMonth,
    isLoading: capacityLoading,
    error: capacityError
  } = useTeamCapacity(
    props.accessToken,
    capacityExpanded ? members : [],
    capacityExpanded ? memberIds : [],
    capacityExpanded ? monthAttendance : undefined,
    capacityExpanded ? allMembers : undefined
  )

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
  const [forecastTimeOffByEmployeeDate, setForecastTimeOffByEmployeeDate] = useState<Map<string, number>>(new Map())
  const [forecastLoading, setForecastLoading] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [selectedForecastDay, setSelectedForecastDay] = useState<string | null>(null)

  const [forecastMonth, setForecastMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const forecastMonthEnd = useMemo(
    () => new Date(forecastMonth.getFullYear(), forecastMonth.getMonth() + 1, 0),
    [forecastMonth]
  )
  const forecastMembers = useMemo(
    () => filterMembersByHireDateOnOrBefore(allMembers, forecastMonthEnd),
    [allMembers, forecastMonthEnd]
  )
  const forecastMemberIds = useMemo(() => forecastMembers.map(member => member.id), [forecastMembers])

  const forecastMonthLabel = forecastMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  const prevForecastMonth = useCallback(() => {
    setForecastMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])
  const nextForecastMonth = useCallback(() => {
    setForecastMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  const fetchForecast = useCallback(async () => {
    if (!graphqlClient || forecastMemberIds.length === 0) {
      setForecastAbsences([])
      setForecastHolidayDatesByEmployeeId(new Map())
      setForecastHolidayNamesByEmployeeId(new Map())
      setForecastTimeOffByEmployeeDate(new Map())
      return
    }
    setForecastLoading(true)
    const { from, to } = getCalendarRange(forecastMonth)
    const locale = getActiveLocale()
    try {
      const [detailedAbsences, holidayData, absenceNetResult] = await Promise.all([
        fetchTeamDetailedAbsences(graphqlClient, forecastMemberIds, from, to, locale),
        fetchTeamHolidayData(graphqlClient, forecastMemberIds, from, to, locale),
        graphqlClient.request<any>(GET_TEAM_ABSENCE_NET_FOR_RANGE, {
          employeeIds: forecastMemberIds,
          from,
          to
        })
      ])

      const expandedForecastAbsences = expandDetailedAbsencesToCalendarDays(detailedAbsences, from, to)
      setForecastAbsences(expandedForecastAbsences)
      setForecastHolidayDatesByEmployeeId(holidayData.datesByEmployeeId)
      setForecastHolidayNamesByEmployeeId(holidayData.namesByEmployeeId)
      const absenceNetRows: AbsenceNetEntry[] = absenceNetResult?.DailyAbsenceNetView ?? []
      const dailyTimeOffFraction = buildApprovedNonWorkTimeOffByEmployeeDate(expandedForecastAbsences, absenceNetRows)
      setForecastTimeOffByEmployeeDate(dailyTimeOffFraction)
    } catch {
      setForecastTimeOffByEmployeeDate(new Map())
    } finally {
      setForecastLoading(false)
    }
  }, [graphqlClient, forecastMemberIds, forecastMonth])

  useEffect(() => {
    if (props.accessToken) fetchForecast()
  }, [props.accessToken, forecastMemberIds, fetchForecast])

  const isLoading = membersLoading || statusLoading

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => (prev === panel ? null : panel))
  }

  const calendarWeeks = buildCalendarWeeks(forecastMonth)
  const todayStr = toLocalDateKey(new Date())

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const nonTimeRelevantIds = useMemo(() => {
    const ids = new Set<string>()
    allMembers.forEach(m => {
      if (m.timeRelevant === false) ids.add(m.id)
    })
    return ids
  }, [allMembers])
  const timeRelevantCapacityRows = capacityRows.filter(row => !nonTimeRelevantIds.has(row.employee.id))
  const sortedRows = sortCapacityRows(timeRelevantCapacityRows, sortKey, sortDir)

  const monthLabel = currentMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
  const pendingActionCount = pendingActions.length
  const todayAttendanceByEmployee = new Map(todayAttendance.map(entry => [entry.employeeId, entry]))
  const latestClosedAttendanceByEmployee = buildLatestClosedAttendanceMap(monthAttendance)

  const leaveAbsences = useMemo(
    () =>
      getUniqueAbsencesByEmployee(todayAbsences.filter(absence => !isSickAbsence(absence) && !isWorkAbsence(absence))),
    [todayAbsences]
  )
  const workAbsences = useMemo(
    () => getUniqueAbsencesByEmployee(todayAbsences.filter(absence => isWorkAbsence(absence))),
    [todayAbsences]
  )
  const sickAbsences = useMemo(
    () => getUniqueAbsencesByEmployee(todayAbsences.filter(absence => isSickAbsence(absence))),
    [todayAbsences]
  )
  const overtimeRows = useMemo(
    () =>
      [...capacityRows]
        .filter(row => row.overtimeMinutes > 0)
        .sort((left, right) => right.overtimeMinutes - left.overtimeMinutes),
    [capacityRows]
  )

  const oofMembers = useMemo(
    () =>
      leaveAbsences.map(a => ({
        name: formatShortName(a.employeeName?.split(' ')[0] || '', a.employeeName?.split(' ').slice(1).join(' ')),
        employeeId: a.employeeId
      })),
    [leaveAbsences]
  )

  const sickWorkAwayEntries = useMemo(
    () => buildSickWorkAwayEntries(sickAbsences, workAbsences),
    [sickAbsences, workAbsences]
  )

  const selectedForecastDateLabel = selectedForecastDay
    ? new Date(`${selectedForecastDay}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : ''
  const forecastAvailableMembers = selectedForecastDay
    ? buildForecastAvailableMembers(
        selectedForecastDay,
        forecastMembers,
        forecastHolidayDatesByEmployeeId,
        forecastTimeOffByEmployeeDate
      )
    : []
  const forecastUnavailableMembers = selectedForecastDay
    ? buildForecastUnavailableMembers(
        selectedForecastDay,
        forecastMembers,
        forecastHolidayNamesByEmployeeId,
        forecastTimeOffByEmployeeDate,
        forecastAbsences
      )
    : []

  const panelMeta: Record<PanelKey, { title: string; description: string; icon: React.ReactNode }> = {
    'team-size': {
      title: t('total_subordinate_employees', 'Total Subordinate Employees'),
      description: t('desc_total_subordinates', 'Direct reports included in this dashboard'),
      icon: <UsersThreeIcon size={20} />
    },
    'working-now': {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.working_now', 'Working Now'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_working_now',
        'Team members currently clocked in'
      ),
      icon: <UsersThreeIcon size={20} />
    },
    'not-clocked-in': {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.not_clocked_in', 'Not Clocked In'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_not_clocked_in',
        'Expected today but no attendance record yet'
      ),
      icon: <ClockIcon size={20} />
    },
    'on-leave': {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.on_leave_today', 'On Leave Today'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_on_leave',
        'On approved leave today (excluding sick and WORK absences)'
      ),
      icon: <CalendarIcon size={20} />
    },
    'work-away': {
      title: t('work_away_today', 'Work Away Today'),
      description: t('desc_work_away', 'Employees marked with WORK absences such as remote work or business trips'),
      icon: <BriefcaseIcon size={20} />
    },
    'sick-today': {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_today', 'Sick Today'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_sick_today',
        'On approved sick leave today'
      ),
      icon: <HeartbeatIcon size={20} />
    },
    'overtime-mtd': {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime_mtd', 'Overtime MTD'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_overtime_mtd',
        'Total overtime accumulated across the team this month'
      ),
      icon: <TimerIcon size={20} />
    },
    anomalies: {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.active_anomalies', 'Active Anomalies'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_anomalies',
        'Missing logs, unclosed clock-outs, and other issues'
      ),
      icon: <WarningIcon size={20} />
    },
    pending: {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pending_actions', 'Pending Actions'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.desc_pending',
        'Absence requests and time corrections awaiting your review'
      ),
      icon: <FileTextIcon size={20} />
    },
    'forecast-day': {
      title: t('forecast_day_details', 'Capacity Forecast Details'),
      description: selectedForecastDateLabel,
      icon: <CalendarIcon size={20} />
    }
  }
  const activePanelMeta = activePanel ? panelMeta[activePanel] : null

  const panelContentProps: DashboardPanelContentProps = {
    activePanel,
    members,
    status,
    todayAttendanceByEmployee,
    latestClosedAttendanceByEmployee,
    todayStr,
    leaveAbsences,
    workAbsences,
    sickAbsences,
    overtimeRows,
    pendingLoading,
    pendingActions,
    selectedForecastDay,
    forecastAvailableMembers,
    forecastUnavailableMembers
  }

  if (isLoading) {
    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground" data-testid="my-team-time-dashboard-loading">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }

  const capacityContent = (
    <CapacityTableContent
      isLoading={capacityLoading}
      error={capacityError}
      rows={sortedRows}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
    />
  )

  const severeAnomalyCount = status.anomalies.filter(a => a.type === 'no_clock_out').length
  const pendingAbsenceCount = pendingActions.filter(a => a.kind === 'absence').length
  const overtimeEmployeeCount = overtimeRows.length

  return (
    <div className="gba:space-y-6" data-testid="my-team-time-dashboard">
      {/* Needs attention */}
      <Card data-testid="needs-attention-section">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:font-semibold">{t('needs_attention', 'Needs attention')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          <div className="gba:grid gba:grid-cols-2 gba:lg:grid-cols-4 gba:gap-3">
            {/* Not clocked in */}
            <Card
              className={`gba:cursor-pointer gba:border gba:transition-colors hover:gba:bg-muted/20 ${
                activePanel === 'not-clocked-in'
                  ? 'gba:ring-2 gba:ring-primary gba:border-primary'
                  : 'gba:border-border'
              }`}
              onClick={() => togglePanel('not-clocked-in')}
              data-testid="alert-card-not-clocked-in"
            >
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-warning/10 gba:text-warning">
                    <ClockIcon size={20} />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.not_clocked_in', 'Not clocked in')}
                    </div>
                    <div
                      className={`gba:text-2xl gba:font-bold gba:leading-tight ${status.notClockedIn.length > 0 ? 'gba:text-warning' : 'gba:text-foreground'}`}
                    >
                      {status.notClockedIn.length}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                      {status.notClockedIn.length > 0
                        ? formatNamePreview(status.notClockedIn)
                        : t('all_clocked_in', 'All clocked in')}
                    </div>
                  </div>
                  <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0 gba:mt-3" />
                </div>
              </CardContent>
            </Card>

            {/* Anomalies */}
            <Card
              className={`gba:cursor-pointer gba:border gba:transition-colors hover:gba:bg-muted/20 ${
                activePanel === 'anomalies' ? 'gba:ring-2 gba:ring-primary gba:border-primary' : 'gba:border-border'
              }`}
              onClick={() => togglePanel('anomalies')}
              data-testid="alert-card-anomalies"
            >
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-destructive/10 gba:text-destructive">
                    <WarningIcon size={20} />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.anomalies', 'Anomalies')}
                    </div>
                    <div
                      className={`gba:text-2xl gba:font-bold gba:leading-tight ${status.anomalies.length > 0 ? 'gba:text-destructive' : 'gba:text-foreground'}`}
                    >
                      {status.anomalies.length}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                      {formatAnomalyPreview(status.anomalies, severeAnomalyCount) ||
                        t('no_anomalies_short', 'No issues')}
                    </div>
                  </div>
                  <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0 gba:mt-3" />
                </div>
              </CardContent>
            </Card>

            {/* Pending actions */}
            <Card
              className={`gba:cursor-pointer gba:border gba:transition-colors hover:gba:bg-muted/20 ${
                activePanel === 'pending' ? 'gba:ring-2 gba:ring-primary gba:border-primary' : 'gba:border-border'
              }`}
              onClick={() => togglePanel('pending')}
              data-testid="alert-card-pending"
            >
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-warning/10 gba:text-warning">
                    <FileTextIcon size={20} />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pending_actions', 'Pending actions')}
                    </div>
                    <div
                      className={`gba:text-2xl gba:font-bold gba:leading-tight ${pendingActionCount > 0 ? 'gba:text-warning' : 'gba:text-foreground'}`}
                    >
                      {pendingLoading ? '…' : pendingActionCount}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                      {formatPendingPreview(pendingActionCount, pendingAbsenceCount)}
                    </div>
                  </div>
                  <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0 gba:mt-3" />
                </div>
              </CardContent>
            </Card>

            {/* Overtime missing */}
            <Card
              className={`gba:cursor-pointer gba:border gba:transition-colors hover:gba:bg-muted/20 ${
                activePanel === 'overtime-mtd' ? 'gba:ring-2 gba:ring-primary gba:border-primary' : 'gba:border-border'
              }`}
              onClick={() => togglePanel('overtime-mtd')}
              data-testid="alert-card-overtime"
            >
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-info/10 gba:text-info">
                    <TimerIcon size={20} />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {t('overtime_missing', 'Overtime missing')}
                    </div>
                    <div
                      className={`gba:text-2xl gba:font-bold gba:leading-tight ${status.overtimeMinutesMTD > 0 ? 'gba:text-info' : 'gba:text-foreground'}`}
                    >
                      {formatMinutes(status.overtimeMinutesMTD)}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                      {overtimeEmployeeCount > 0
                        ? `${overtimeEmployeeCount} ${t('people', 'people')}`
                        : t('no_overtime', 'No overtime')}
                    </div>
                  </div>
                  <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0 gba:mt-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Availability today */}
      <Card data-testid="availability-today-section">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:font-semibold">
            {t('availability_today', 'Availability today')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          <div className="gba:grid gba:grid-cols-3 gba:divide-x gba:divide-border">
            {/* Working now */}
            <button
              type="button"
              className="gba:pr-5 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
              onClick={() => togglePanel('working-now')}
              data-testid="availability-working-now"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-success/10 gba:text-success">
                  <UsersThreeIcon size={20} />
                </div>
                <div>
                  <div className="gba:text-sm gba:font-medium">{t('working_now_label', 'Working now')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    {status.workingNow.length > 0
                      ? formatNamePreview(status.workingNow, 3)
                      : t('no_one_clocked_in_yet', 'No one clocked in yet')}
                  </div>
                </div>
              </div>
            </button>

            {/* OOF / unavailable */}
            <button
              type="button"
              className="gba:px-5 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
              onClick={() => togglePanel('on-leave')}
              data-testid="availability-oof"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-info/10 gba:text-info">
                  <CalendarIcon size={20} />
                </div>
                <div className="gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium">{t('oof_unavailable', 'OOF / unavailable')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                    {formatNamePreview(oofMembers, 4) || t('no_one_oof', 'No one is off today')}
                  </div>
                </div>
              </div>
            </button>

            {/* Sick / work away */}
            <button
              type="button"
              className="gba:pl-5 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
              onClick={() => togglePanel('sick-today')}
              data-testid="availability-sick"
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-destructive/10 gba:text-destructive">
                  <HeartbeatIcon size={20} />
                </div>
                <div className="gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium">{t('sick_work_away', 'Sick / work away')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                    {formatSickWorkAwayPreview(sickWorkAwayEntries) ||
                      t('no_one_sick_or_away', 'No one is sick or away')}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

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
                        const { pct, available, total } = computeForecastCell(
                          day.date,
                          forecastMembers,
                          forecastHolidayDatesByEmployeeId,
                          forecastTimeOffByEmployeeDate
                        )
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

                        const reason =
                          pct < 100
                            ? computeForecastCellReason(
                                day.date,
                                forecastMembers,
                                forecastHolidayDatesByEmployeeId,
                                forecastTimeOffByEmployeeDate,
                                forecastAbsences
                              )
                            : ''

                        return (
                          <td key={day.date} className="gba:py-1.5 gba:px-1">
                            <button
                              type="button"
                              className={`gba:relative gba:flex ${reason ? 'gba:h-14' : 'gba:h-10'} gba:flex-col gba:items-center gba:justify-center gba:overflow-hidden gba:rounded ${
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
                              {reason && (
                                <span className="gba:text-[10px] gba:text-muted-foreground gba:relative gba:z-10 gba:leading-tight gba:truncate gba:max-w-full gba:px-0.5">
                                  {reason}
                                </span>
                              )}
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
        <CardHeader className="gba:cursor-pointer gba:select-none" onClick={() => setCapacityExpanded(prev => !prev)}>
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CaretRightIcon
                className={`gba:h-4 gba:w-4 gba:text-muted-foreground gba:transition-transform ${capacityExpanded ? 'gba:rotate-90' : ''}`}
              />
              <CardTitle className="gba:text-base gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:my_team_time.monthly_capacity_balance',
                  'Monthly Capacity & Balance'
                )}
              </CardTitle>
            </div>
            {capacityExpanded && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    prevMonth()
                  }}
                  aria-label={t('previous_month', 'Previous month')}
                >
                  <CaretLeftIcon className="gba:h-4 gba:w-4" />
                </Button>
                <span className="gba:min-w-32 gba:px-3 gba:text-center gba:text-sm gba:font-medium">{monthLabel}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    nextMonth()
                  }}
                  aria-label={t('next_month', 'Next month')}
                >
                  <CaretRightIcon className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        {capacityExpanded && <CardContent className="gba:p-0">{capacityContent}</CardContent>}
      </Card>

      <DetailsSheet
        title={activePanelMeta?.title || ''}
        icon={activePanelMeta?.icon}
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        dataTestId="dashboard-details-drawer"
      >
        <div className="gba:mb-2 gba:text-sm gba:text-muted-foreground">{activePanelMeta?.description || ''}</div>
        <DashboardPanelContent {...panelContentProps} />
      </DetailsSheet>
    </div>
  )
}
