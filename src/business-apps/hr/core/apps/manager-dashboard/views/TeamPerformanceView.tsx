import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Badge,
  Spinner,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Progress
} from '@newwork/nw-design-system'
import { ChevronLeft, MessageSquare, GraduationCap, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { normalizeProgress } from '@/business-apps/hr/core/apps/employee-record/components/tabs/performance-evaluation/utils/performanceGoalsSummary'
import { TeamMemberPerformance, PerformanceGoal } from '../hooks/useTeamPerformance'
import { SkillGap } from '../hooks/useTeamSkills'
import { TeamPerformanceInsightsResult } from '../hooks/useTeamPerformanceInsights'

type GoalStatusFilter = 'ALL' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND_TARGET' | 'ACHIEVED'

export interface FeedbackSummary {
  teamAvgRating: number | null
  totalFeedbackCount: number
  totalGivenCount: number
  feedbackCoverage: number
  recognitionRatio: number | null
  membersWithNoRecentFeedback: string[]
  loading: boolean
}

export interface SkillsSummary {
  teamSkillCoverage: number
  employeesWithoutProfile: number
  topSkillGaps: SkillGap[]
  topTeamStrengths: string[]
  loading: boolean
}

export interface TeamPerformanceViewProps {
  teamPerformance: TeamMemberPerformance[]
  totalPerformanceGoals: number
  averageTeamProgress: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  /** Team-level achieved count; falls back to summing member goals when omitted */
  goalsAchieved?: number
  loadingTeamPerformance: boolean
  filterGoalsBehindOnly?: boolean
  initialStatusFilter?: GoalStatusFilter
  feedbackSummary?: FeedbackSummary
  skillsSummary?: SkillsSummary
  insights?: TeamPerformanceInsightsResult
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

function getGoalStatusPresentation(goal: PerformanceGoal): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
} {
  const pct = normalizeProgress(goal.progressPercent ?? 0)
  if (goal.status === 'ACHIEVED' || pct >= 100) {
    return { label: 'Completed', variant: 'default' }
  }
  if (goal.status === 'AT_RISK') {
    return { label: 'At risk', variant: 'warning' }
  }
  const isBehind =
    goal.trackState === 'BEHIND_TARGET' ||
    goal.status === 'BEHIND_TARGET' ||
    (goal.status === 'NOT_ACHIEVED' && pct > 0)
  if (isBehind) {
    return { label: 'Behind', variant: 'destructive' }
  }
  if (pct <= 0) {
    return { label: 'Not started', variant: 'outline' }
  }
  return { label: 'On track', variant: 'success' }
}

const kpiCardRing = (active: boolean, color: 'primary' | 'success' | 'warning' | 'destructive' | 'muted') => {
  const rings: Record<typeof color, string> = {
    primary: 'gba:ring-2 gba:ring-primary gba:ring-offset-2',
    success: 'gba:ring-2 gba:ring-success gba:ring-offset-2',
    warning: 'gba:ring-2 gba:ring-warning gba:ring-offset-2',
    destructive: 'gba:ring-2 gba:ring-destructive gba:ring-offset-2',
    muted: 'gba:ring-2 gba:ring-muted-foreground gba:ring-offset-2'
  }
  return active ? rings[color] : 'hover:gba:ring-2 hover:gba:ring-muted-foreground/20 hover:gba:ring-offset-2'
}

const emptyPerformanceMessage = (filterGoalsBehindOnly: boolean): string => {
  if (filterGoalsBehindOnly) return 'No team members have goals behind target'
  return getTranslationFromI18nKeyAndLabel(
    'master-data:hr.manager_dashboard.no_performance_data',
    'No performance data available for your team'
  )
}

const urgencyBadgeVariant = (urgency: string) => {
  if (urgency === 'high') return 'destructive'
  if (urgency === 'medium') return 'warning' as any
  return 'secondary'
}

const goalListContent = (displayedGoals: PerformanceGoal[]): React.ReactNode => {
  return (
    <ul className="gba:w-full gba:divide-y gba:divide-border/70">
      {displayedGoals.map(goal => {
        const { label, variant } = getGoalStatusPresentation(goal)
        const pct = Math.min(100, Math.max(0, goal.progressPercent ?? 0))
        return (
          <li key={goal.id} className="gba:w-full gba:min-w-0 gba:py-2.5 first:gba:pt-0">
            <div className="gba:mb-2 gba:min-w-0 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
              {goal.title}
            </div>
            <div className="gba:flex gba:w-full gba:min-w-0 gba:items-center gba:gap-2 sm:gba:gap-3">
              <span className="gba:w-9 gba:shrink-0 gba:text-right gba:text-xs gba:tabular-nums gba:text-muted-foreground">
                {pct}%
              </span>
              <div className="gba:h-1.5 gba:min-w-[3rem] gba:flex-1 gba:overflow-hidden gba:rounded-full gba:bg-muted">
                <div className="gba:h-full gba:rounded-full gba:bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <span className="gba:w-[5.75rem] gba:shrink-0 gba:text-xs gba:text-muted-foreground sm:gba:w-24">
                {dayjs(goal.dueDate).format('MMM D, YYYY')}
              </span>
              <Badge variant={variant} className="gba:h-6 gba:shrink-0 gba:px-2 gba:text-[10px] gba:font-medium">
                {label}
              </Badge>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const goalsPanelContent = (member: TeamMemberPerformance, displayedGoals: PerformanceGoal[]): React.ReactNode => {
  if (member.totalGoals === 0) {
    return <p className="gba:py-4 gba:text-center gba:text-sm gba:text-muted-foreground">No goals assigned</p>
  }
  if (displayedGoals.length === 0) {
    return (
      <p className="gba:py-4 gba:text-center gba:text-sm gba:text-muted-foreground">
        No goals match the current filter
      </p>
    )
  }
  return goalListContent(displayedGoals)
}

const isGoalAchieved = (goal: PerformanceGoal): boolean =>
  goal.status === 'ACHIEVED' || normalizeProgress(goal.progressPercent ?? 0) >= 100

const goalMatchesOnTrackFilter = (goal: PerformanceGoal): boolean => {
  if (isGoalAchieved(goal)) return false
  return goal.trackState === 'ON_TRACK' || (!goal.trackState && goal.status === 'ON_TRACK')
}

const goalMatchesBehindFilter = (goal: PerformanceGoal): boolean =>
  goal.trackState === 'BEHIND_TARGET' ||
  (!goal.trackState && (goal.status === 'BEHIND_TARGET' || goal.status === 'NOT_ACHIEVED'))

const matchesStatusFilter = (goal: PerformanceGoal, statusFilter: GoalStatusFilter): boolean => {
  switch (statusFilter) {
    case 'ON_TRACK':
      return goalMatchesOnTrackFilter(goal)
    case 'AT_RISK':
      return goal.status === 'AT_RISK'
    case 'BEHIND_TARGET':
      return goalMatchesBehindFilter(goal)
    case 'ACHIEVED':
      return isGoalAchieved(goal)
    default:
      return true
  }
}

const displayedGoalsForMember = (
  member: TeamMemberPerformance,
  filterGoalsBehindOnly: boolean,
  statusFilter: GoalStatusFilter
): PerformanceGoal[] => {
  const baseGoals = filterGoalsBehindOnly ? member.goals.filter(goalMatchesBehindFilter) : member.goals
  if (statusFilter === 'ALL') return baseGoals
  return baseGoals.filter(goal => matchesStatusFilter(goal, statusFilter))
}

const memberMatchesStatus = (member: TeamMemberPerformance, statusFilter: GoalStatusFilter): boolean => {
  switch (statusFilter) {
    case 'ON_TRACK':
      return member.goals.some(goalMatchesOnTrackFilter)
    case 'AT_RISK':
      return member.goalsAtRisk > 0
    case 'BEHIND_TARGET':
      return member.goals.some(goalMatchesBehindFilter)
    case 'ACHIEVED':
      return member.goalsAchieved > 0
    default:
      return true
  }
}

const includesMemberInView = (
  member: TeamMemberPerformance,
  filterGoalsBehindOnly: boolean,
  statusFilter: GoalStatusFilter
): boolean => {
  if (filterGoalsBehindOnly && member.goalsBehindTarget === 0) return false
  if (statusFilter === 'ALL') return true
  return memberMatchesStatus(member, statusFilter)
}

const resolvedGoalsAchievedCount = (
  goalsAchievedProp: number | undefined,
  teamPerformance: TeamMemberPerformance[]
): number => {
  if (typeof goalsAchievedProp === 'number' && !Number.isNaN(goalsAchievedProp)) {
    return goalsAchievedProp
  }

  const fromMembers = teamPerformance.reduce((sum, member) => sum + (member.goalsAchieved ?? 0), 0)
  if (fromMembers > 0) return fromMembers

  return teamPerformance.reduce((sum, member) => sum + member.goals.filter(goal => isGoalAchieved(goal)).length, 0)
}

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  teamPerformance,
  totalPerformanceGoals,
  averageTeamProgress,
  goalsOnTrack,
  goalsAtRisk,
  goalsBehindTarget,
  goalsAchieved: goalsAchievedProp,
  loadingTeamPerformance,
  filterGoalsBehindOnly = false,
  initialStatusFilter = 'ALL',
  feedbackSummary,
  skillsSummary,
  insights,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>(initialStatusFilter)

  /** Ensure Completed always shows a number (runtime callers may omit prop; match member totals). */
  const goalsAchieved = useMemo(
    () => resolvedGoalsAchievedCount(goalsAchievedProp, teamPerformance),
    [goalsAchievedProp, teamPerformance]
  )

  useEffect(() => {
    setStatusFilter(initialStatusFilter)
  }, [initialStatusFilter])

  const filteredTeamPerformance = teamPerformance.filter(member =>
    includesMemberInView(member, filterGoalsBehindOnly, statusFilter)
  )

  const totalTeamMembers = teamPerformance.length
  const skillsCoveredMembers =
    skillsSummary && totalTeamMembers > 0 ? Math.round((skillsSummary.teamSkillCoverage / 100) * totalTeamMembers) : 0
  const membersWithProfile = skillsSummary ? Math.max(totalTeamMembers - skillsSummary.employeesWithoutProfile, 0) : 0

  return (
    <div className="gba:min-h-full gba:px-4 gba:pb-8 gba:pt-5 md:gba:px-5 lg:gba:px-6">
      <div className="gba:mx-auto gba:max-w-[1400px]">
        {/* Header */}
        <div className="gba:flex gba:flex-col gba:gap-3 sm:gba:flex-row sm:gba:items-center sm:gba:justify-between gba:mb-5">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="gba:-ml-2"
              data-testid="manager-dashboard-team-performance-back-button"
            >
              <ChevronLeft size={16} className="gba:mr-0.5" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
                'Back to Dashboard'
              )}
            </Button>
            <h1 className="gba:text-lg md:gba:text-xl gba:font-semibold gba:text-foreground gba:tracking-tight">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.team_performance',
                'Team Performance'
              )}
            </h1>
            {filterGoalsBehindOnly ? (
              <Badge variant="destructive" className="gba:text-xs">
                Behind target only
              </Badge>
            ) : (
              <Badge variant="secondary" className="gba:text-xs gba:font-normal gba:text-muted-foreground">
                {totalPerformanceGoals}{' '}
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.goals', 'goals')}{' '}
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.in_current_cycle',
                  'in the current cycle'
                )}
              </Badge>
            )}
          </div>
        </div>

        {/* Summary KPIs — single row (5 columns); shrink typography on narrow viewports */}
        <div className="gba:grid gba:grid-cols-5 gba:gap-2 sm:gba:gap-3 gba:mb-6">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`gba:min-w-0 gba:text-left gba:rounded-xl gba:transition-all ${kpiCardRing(statusFilter === 'ALL', 'primary')}`}
          >
            <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:p-3 sm:gba:p-4 gba:h-full">
              <div className="gba:text-lg sm:gba:text-xl md:gba:text-2xl gba:font-bold gba:tabular-nums gba:text-foreground">
                {averageTeamProgress}%
              </div>
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-0.5">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.avg_progress', 'Avg. progress')}
              </div>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ON_TRACK')}
            className={`gba:min-w-0 gba:text-left gba:rounded-xl gba:transition-all ${kpiCardRing(statusFilter === 'ON_TRACK', 'success')}`}
          >
            <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:p-3 sm:gba:p-4 gba:h-full">
              <div className="gba:text-lg sm:gba:text-xl md:gba:text-2xl gba:font-bold gba:tabular-nums gba:text-success">
                {goalsOnTrack}
              </div>
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-0.5">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_track', 'On track')}
              </div>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('AT_RISK')}
            className={`gba:min-w-0 gba:text-left gba:rounded-xl gba:transition-all ${kpiCardRing(statusFilter === 'AT_RISK', 'warning')}`}
          >
            <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:p-3 sm:gba:p-4 gba:h-full">
              <div className="gba:text-lg sm:gba:text-xl md:gba:text-2xl gba:font-bold gba:tabular-nums gba:text-warning">
                {goalsAtRisk}
              </div>
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-0.5">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.at_risk', 'At risk')}
              </div>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BEHIND_TARGET')}
            className={`gba:min-w-0 gba:text-left gba:rounded-xl gba:transition-all ${kpiCardRing(statusFilter === 'BEHIND_TARGET', 'destructive')}`}
          >
            <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:p-3 sm:gba:p-4 gba:h-full">
              <div className="gba:text-lg sm:gba:text-xl md:gba:text-2xl gba:font-bold gba:tabular-nums gba:text-destructive">
                {goalsBehindTarget}
              </div>
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-0.5">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.behind_target', 'Behind target')}
              </div>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACHIEVED')}
            className={`gba:min-w-0 gba:text-left gba:rounded-xl gba:transition-all ${kpiCardRing(statusFilter === 'ACHIEVED', 'muted')}`}
          >
            <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:p-3 sm:gba:p-4 gba:h-full">
              <div className="gba:text-lg sm:gba:text-xl md:gba:text-2xl gba:font-bold gba:tabular-nums gba:text-foreground">
                {goalsAchieved}
              </div>
              <div className="gba:text-[10px] sm:gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-0.5 gba:leading-tight">
                Completed
              </div>
            </Card>
          </button>
        </div>

        {/* Feedback & Skills summary row */}
        {(feedbackSummary || skillsSummary) && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }} data-layout="perf-summary-row">
            <style>{`
              [data-layout="perf-summary-row"] {
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: nowrap !important;
              }
              [data-layout="perf-summary-row"] > div {
                flex: 1 1 0 !important;
                min-width: 0 !important;
              }
            `}</style>
            {/* Feedback Trend */}
            {feedbackSummary && (
              <div>
                <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:h-full">
                  <CardHeader className="gba:pb-2 gba:p-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <MessageSquare size={16} className="gba:text-primary" />
                      <CardTitle className="gba:text-sm gba:font-semibold">Feedback Trend</CardTitle>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">Current cycle</p>
                  </CardHeader>
                  <CardContent className="gba:px-4 gba:pb-4 gba:pt-0">
                    {feedbackSummary.loading ? (
                      <div className="gba:animate-pulse gba:space-y-2">
                        <div className="gba:h-5 gba:bg-muted gba:rounded gba:w-2/3" />
                        <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-1/2" />
                      </div>
                    ) : (
                      <div className="gba:space-y-3">
                        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                          <div className="gba:text-center">
                            <p className="gba:text-xl gba:font-bold gba:tabular-nums">
                              {feedbackSummary.totalFeedbackCount}
                            </p>
                            <p className="gba:text-[11px] gba:text-muted-foreground">Received</p>
                          </div>
                          <div className="gba:text-center">
                            <p className="gba:text-xl gba:font-bold gba:tabular-nums">
                              {feedbackSummary.totalGivenCount}
                            </p>
                            <p className="gba:text-[11px] gba:text-muted-foreground">Given</p>
                          </div>
                        </div>
                        <div>
                          <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                            <span className="gba:text-xs gba:text-muted-foreground">Coverage</span>
                            <span className="gba:text-xs gba:font-medium">
                              {Math.round(feedbackSummary.feedbackCoverage)}%
                            </span>
                          </div>
                          <Progress value={feedbackSummary.feedbackCoverage} className="gba:h-1.5" />
                        </div>
                        {feedbackSummary.membersWithNoRecentFeedback.length > 0 && (
                          <p className="gba:text-[11px] gba:text-warning">
                            {feedbackSummary.membersWithNoRecentFeedback.length} member
                            {feedbackSummary.membersWithNoRecentFeedback.length > 1 ? 's' : ''} with no recent feedback
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Skills Coverage */}
            {skillsSummary && (
              <div>
                <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:h-full">
                  <CardHeader className="gba:pb-2 gba:p-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <GraduationCap size={16} className="gba:text-primary" />
                      <CardTitle className="gba:text-sm gba:font-semibold">Skills Coverage</CardTitle>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">Team skill profile</p>
                  </CardHeader>
                  <CardContent className="gba:px-4 gba:pb-4 gba:pt-0">
                    {skillsSummary.loading ? (
                      <div className="gba:animate-pulse gba:space-y-2">
                        <div className="gba:h-5 gba:bg-muted gba:rounded gba:w-2/3" />
                        <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-1/2" />
                      </div>
                    ) : (
                      <div className="gba:space-y-3">
                        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                          <div className="gba:text-center">
                            <p className="gba:text-xl gba:font-bold gba:tabular-nums">{skillsCoveredMembers}</p>
                            <p className="gba:text-[11px] gba:text-muted-foreground">Covered</p>
                          </div>
                          <div className="gba:text-center">
                            <p className="gba:text-xl gba:font-bold gba:tabular-nums">{membersWithProfile}</p>
                            <p className="gba:text-[11px] gba:text-muted-foreground">With profile</p>
                          </div>
                        </div>
                        <div>
                          <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                            <span className="gba:text-xs gba:text-muted-foreground">Team coverage</span>
                            <span className="gba:text-xs gba:font-medium">
                              {Math.round(skillsSummary.teamSkillCoverage)}%
                            </span>
                          </div>
                          <Progress value={skillsSummary.teamSkillCoverage} className="gba:h-1.5" />
                        </div>
                        {skillsSummary.topTeamStrengths.length > 0 && (
                          <div>
                            <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mb-1">
                              Strengths
                            </p>
                            <div className="gba:flex gba:flex-wrap gba:gap-1">
                              {skillsSummary.topTeamStrengths.slice(0, 4).map(s => (
                                <Badge key={s} variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {skillsSummary.topSkillGaps.length > 0 && (
                          <div>
                            <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mb-1">Gaps</p>
                            <div className="gba:flex gba:flex-wrap gba:gap-1">
                              {skillsSummary.topSkillGaps.slice(0, 4).map(g => (
                                <Badge
                                  key={g.skillId}
                                  variant="outline"
                                  className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:text-warning"
                                >
                                  {g.skillName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {skillsSummary.employeesWithoutProfile > 0 && (
                          <div>
                            <Badge variant="destructive" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                              {skillsSummary.employeesWithoutProfile} employee
                              {skillsSummary.employeesWithoutProfile > 1 ? 's' : ''} missing job profile skills
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Insights trigger */}
            {insights && (
              <div>
                <Card className="gba:border gba:border-border gba:bg-card gba:shadow-sm gba:h-full">
                  <CardHeader className="gba:pb-2 gba:p-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Sparkles size={16} className="gba:text-primary" />
                      <CardTitle className="gba:text-sm gba:font-semibold">AI Summary</CardTitle>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">Goals, skills & feedback</p>
                  </CardHeader>
                  <CardContent className="gba:px-4 gba:pb-4 gba:pt-0">
                    {insights.isAnalyzing ? (
                      <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
                        <div className="gba:animate-spin">
                          <Sparkles size={16} className="gba:text-primary" />
                        </div>
                        <p className="gba:text-xs gba:text-muted-foreground">Analyzing...</p>
                      </div>
                    ) : insights.error ? (
                      <div className="gba:text-center gba:py-2">
                        <AlertTriangle size={20} className="gba:mx-auto gba:mb-1 gba:text-destructive" />
                        <p className="gba:text-[11px] gba:text-destructive gba:mb-2">{insights.error}</p>
                        <Button onClick={insights.analyze} variant="outline" size="sm" className="gba:h-7 gba:text-xs">
                          <RefreshCw size={12} className="gba:mr-1" />
                          Retry
                        </Button>
                      </div>
                    ) : insights.data ? (
                      <div className="gba:space-y-2">
                        <p className="gba:text-xs gba:leading-relaxed">{insights.data.executive_summary}</p>
                        {insights.data.top_priorities.length > 0 && (
                          <div>
                            <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mb-1">
                              Top priorities
                            </p>
                            {insights.data.top_priorities.slice(0, 3).map(p => (
                              <div
                                key={`${p.urgency}-${p.priority}`}
                                className="gba:flex gba:items-start gba:gap-1.5 gba:mb-1"
                              >
                                <Badge
                                  variant={urgencyBadgeVariant(p.urgency)}
                                  className="gba:text-[9px] gba:px-1 gba:py-0 gba:shrink-0 gba:mt-0.5"
                                >
                                  {p.urgency}
                                </Badge>
                                <p className="gba:text-[11px]">{p.priority}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          onClick={insights.analyze}
                          variant="ghost"
                          size="sm"
                          className="gba:h-6 gba:text-[11px] gba:px-2"
                        >
                          <RefreshCw size={10} className="gba:mr-1" />
                          Refresh
                        </Button>
                      </div>
                    ) : (
                      <div className="gba:text-center gba:py-3">
                        <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">
                          AI analysis of current cycle performance
                        </p>
                        <Button onClick={insights.analyze} size="sm" className="gba:h-8 gba:gap-1.5">
                          <Sparkles size={14} />
                          Generate Summary
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {loadingTeamPerformance && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-20">
            <Spinner size="lg" />
          </div>
        )}

        {!loadingTeamPerformance && filteredTeamPerformance.length === 0 && (
          <Card className="gba:border gba:border-dashed gba:border-border gba:bg-card gba:py-14 gba:text-center">
            <p className="gba:text-sm gba:text-muted-foreground">{emptyPerformanceMessage(filterGoalsBehindOnly)}</p>
            <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
              Create goals or run a feedback cycle to unlock team performance insights.
            </p>
          </Card>
        )}

        {!loadingTeamPerformance && filteredTeamPerformance.length > 0 && (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {filteredTeamPerformance.map(member => {
              const displayedGoals = displayedGoalsForMember(member, filterGoalsBehindOnly, statusFilter)
              return (
                <Card
                  key={member.employeeId}
                  className="gba:min-w-0 gba:overflow-hidden gba:border gba:border-border gba:bg-card gba:shadow-sm"
                >
                  <div className="gba:border-b gba:border-border gba:bg-card gba:p-4">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                      <button
                        type="button"
                        onClick={() => onNavigateToEmployee(member.employeeId)}
                        className="gba:flex gba:min-w-0 gba:items-center gba:gap-3 gba:text-left gba:bg-transparent gba:p-0 gba:border-0 gba:cursor-pointer hover:gba:opacity-90"
                      >
                        <Avatar className="gba:h-11 gba:w-11 gba:shrink-0 gba:border gba:border-border">
                          <AvatarImage
                            src={
                              member.pictureThumbnail && !member.pictureThumbnail.startsWith('{')
                                ? `data:image/jpeg;base64,${member.pictureThumbnail}`
                                : undefined
                            }
                            alt={`${member.firstName} ${member.lastName}`}
                          />
                          <AvatarFallback className="gba:text-sm gba:font-medium">
                            {member.firstName?.[0]}
                            {member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:min-w-0">
                          <div className="gba:truncate gba:text-base gba:font-semibold gba:text-foreground">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="gba:truncate gba:text-xs gba:text-muted-foreground">
                            {member.jobPositionName || '—'}
                          </div>
                        </div>
                      </button>
                      <div className="gba:shrink-0 gba:text-right">
                        <div className="gba:text-2xl gba:font-bold gba:tabular-nums gba:leading-none gba:text-foreground">
                          {member.averageProgress}%
                        </div>
                        <div className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mt-1">
                          Avg. progress
                        </div>
                      </div>
                    </div>
                    <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-1.5">
                      <Badge
                        variant="outline"
                        className="gba:h-6 gba:px-2 gba:text-[11px] gba:font-normal gba:text-muted-foreground"
                      >
                        Total {member.totalGoals}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="gba:h-6 gba:px-2 gba:text-[11px] gba:font-normal gba:text-muted-foreground"
                      >
                        On track {member.goalsOnTrack}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="gba:h-6 gba:px-2 gba:text-[11px] gba:font-normal gba:text-muted-foreground"
                      >
                        At risk {member.goalsAtRisk}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="gba:h-6 gba:px-2 gba:text-[11px] gba:font-normal gba:text-muted-foreground"
                      >
                        Behind {member.goalsBehindTarget}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="gba:h-6 gba:px-2 gba:text-[11px] gba:font-normal gba:text-muted-foreground"
                      >
                        Completed {member.goalsAchieved ?? 0}
                      </Badge>
                    </div>
                  </div>

                  <div className="gba:w-full gba:min-w-0 gba:bg-muted/25 gba:px-4 gba:py-3">
                    <h3 className="gba:mb-2 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                      Goals
                    </h3>
                    {goalsPanelContent(member, displayedGoals)}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
