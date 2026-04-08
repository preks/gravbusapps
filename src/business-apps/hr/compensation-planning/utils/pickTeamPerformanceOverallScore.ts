import {
  getEmployeePerformanceEvaluationsAnalysis,
  getPerformanceEvaluationAnalysisDetail
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/performance-evaluation/services/performanceEvaluationApi'
import { mapPerformanceEvaluationsOverview } from '@/business-apps/hr/core/apps/employee-record/components/tabs/performance-evaluation/utils/performanceEvaluationMappers'
import type {
  EmployeePerformanceEvaluationsOverview,
  PerformanceCycleOverview,
  PerformanceEvaluationAnalysisDetailResponse,
  PerformanceEvaluationOverviewItem
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/performance-evaluation/types/performanceEvaluation.types'
export const COMPLETED_PERFORMANCE_CYCLE_STATUS = 'COMPLETED_PERFORMANCE_CYCLE_STATUS'

export function buildCompletedPerformanceCycleIdSet(
  cycles: ReadonlyArray<{ id: string; status: string | null }>
): Set<string> {
  const set = new Set<string>()
  for (const c of cycles) {
    if (c.status === COMPLETED_PERFORMANCE_CYCLE_STATUS) {
      set.add(c.id)
    }
  }
  return set
}

function evaluationPeriodEndTimestamp(cycle: PerformanceCycleOverview): number {
  const raw = cycle.evaluationPeriodEndDate
  if (!raw) {
    return Number.NEGATIVE_INFINITY
  }
  const t = Date.parse(raw)
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}

function evaluationCompletionTimestamp(e: PerformanceEvaluationOverviewItem): number {
  const raw = e.actualCompletionDate ?? e.startDate
  if (!raw) {
    return Number.NEGATIVE_INFINITY
  }
  const t = Date.parse(raw)
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}

function getLatestEvaluationForTeamCompensationColumn(
  cycle: PerformanceCycleOverview
): PerformanceEvaluationOverviewItem | null {
  if (cycle.evaluations.length === 0) {
    return null
  }

  const withNumeric = cycle.evaluations.filter(
    e => e.overallAverageNumeric != null && !Number.isNaN(Number(e.overallAverageNumeric))
  )
  const pool = withNumeric.length > 0 ? withNumeric : cycle.evaluations
  const [first, ...rest] = pool
  return rest.reduce(
    (best, cur) => (evaluationCompletionTimestamp(cur) > evaluationCompletionTimestamp(best) ? cur : best),
    first
  )
}

export function overallAverageNumericFromEvaluationAnalysisDetail(
  detail: PerformanceEvaluationAnalysisDetailResponse | null | undefined
): number | null {
  const n = detail?.overall?.averageNumeric
  if (n == null || Number.isNaN(Number(n))) {
    return null
  }
  return Number(n)
}

type PerformancePickFailureStep =
  | 'no_completed_cycles_in_directory'
  | 'no_cycles_in_rest_overview'
  | 'no_cycles_intersect_rest_and_hasura'
  | 'no_usable_evaluation_in_top_cycle'
  | 'evaluation_id_missing'

type PerformancePickDiagnosis =
  | { ok: true; evaluationId: string }
  | {
      ok: false
      step: PerformancePickFailureStep
      summary: string
      meta?: Record<string, string | number | boolean | null | undefined>
    }

function diagnosePickEvaluationId(
  overview: EmployeePerformanceEvaluationsOverview | null,
  completedCycleIds: Set<string>
): PerformancePickDiagnosis {
  if (completedCycleIds.size === 0) {
    return {
      ok: false,
      step: 'no_completed_cycles_in_directory',
      summary: 'No performance cycles with COMPLETED_PERFORMANCE_CYCLE_STATUS in Hasura (or directory not loaded).'
    }
  }

  if (!overview?.performanceCycles?.length) {
    return {
      ok: false,
      step: 'no_cycles_in_rest_overview',
      summary: 'Employee analysis overview returned no performanceCycles.'
    }
  }

  const eligible = overview.performanceCycles.filter(c => completedCycleIds.has(c.performanceCycleId))

  if (eligible.length === 0) {
    const restIds = overview.performanceCycles.map(c => c.performanceCycleId).join('|')
    return {
      ok: false,
      step: 'no_cycles_intersect_rest_and_hasura',
      summary: 'REST performanceCycleId values do not match any Hasura completed cycle id. Compare ids in Network tab.',
      meta: {
        restCycleCount: overview.performanceCycles.length,
        hasuraCompletedCount: completedCycleIds.size,
        restPerformanceCycleIds: restIds
      }
    }
  }

  const sorted = [...eligible].sort((a, b) => evaluationPeriodEndTimestamp(b) - evaluationPeriodEndTimestamp(a))

  const topCycle = sorted[0]
  if (!topCycle) {
    return {
      ok: false,
      step: 'no_cycles_in_rest_overview',
      summary: 'Eligible cycle list was empty after sort.'
    }
  }

  const evaluation = getLatestEvaluationForTeamCompensationColumn(topCycle)
  if (!evaluation) {
    return {
      ok: false,
      step: 'no_usable_evaluation_in_top_cycle',
      summary: 'Top cycle has no evaluations in the overview response.',
      meta: {
        topCyclePerformanceCycleId: topCycle.performanceCycleId,
        evaluationPeriodEndDate: topCycle.evaluationPeriodEndDate ?? ''
      }
    }
  }

  if (!evaluation.evaluationId) {
    return {
      ok: false,
      step: 'evaluation_id_missing',
      summary: 'Chosen evaluation has no evaluationId.',
      meta: { topCyclePerformanceCycleId: topCycle.performanceCycleId }
    }
  }

  return { ok: true, evaluationId: evaluation.evaluationId }
}

export async function resolveTeamPerformanceScore(
  accessToken: string,
  employeeId: string,
  completedCycleIds: Set<string>
): Promise<{ score: number | null }> {
  if (completedCycleIds.size === 0) {
    return { score: null }
  }

  let raw
  try {
    raw = await getEmployeePerformanceEvaluationsAnalysis(accessToken, employeeId)
  } catch {
    return { score: null }
  }

  const overview = mapPerformanceEvaluationsOverview(raw)
  const diagnosis = diagnosePickEvaluationId(overview, completedCycleIds)

  if (!diagnosis.ok) {
    return { score: null }
  }

  try {
    const detail = await getPerformanceEvaluationAnalysisDetail(accessToken, diagnosis.evaluationId, { employeeId })
    const score = overallAverageNumericFromEvaluationAnalysisDetail(detail)
    return { score }
  } catch {
    return { score: null }
  }
}
