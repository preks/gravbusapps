import React, { useState, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Progress,
  Badge
} from '@newwork/nw-design-system'
import { Users, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import type { TeamMemberPerformance } from '../../hooks/useTeamPerformance'
import type { TeamMemberFeedback } from '../../hooks/useTeamFeedbackOverview'
import type { TeamMemberSkills } from '../../hooks/useTeamSkills'
import type { DashboardAlert, TalentSignal } from '../../utils/dashboardComputations'

interface TeamMemberTableProps {
  evaluations: TeamMemberEvaluation[]
  goals: TeamMemberPerformance[]
  feedback: TeamMemberFeedback[]
  skills: TeamMemberSkills[]
  alerts: DashboardAlert[]
  signals: TalentSignal[]
  onEmployeeClick: (employeeId: string) => void
  loading: boolean
}

type SortColumn = 'employee' | 'overall' | 'change' | 'goals' | 'feedback' | 'skills' | 'flags'

type SortDirection = 'asc' | 'desc'

interface RowModel {
  evaluation: TeamMemberEvaluation
  goalRow: TeamMemberPerformance | undefined
  feedbackRow: TeamMemberFeedback | undefined
  skillsRow: TeamMemberSkills | undefined
  employeeAlerts: DashboardAlert[]
  employeeSignals: TalentSignal[]
  flagsSortKey: number
}

const initialsFromName = (first: string, last: string): string => {
  const a = first.trim()[0] ?? ''
  const b = last.trim()[0] ?? ''
  const s = `${a}${b}`.toUpperCase()
  return s || '?'
}

const avatarSrc = (pictureThumbnail?: string): string | undefined =>
  pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined

const signalInitial = (signalType: TalentSignal['signalType']): string => signalType.charAt(0).toUpperCase()

export const TeamMemberTable: React.FC<TeamMemberTableProps> = ({
  evaluations,
  goals,
  feedback,
  skills,
  alerts,
  signals,
  onEmployeeClick,
  loading
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('employee')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const goalsMap = useMemo(() => new Map(goals.map(g => [g.employeeId, g])), [goals])
  const feedbackMap = useMemo(() => new Map(feedback.map(f => [f.employeeId, f])), [feedback])
  const skillsMap = useMemo(() => new Map(skills.map(s => [s.employeeId, s])), [skills])

  const alertsByEmployee = useMemo(() => {
    const m = new Map<string, DashboardAlert[]>()
    for (const a of alerts) {
      const list = m.get(a.employeeId) ?? []
      list.push(a)
      m.set(a.employeeId, list)
    }
    return m
  }, [alerts])

  const signalsByEmployee = useMemo(() => {
    const m = new Map<string, TalentSignal[]>()
    for (const s of signals) {
      const list = m.get(s.employeeId) ?? []
      list.push(s)
      m.set(s.employeeId, list)
    }
    return m
  }, [signals])

  const rows = useMemo((): RowModel[] => {
    return evaluations.map(ev => {
      const employeeAlerts = alertsByEmployee.get(ev.employeeId) ?? []
      const employeeSignals = signalsByEmployee.get(ev.employeeId) ?? []
      const high = employeeAlerts.filter(a => a.severity === 'high').length
      const medium = employeeAlerts.filter(a => a.severity === 'medium').length
      const low = employeeAlerts.filter(a => a.severity === 'low').length
      const flagsSortKey = high * 100 + medium * 10 + low + employeeSignals.length * 0.1
      return {
        evaluation: ev,
        goalRow: goalsMap.get(ev.employeeId),
        feedbackRow: feedbackMap.get(ev.employeeId),
        skillsRow: skillsMap.get(ev.employeeId),
        employeeAlerts,
        employeeSignals,
        flagsSortKey
      }
    })
  }, [evaluations, goalsMap, feedbackMap, skillsMap, alertsByEmployee, signalsByEmployee])

  const sortedRows = useMemo(() => {
    const mult = sortDirection === 'asc' ? 1 : -1
    const name = (ev: TeamMemberEvaluation) => `${ev.firstName} ${ev.lastName}`.trim().toLowerCase()

    return [...rows].sort((a, b) => {
      const evA = a.evaluation
      const evB = b.evaluation
      let cmp = 0
      switch (sortColumn) {
        case 'employee':
          cmp = name(evA).localeCompare(name(evB))
          break
        case 'overall': {
          const sa = evA.latestScore
          const sb = evB.latestScore
          if (sa == null && sb == null) cmp = 0
          else if (sa == null) cmp = 1
          else if (sb == null) cmp = -1
          else cmp = sa - sb
          break
        }
        case 'change': {
          const ca = evA.changeOverall
          const cb = evB.changeOverall
          if (ca == null && cb == null) cmp = 0
          else if (ca == null) cmp = 1
          else if (cb == null) cmp = -1
          else cmp = ca - cb
          break
        }
        case 'goals': {
          const ga = a.goalRow
          const gb = b.goalRow
          const oa = ga?.goalsOnTrack ?? 0
          const ob = gb?.goalsOnTrack ?? 0
          cmp = oa - ob
          if (cmp === 0) {
            const ta = ga?.totalGoals ?? 0
            const tb = gb?.totalGoals ?? 0
            cmp = ta - tb
          }
          break
        }
        case 'feedback': {
          const fa = a.feedbackRow?.feedbackReceivedCount ?? 0
          const fb = b.feedbackRow?.feedbackReceivedCount ?? 0
          cmp = fa - fb
          break
        }
        case 'skills': {
          const sa = a.skillsRow?.avgLevel ?? 0
          const sb = b.skillsRow?.avgLevel ?? 0
          cmp = sa - sb
          break
        }
        case 'flags':
          cmp = a.flagsSortKey - b.flagsSortKey
          break
      }
      return cmp * mult
    })
  }, [rows, sortColumn, sortDirection])

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection(col === 'employee' ? 'asc' : 'desc')
    }
  }

  const sortHeadClass = 'gba:cursor-pointer gba:select-none gba:whitespace-nowrap'

  const SortIndicator: React.FC<{ column: SortColumn }> = ({ column }) =>
    sortColumn === column ? (
      sortDirection === 'asc' ? (
        <ChevronUp className="gba:inline gba:h-4 gba:w-4 gba:shrink-0" />
      ) : (
        <ChevronDown className="gba:inline gba:h-4 gba:w-4 gba:shrink-0" />
      )
    ) : null

  return (
    <Card style={{ borderRadius: '12px' }} className="gba:overflow-hidden">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
          <Users className="gba:h-4 gba:w-4" />
          Team Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-0 gba:px-4 gba:pb-4">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('employee')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Employee
                    <SortIndicator column="employee" />
                  </span>
                </TableHead>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('overall')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Overall score
                    <SortIndicator column="overall" />
                  </span>
                </TableHead>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('change')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Score change
                    <SortIndicator column="change" />
                  </span>
                </TableHead>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('goals')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Goals
                    <SortIndicator column="goals" />
                  </span>
                </TableHead>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('feedback')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Feedback
                    <SortIndicator column="feedback" />
                  </span>
                </TableHead>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('skills')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Skills
                    <SortIndicator column="skills" />
                  </span>
                </TableHead>
                <TableHead className={sortHeadClass} onClick={() => toggleSort('flags')}>
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    Flags
                    <SortIndicator column="flags" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div className="gba:h-9 gba:w-9 gba:rounded-full gba:bg-muted gba:animate-pulse" />
                        <div className="gba:space-y-2">
                          <div className="gba:h-4 gba:w-32 gba:rounded gba:bg-muted gba:animate-pulse" />
                          <div className="gba:h-3 gba:w-24 gba:rounded gba:bg-muted gba:animate-pulse" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="gba:space-y-2">
                        <div className="gba:h-4 gba:w-10 gba:rounded gba:bg-muted gba:animate-pulse" />
                        <div className="gba:h-2 gba:w-full gba:max-w-[80px] gba:rounded gba:bg-muted gba:animate-pulse" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="gba:h-4 gba:w-12 gba:rounded gba:bg-muted gba:animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="gba:h-4 gba:w-20 gba:rounded gba:bg-muted gba:animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="gba:h-4 gba:w-24 gba:rounded gba:bg-muted gba:animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="gba:h-4 gba:w-8 gba:rounded gba:bg-muted gba:animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:gap-1">
                        <div className="gba:h-5 gba:w-5 gba:rounded-full gba:bg-muted gba:animate-pulse" />
                        <div className="gba:h-5 gba:w-5 gba:rounded gba:bg-muted gba:animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
                    No team members in this view.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map(row => {
                  const ev = row.evaluation
                  const g = row.goalRow
                  const fb = row.feedbackRow
                  const sk = row.skillsRow
                  const limit = ev.ratingScaleLimit ?? 5
                  const scoreProgress =
                    ev.latestScore != null && limit > 0 ? Math.min(100, Math.round((ev.latestScore / limit) * 100)) : 0
                  const fullName = `${ev.firstName} ${ev.lastName}`.trim()

                  return (
                    <TableRow
                      key={ev.employeeId}
                      className="gba:cursor-pointer gba:hover:bg-muted/50"
                      onClick={() => onEmployeeClick(ev.employeeId)}
                    >
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:h-9 gba:w-9 gba:shrink-0">
                            <AvatarImage src={avatarSrc(ev.pictureThumbnail)} alt={fullName} />
                            <AvatarFallback>{initialsFromName(ev.firstName, ev.lastName)}</AvatarFallback>
                          </Avatar>
                          <div className="gba:min-w-0">
                            <div className="gba:text-sm gba:font-medium gba:truncate">{fullName}</div>
                            {ev.jobPositionName ? (
                              <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                {ev.jobPositionName}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ev.latestScore != null ? (
                          <div className="gba:flex gba:max-w-[120px] gba:flex-col gba:gap-1">
                            <span className="gba:text-sm gba:tabular-nums">{ev.latestScore.toFixed(1)}</span>
                            <Progress value={scoreProgress} className="gba:h-1.5" />
                          </div>
                        ) : (
                          <span className="gba:text-sm gba:text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ev.changeOverall == null ? (
                          <span className="gba:text-sm gba:text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={`gba:inline-flex gba:items-center gba:gap-0.5 gba:text-sm gba:tabular-nums ${
                              ev.changeOverall > 0
                                ? 'gba:text-green-600'
                                : ev.changeOverall < 0
                                  ? 'gba:text-red-600'
                                  : 'gba:text-muted-foreground'
                            }`}
                          >
                            {ev.changeOverall > 0 ? (
                              <ArrowUp className="gba:h-3.5 gba:w-3.5" />
                            ) : ev.changeOverall < 0 ? (
                              <ArrowDown className="gba:h-3.5 gba:w-3.5" />
                            ) : null}
                            {ev.changeOverall > 0 ? '+' : ''}
                            {ev.changeOverall.toFixed(1)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:tabular-nums">
                        {g && g.totalGoals > 0 ? `${g.goalsOnTrack} on track / ${g.totalGoals} total` : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:tabular-nums">
                        {fb ? `${fb.feedbackReceivedCount} received / ${fb.feedbackGivenCount} given` : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:tabular-nums">{sk != null ? sk.avgLevel : '—'}</TableCell>
                      <TableCell>
                        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
                          {row.employeeAlerts.map((alert, idx) => (
                            <span
                              key={`${alert.employeeId}-${alert.category}-${idx}`}
                              className={`gba:inline-block gba:h-2 gba:w-2 gba:rounded-full ${
                                alert.severity === 'high'
                                  ? 'gba:bg-red-600'
                                  : alert.severity === 'medium'
                                    ? 'gba:bg-yellow-500'
                                    : 'gba:bg-muted-foreground/50'
                              }`}
                              title={alert.reason}
                            />
                          ))}
                          {row.employeeSignals.map((sig, idx) => (
                            <Badge
                              key={`${sig.employeeId}-${sig.signalType}-${idx}`}
                              variant="outline"
                              className="gba:px-1 gba:py-0 gba:text-[10px] gba:font-semibold gba:leading-none"
                            >
                              {signalInitial(sig.signalType)}
                            </Badge>
                          ))}
                          {row.employeeAlerts.length === 0 && row.employeeSignals.length === 0 ? (
                            <span className="gba:text-sm gba:text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
