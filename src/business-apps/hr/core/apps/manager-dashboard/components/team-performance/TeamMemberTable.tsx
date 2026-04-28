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
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import {
  UsersThreeIcon as Users,
  CaretUpIcon as ChevronUp,
  CaretDownIcon as ChevronDown,
  ArrowUpIcon as ArrowUp,
  ArrowDownIcon as ArrowDown,
  SparkleIcon as Sparkles,
  SpinnerGapIcon as Loader2
} from '@phosphor-icons/react'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import type { TeamMemberPerformance } from '../../hooks/useTeamPerformance'
import type { TeamMemberFeedback } from '../../hooks/useTeamFeedbackOverview'
import type { TeamMemberSkills } from '../../hooks/useTeamSkills'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { employeeInitials, avatarSrc } from '../../utils/heatmapHelpers'

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

const TASK_EXPERT_NAME = 'employee_performance_summary'

interface AiSummaryState {
  summaries: Map<string, string>
  loading: boolean
  error: string | null
  generated: boolean
}

const LOADING_ROW_IDS = ['loading-row-1', 'loading-row-2', 'loading-row-3', 'loading-row-4', 'loading-row-5']

const SortIndicator = ({
  column,
  sortColumn,
  sortDirection
}: {
  column: SortColumn
  sortColumn: SortColumn
  sortDirection: SortDirection
}) => {
  if (sortColumn !== column) return null
  if (sortDirection === 'asc') {
    return <ChevronUp className="gba:inline gba:h-4 gba:w-4 gba:shrink-0" />
  }
  return <ChevronDown className="gba:inline gba:h-4 gba:w-4 gba:shrink-0" />
}

const toProgressValue = (value: number | null | undefined, limit: number): number => {
  if (value == null || limit <= 0) return 0
  return Math.min(100, Math.round((value / limit) * 100))
}

const changeTone = (change: number): string => {
  if (change > 0) return 'gba:text-success'
  if (change < 0) return 'gba:text-destructive'
  return 'gba:text-muted-foreground'
}

const changeIcon = (change: number): React.ReactNode => {
  if (change > 0) return <ArrowUp className="gba:h-3.5 gba:w-3.5" />
  if (change < 0) return <ArrowDown className="gba:h-3.5 gba:w-3.5" />
  return null
}

const signedChangeText = (change: number): string => {
  const prefix = change > 0 ? '+' : ''
  return `${prefix}${change.toFixed(1)}`
}

const metricCellContent = (value: number | null | undefined, progress: number): React.ReactNode => {
  if (value == null) {
    return <span className="gba:text-sm gba:text-muted-foreground">—</span>
  }

  return (
    <div className="gba:flex gba:max-w-[100px] gba:flex-col gba:gap-1">
      <span className="gba:text-sm gba:tabular-nums">{value.toFixed(1)}</span>
      <Progress value={progress} className="gba:h-1.5" />
    </div>
  )
}

const feedbackPercentText = (feedbackRow: TeamMemberFeedback | undefined, feedbackPct: number): string => {
  if (!feedbackRow) return '—'
  return `${feedbackPct}%`
}

const aiSummaryContent = (aiState: AiSummaryState, summary: string | undefined): React.ReactNode => {
  if (aiState.loading) {
    return <div className="gba:h-4 gba:w-32 gba:rounded gba:bg-muted gba:animate-pulse" />
  }

  if (summary) {
    return <span className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{summary}</span>
  }

  if (aiState.error) {
    return (
      <Badge variant="destructive" className="gba:text-xs">
        Error
      </Badge>
    )
  }

  return <span className="gba:text-xs gba:text-muted-foreground gba:italic">Click AI Insights</span>
}

const feedbackActivityCount = (feedbackRow: TeamMemberFeedback | undefined): number => {
  if (!feedbackRow) return 0
  return feedbackRow.feedbackReceivedCount + feedbackRow.feedbackGivenCount
}

const toGoalsProgressValue = (goalRow: TeamMemberPerformance | undefined): number | null => {
  if (!goalRow) return null
  return Math.round(goalRow.averageProgress)
}

const parsedPromptResponse = (content: unknown): Record<string, unknown> => {
  if (typeof content === 'string') {
    return JSON.parse(content)
  }
  return content as Record<string, unknown>
}

const errorMessageFromUnknown = (err: unknown): string => {
  if (err instanceof Error) return err.message
  return 'Failed to generate summaries'
}

const insightsButtonLabel = (generated: boolean): string => {
  if (generated) return 'Refresh insights'
  return 'AI Insights'
}

interface TeamMemberDataRowProps {
  row: RowModel
  onEmployeeClick: (employeeId: string) => void
  aiState: AiSummaryState
}

const TeamMemberDataRow: React.FC<TeamMemberDataRowProps> = ({ row, onEmployeeClick, aiState }) => {
  const ev = row.evaluation
  const g = row.goalRow
  const fb = row.feedbackRow
  const limit = ev.ratingScaleLimit ?? 5
  const scoreProgress = toProgressValue(ev.latestScore, limit)
  const cvProgress = toProgressValue(ev.companyValuesAvg, limit)
  const skProgress = toProgressValue(ev.skillsAvg, limit)
  const fullName = `${ev.firstName} ${ev.lastName}`.trim()
  const summary = aiState.summaries.get(ev.employeeId)
  const aiSummaryNode = aiSummaryContent(aiState, summary)
  const goalProgress = toGoalsProgressValue(g)

  return (
    <TableRow className="gba:cursor-pointer gba:hover:bg-muted/50" onClick={() => onEmployeeClick(ev.employeeId)}>
      <TableCell className="gba:w-px">
        <div className="gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
          <Avatar className="gba:h-8 gba:w-8 gba:shrink-0">
            <AvatarImage src={avatarSrc(ev.pictureThumbnail)} alt={fullName} />
            <AvatarFallback>{employeeInitials(ev.firstName, ev.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="gba:text-sm gba:font-medium">{fullName}</div>
            {ev.jobPositionName ? (
              <div className="gba:text-xs gba:text-muted-foreground">{ev.jobPositionName}</div>
            ) : null}
          </div>
        </div>
      </TableCell>

      <TableCell>{metricCellContent(ev.latestScore, scoreProgress)}</TableCell>

      <TableCell>
        {ev.changeOverall == null ? (
          <span className="gba:text-sm gba:text-muted-foreground">—</span>
        ) : (
          <span
            className={`gba:inline-flex gba:items-center gba:gap-0.5 gba:text-sm gba:tabular-nums ${changeTone(ev.changeOverall)}`}
          >
            {changeIcon(ev.changeOverall)}
            {signedChangeText(ev.changeOverall)}
          </span>
        )}
      </TableCell>

      <TableCell>{metricCellContent(ev.companyValuesAvg, cvProgress)}</TableCell>

      <TableCell>{metricCellContent(ev.skillsAvg, skProgress)}</TableCell>

      <TableCell className="gba:text-sm gba:tabular-nums">
        {g && g.totalGoals > 0 && goalProgress !== null ? (
          <div className="gba:flex gba:max-w-[100px] gba:flex-col gba:gap-1">
            <span>{goalProgress}%</span>
            <Progress value={goalProgress} className="gba:h-1.5" />
          </div>
        ) : (
          <span className="gba:text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="gba:text-sm gba:tabular-nums">{feedbackPercentText(fb, row.feedbackPct)}</TableCell>

      <TableCell className="gba:max-w-[200px]">{aiSummaryNode}</TableCell>
    </TableRow>
  )
}

export const TeamMemberTable: React.FC<TeamMemberTableProps> = ({
  evaluations,
  goals,
  feedback,
  skills,
  onEmployeeClick,
  loading,
  accessToken
}) => {
  const { t } = useTranslation(translations)
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
      const empTotal = feedbackActivityCount(fb)
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
          error: t('error-agent-not-found', { name: TASK_EXPERT_NAME })
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

      const parsed = parsedPromptResponse(response.content)

      const summaries = new Map<string, string>()
      const items = Array.isArray(parsed?.employees) ? parsed.employees : []
      for (const item of items) {
        if (item?.employee_id && typeof item.summary === 'string') {
          summaries.set(item.employee_id, item.summary)
        }
      }

      setAiState({ summaries, loading: false, error: null, generated: true })
    } catch (err) {
      const message = errorMessageFromUnknown(err)
      setAiState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [rows])

  useEffect(() => {
    setAiState({ summaries: new Map(), loading: false, error: null, generated: false })
  }, [evaluations])

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(direction => {
        if (direction === 'asc') return 'desc'
        return 'asc'
      })
    } else {
      setSortColumn(col)
      if (col === 'employee') {
        setSortDirection('asc')
      } else {
        setSortDirection('desc')
      }
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
  const renderTableBodyRows = (): React.ReactNode => {
    if (loading) {
      return LOADING_ROW_IDS.map(rowId => (
        <TableRow key={rowId}>
          <TableCell>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:h-9 gba:w-9 gba:rounded-full gba:bg-muted gba:animate-pulse" />
              <div className="gba:space-y-2">
                <div className="gba:h-4 gba:w-32 gba:rounded gba:bg-muted gba:animate-pulse" />
                <div className="gba:h-3 gba:w-24 gba:rounded gba:bg-muted gba:animate-pulse" />
              </div>
            </div>
          </TableCell>
          {[...columns.slice(1).map(col => col.key), 'ai-summary'].map(cellKey => (
            <TableCell key={`${rowId}-${cellKey}`}>
              <div className="gba:h-4 gba:w-12 gba:rounded gba:bg-muted gba:animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    if (sortedRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
            No team members in this view.
          </TableCell>
        </TableRow>
      )
    }

    return sortedRows.map(row => (
      <TeamMemberDataRow
        key={row.evaluation.employeeId}
        row={row}
        onEmployeeClick={onEmployeeClick}
        aiState={aiState}
      />
    ))
  }

  return (
    <Card className="gba:rounded-xl gba:overflow-hidden">
      <CardHeader className="gba:px-5 gba:pb-3 gba:pt-5">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
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
              {insightsButtonLabel(aiState.generated)}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:px-5 gba:pb-5 gba:pt-0">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={`${sortHeadClass}${col.key === 'employee' ? ' gba:w-px' : ''}`}
                    onClick={() => toggleSort(col.key)}
                  >
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
            <TableBody>{renderTableBodyRows()}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
