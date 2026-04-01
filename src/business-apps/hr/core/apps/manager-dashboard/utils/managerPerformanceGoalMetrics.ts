import type { PerformanceGoal } from '../hooks/useTeamPerformance'
import {
  getTrackState,
  isGoalContainedInCycle,
  isGoalValid,
  normalizeProgress,
  type PerformanceGoalSummaryItem
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/performance-evaluation/utils/performanceGoalsSummary'

/** GraphQL goal row — same fields needed for employee-record-style track state */
export type RawGoalForMetrics = Pick<
  PerformanceGoal,
  'id' | 'title' | 'startDate' | 'dueDate' | 'completionDate' | 'progressPercent' | 'status' | 'employeeId'
> & {
  updatedAt?: string
  employeePerformanceGoalUpdate?: PerformanceGoalSummaryItem['employeePerformanceGoalUpdate']
}

export function toPerformanceGoalSummaryItem(goal: RawGoalForMetrics): PerformanceGoalSummaryItem {
  return {
    id: goal.id,
    title: goal.title,
    startDate: goal.startDate,
    dueDate: goal.dueDate,
    status: goal.status,
    progressPercent: goal.progressPercent ?? 0,
    updatedAt: goal.updatedAt,
    completionDate: goal.completionDate,
    employeePerformanceGoalUpdate: goal.employeePerformanceGoalUpdate
  }
}

export function filterGoalsContainedInPerformanceCycle(
  goals: RawGoalForMetrics[],
  cycleStart: string,
  cycleEnd: string
): RawGoalForMetrics[] {
  return goals.filter(g => {
    if (!isGoalValid(toPerformanceGoalSummaryItem(g))) return false
    return isGoalContainedInCycle(toPerformanceGoalSummaryItem(g), cycleStart, cycleEnd)
  })
}

/**
 * KPI alignment with employee-record Performance tab:
 * - Only goals fully contained in the cycle window (cycle start/end dates)
 * - On track / behind from {@link getTrackState} (timeline vs ideal progress, ±10%), not raw status;
 *   completed goals ({@link isPerformanceGoalAchieved}) are excluded from on-track and behind KPIs
 * - At risk = DB status AT_RISK (same members still included in on-track/behind totals when applicable)
 */
export function isPerformanceGoalAchieved(g: RawGoalForMetrics): boolean {
  return g.status === 'ACHIEVED' || normalizeProgress(g.progressPercent ?? 0) >= 100
}

export function computeContainedGoalRollup(goals: RawGoalForMetrics[], cycleStart: string, cycleEnd: string) {
  const contained = filterGoalsContainedInPerformanceCycle(goals, cycleStart, cycleEnd)

  let goalsOnTrack = 0
  let goalsBehindTarget = 0
  let goalsAtRisk = 0
  let goalsAchieved = 0
  let progressSum = 0

  const withTrack: PerformanceGoal[] = contained.map(g => {
    const item = toPerformanceGoalSummaryItem(g)
    const trackState = getTrackState(item)
    const achieved = isPerformanceGoalAchieved(g)
    if (!achieved) {
      if (trackState === 'ON_TRACK') goalsOnTrack++
      else goalsBehindTarget++
    }
    if (g.status === 'AT_RISK') goalsAtRisk++
    if (achieved) goalsAchieved++
    progressSum += normalizeProgress(g.progressPercent ?? 0)

    return {
      id: g.id,
      title: g.title,
      startDate: g.startDate,
      dueDate: g.dueDate,
      completionDate: g.completionDate,
      progressPercent: g.progressPercent ?? 0,
      status: g.status as PerformanceGoal['status'],
      employeeId: g.employeeId,
      trackState
    }
  })

  const n = withTrack.length
  return {
    goals: withTrack,
    totalGoals: n,
    goalsOnTrack,
    goalsAtRisk,
    goalsBehindTarget,
    goalsAchieved,
    averageProgress: n > 0 ? Math.round(progressSum / n) : 0
  }
}

/** Mutually exclusive stack segment for charts (achieved → behind → at risk → on track) */
export function goalStackCategory(goal: PerformanceGoal): 'onTrack' | 'atRisk' | 'behindTarget' | 'achieved' {
  const achieved = goal.status === 'ACHIEVED' || normalizeProgress(goal.progressPercent || 0) >= 100
  if (achieved) return 'achieved'

  if (goal.trackState === 'BEHIND_TARGET') return 'behindTarget'
  if (goal.trackState === 'ON_TRACK') {
    if (goal.status === 'AT_RISK') return 'atRisk'
    return 'onTrack'
  }

  if (goal.status === 'AT_RISK') return 'atRisk'
  if (goal.status === 'BEHIND_TARGET' || goal.status === 'NOT_ACHIEVED') return 'behindTarget'
  if (goal.status === 'ON_TRACK') return 'onTrack'
  return 'onTrack'
}
