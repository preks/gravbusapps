import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
  Button,
  Badge
} from '@newwork/nw-design-system'
import { Users, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Sparkles, Loader2 } from 'lucide-react'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import type { TeamMemberPerformance } from '../../hooks/useTeamPerformance'
import type { TeamMemberFeedback } from '../../hooks/useTeamFeedbackOverview'
import type { TeamMemberSkills } from '../../hooks/useTeamSkills'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

interface TeamMemberTableProps {
  evaluations: TeamMemberEvaluation[]
  goals: TeamMemberPerformance[]
  feedback: TeamMemberFeedback[]
  skills: TeamMemberSkills[]
  onEmployeeClick: (employeeId: string) => void
  loading: boolean
  accessToken: string
}

type SortColumn = 'employee' | 'overall' | 'change' | 'companyValues' | 'skills' | 'goals' | 'feedback'

type SortDirection = 'asc' | 'desc'

interface RowModel {
  evaluation: TeamMemberEvaluation
  goalRow: TeamMemberPerformance | undefined
  feedbackRow: TeamMemberFeedback | undefined
  skillsRow: TeamMemberSkills | undefined
  feedbackPct: number
}

const initialsFromName = (first: string, last: string): string => {
  const a = first.trim()[0] ?? ''
  const b = last.trim()[0] ?? ''
  const s = `${a}${b}`.toUpperCase()
  return s || '?'
}

const avatarSrc = (pictureThumbnail?: string): string | undefined =>
  pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined

const TASK_EXPERT_NAME = 'employee_performance_summary'

interface AiSummaryState {
  summaries: Map<string, string>
  loading: boolean
  error: string | null
  generated: boolean
}

const SortIndicator = ({
  column,
  sortColumn,
  sortDirection
}: {
  column: SortColumn
  sortColumn: SortColumn
  sortDirection: SortDirection
}) =>
  sortColumn === column ? (
    sortDirection === 'asc' ? (
      <ChevronUp className="gba:inline gba:h-4 gba:w-4 gba:shrink-0" />
    ) : (
      <ChevronDown className="gba:inline gba:h-4 gba:w-4 gba:shrink-0" />
    )
  ) : null

export const TeamMemberTable: React.FC<TeamMemberTableProps> = ({
  evaluations,
  goals,
  feedback,
  skills,
  onEmployeeClick,
  loading,
  accessToken
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('employee')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [aiState, setAiState] = useState<AiSummaryState>({
    summaries: new Map(),
    loading: false,
    error: null,
    generated: false
  })

  const promptClient = usePromptManagerClient(accessToken)
  const promptClientRef = useRef(promptClient)
  promptClientRef.current = promptClient

  const goalsMap = useMemo(() => new Map(goals.map(g => [g.employeeId, g])), [goals])
  const feedbackMap = useMemo(() => new Map(feedback.map(f => [f.employeeId, f])), [feedback])
  const skillsMap = useMemo(() => new Map(skills.map(s => [s.employeeId, s])), [skills])

  const teamFeedbackTotal = useMemo(() => {
    let total = 0
    for (const f of feedback) {
      total += f.feedbackReceivedCount + f.feedbackGivenCount
    }
    return total
  }, [feedback])

  const rows = useMemo((): RowModel[] => {
    return evaluations.map(ev => {
      const fb = feedbackMap.get(ev.employeeId)
      const empTotal = fb ? fb.feedbackReceivedCount + fb.feedbackGivenCount : 0
      const feedbackPct = teamFeedbackTotal > 0 ? Math.round((empTotal / teamFeedbackTotal) * 100) : 0
      return {
        evaluation: ev,
        goalRow: goalsMap.get(ev.employeeId),
        feedbackRow: fb,
        skillsRow: skillsMap.get(ev.employeeId),
        feedbackPct
      }
    })
  }, [evaluations, goalsMap, feedbackMap, skillsMap, teamFeedbackTotal])

  const sortedRows = useMemo(() => {
    const mult = sortDirection === 'asc' ? 1 : -1
    const name = (ev: TeamMemberEvaluation) => `${ev.firstName} ${ev.lastName}`.trim().toLowerCase()

    const nullSafeCompare = (a: number | null | undefined, b: number | null | undefined): number => {
      if (a == null && b == null) return 0
      if (a == null) return 1
      if (b == null) return -1
      return a - b
    }

    return [...rows].sort((a, b) => {
      const evA = a.evaluation
      const evB = b.evaluation
      let cmp = 0
      switch (sortColumn) {
        case 'employee':
          cmp = name(evA).localeCompare(name(evB))
          break
        case 'overall':
          cmp = nullSafeCompare(evA.latestScore, evB.latestScore)
          break
        case 'change':
          cmp = nullSafeCompare(evA.changeOverall, evB.changeOverall)
          break
        case 'companyValues':
          cmp = nullSafeCompare(evA.companyValuesAvg, evB.companyValuesAvg)
          break
        case 'skills':
          cmp = nullSafeCompare(evA.skillsAvg, evB.skillsAvg)
          break
        case 'goals':
          cmp = nullSafeCompare(a.goalRow?.averageProgress, b.goalRow?.averageProgress)
          break
        case 'feedback':
          cmp = a.feedbackPct - b.feedbackPct
          break
      }
      return cmp * mult
    })
  }, [rows, sortColumn, sortDirection])

  const generateSummaries = useCallback(async () => {
    if (rows.length === 0) return
    setAiState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const client = promptClientRef.current
      const promptsPage = await client.getPrompts({ promptName: TASK_EXPERT_NAME, limit: 1 })
      const taskExpertId = promptsPage?.data?.[0]?._id
      if (!taskExpertId) {
        setAiState(prev => ({
          ...prev,
          loading: false,
          error: `Task expert "${TASK_EXPERT_NAME}" not found. Create it in Prompt Manager.`
        }))
        return
      }

      const ratingScale = rows[0]?.evaluation.ratingScaleLimit ?? 5
      const employeesData = rows.map(r => {
        const ev = r.evaluation
        const g = r.goalRow
        const fb = r.feedbackRow
        return {
          employee_id: ev.employeeId,
          name: `${ev.firstName} ${ev.lastName}`.trim(),
          overall_score: ev.latestScore,
          score_change: ev.changeOverall,
          company_values_score: ev.companyValuesAvg,
          skills_score: ev.skillsAvg,
          rating_scale: ev.ratingScaleLimit ?? 5,
          goals_progress: g ? Math.round(g.averageProgress) : null,
          total_goals: g?.totalGoals ?? 0,
          feedback_received: fb?.feedbackReceivedCount ?? 0,
          feedback_given: fb?.feedbackGivenCount ?? 0,
          feedback_pct: r.feedbackPct
        }
      })

      const response = await client.executePromptWithOptions(taskExpertId, {
        userParams: {
          employees_json: JSON.stringify(employeesData),
          rating_scale: String(ratingScale)
        },
        systemParams: {
          language: 'English'
        }
      })

      const parsed =
        typeof response.content === 'string'
          ? JSON.parse(response.content)
          : (response.content as Record<string, unknown>)

      const summaries = new Map<string, string>()
      const items = Array.isArray(parsed?.employees) ? parsed.employees : []
      for (const item of items) {
        if (item?.employee_id && typeof item.summary === 'string') {
          summaries.set(item.employee_id, item.summary)
        }
      }

      setAiState({ summaries, loading: false, error: null, generated: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate summaries'
      setAiState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [rows])

  useEffect(() => {
    setAiState({ summaries: new Map(), loading: false, error: null, generated: false })
  }, [evaluations])

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection(col === 'employee' ? 'asc' : 'desc')
    }
  }

  const sortHeadClass = 'gba:cursor-pointer gba:select-none gba:whitespace-nowrap'

  const columns: { key: SortColumn; label: string }[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'overall', label: 'Overall' },
    { key: 'change', label: 'Change' },
    { key: 'companyValues', label: 'Values' },
    { key: 'skills', label: 'Skills' },
    { key: 'goals', label: 'Goals' },
    { key: 'feedback', label: 'Feedback' }
  ]

  const colSpan = columns.length + 1

  return (
    <Card className="gba:rounded-xl gba:overflow-hidden">
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
            <Users className="gba:h-4 gba:w-4" />
            Team Overview
          </CardTitle>
          {!loading && sortedRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gba:gap-1.5 gba:text-xs"
              onClick={generateSummaries}
              disabled={aiState.loading}
            >
              {aiState.loading ? (
                <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
              ) : (
                <Sparkles className="gba:h-3.5 gba:w-3.5" />
              )}
              {aiState.generated ? 'Refresh insights' : 'AI Insights'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:p-0 gba:px-4 gba:pb-4">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col.key} className={sortHeadClass} onClick={() => toggleSort(col.key)}>
                    <span className="gba:inline-flex gba:items-center gba:gap-1">
                      {col.label}
                      <SortIndicator column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />
                    </span>
                  </TableHead>
                ))}
                <TableHead className="gba:whitespace-nowrap">
                  <span className="gba:inline-flex gba:items-center gba:gap-1">
                    <Sparkles className="gba:h-3.5 gba:w-3.5" />
                    AI Summary
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="gba:h-4 gba:w-12 gba:rounded gba:bg-muted gba:animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground"
                  >
                    No team members in this view.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map(row => {
                  const ev = row.evaluation
                  const g = row.goalRow
                  const fb = row.feedbackRow
                  const limit = ev.ratingScaleLimit ?? 5
                  const scoreProgress =
                    ev.latestScore != null && limit > 0 ? Math.min(100, Math.round((ev.latestScore / limit) * 100)) : 0
                  const fullName = `${ev.firstName} ${ev.lastName}`.trim()

                  const cvProgress =
                    ev.companyValuesAvg != null && limit > 0
                      ? Math.min(100, Math.round((ev.companyValuesAvg / limit) * 100))
                      : 0
                  const skProgress =
                    ev.skillsAvg != null && limit > 0 ? Math.min(100, Math.round((ev.skillsAvg / limit) * 100)) : 0

                  const summary = aiState.summaries.get(ev.employeeId)

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
                          <div className="gba:flex gba:max-w-[100px] gba:flex-col gba:gap-1">
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

                      <TableCell>
                        {ev.companyValuesAvg != null ? (
                          <div className="gba:flex gba:max-w-[100px] gba:flex-col gba:gap-1">
                            <span className="gba:text-sm gba:tabular-nums">{ev.companyValuesAvg.toFixed(1)}</span>
                            <Progress value={cvProgress} className="gba:h-1.5" />
                          </div>
                        ) : (
                          <span className="gba:text-sm gba:text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {ev.skillsAvg != null ? (
                          <div className="gba:flex gba:max-w-[100px] gba:flex-col gba:gap-1">
                            <span className="gba:text-sm gba:tabular-nums">{ev.skillsAvg.toFixed(1)}</span>
                            <Progress value={skProgress} className="gba:h-1.5" />
                          </div>
                        ) : (
                          <span className="gba:text-sm gba:text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="gba:text-sm gba:tabular-nums">
                        {g && g.totalGoals > 0 ? (
                          <div className="gba:flex gba:max-w-[100px] gba:flex-col gba:gap-1">
                            <span>{Math.round(g.averageProgress)}%</span>
                            <Progress value={Math.round(g.averageProgress)} className="gba:h-1.5" />
                          </div>
                        ) : (
                          <span className="gba:text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="gba:text-sm gba:tabular-nums">{fb ? `${row.feedbackPct}%` : '—'}</TableCell>

                      <TableCell className="gba:max-w-[200px]">
                        {aiState.loading ? (
                          <div className="gba:h-4 gba:w-32 gba:rounded gba:bg-muted gba:animate-pulse" />
                        ) : summary ? (
                          <span className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{summary}</span>
                        ) : aiState.error ? (
                          <Badge variant="destructive" className="gba:text-[10px]">
                            Error
                          </Badge>
                        ) : (
                          <span className="gba:text-xs gba:text-muted-foreground gba:italic">Click AI Insights</span>
                        )}
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
