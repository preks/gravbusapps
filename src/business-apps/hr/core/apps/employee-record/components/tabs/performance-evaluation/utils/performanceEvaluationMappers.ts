import {
  EmployeePerformanceEvaluationsAnalysisResponse,
  FlattenedPerformanceEvaluationItem,
  EmployeePerformanceEvaluationsOverview,
  PerformanceCycleOverview,
  PerformanceEvaluationItemApi,
  PerformanceEvaluationOverviewItem
} from '../types/performanceEvaluation.types'

const getStatusCode = (statusRef: string | null): string => {
  if (!statusRef) return 'UNKNOWN'
  const lastToken = statusRef.split(':').pop()
  return (lastToken || 'UNKNOWN').toUpperCase()
}

const mapEvaluation = (evaluation: PerformanceEvaluationItemApi): PerformanceEvaluationOverviewItem => {
  return {
    evaluationId: evaluation.evaluationId,
    startDate: evaluation.startDate,
    targetCompletionDate: evaluation.targetCompletionDate,
    actualCompletionDate: evaluation.actualCompletionDate,
    statusRef: evaluation.statusRef,
    statusCode: getStatusCode(evaluation.statusRef),
    overallAverageNumeric: evaluation.overall?.averageNumeric ?? null,
    overallRatingLabel: evaluation.overall?.mappedRatingScaleValueLabel ?? null,
    overallRatingNumericEquivalent: evaluation.overall?.mappedRatingScaleNumericEquivalent ?? null
  }
}

export const mapPerformanceEvaluationsOverview = (
  response: EmployeePerformanceEvaluationsAnalysisResponse
): EmployeePerformanceEvaluationsOverview => {
  const performanceCycles = (response.performanceCycles ?? [])
    .map(cycle => {
      const mappedEvaluations = (cycle.evaluations ?? []).map(mapEvaluation)
      const completedEvaluations = mappedEvaluations.filter(item => item.statusCode === 'COMPLETED').length
      const inProgressEvaluations = mappedEvaluations.filter(item => item.statusCode === 'IN_PROGRESS').length

      return {
        performanceCycleId: cycle.performanceCycleId,
        performanceCycleName: cycle.performanceCycleName || '-',
        performanceCycleStartDate: cycle.performanceCycleStartDate,
        performanceCycleEndDate: cycle.performanceCycleEndDate,
        evaluationPeriodStartDate: cycle.evaluationPeriodStartDate ?? null,
        evaluationPeriodEndDate: cycle.evaluationPeriodEndDate ?? null,
        totalEvaluations: mappedEvaluations.length,
        completedEvaluations,
        inProgressEvaluations,
        evaluations: mappedEvaluations
      }
    })
    .sort((a, b) => {
      const dateA = toComparableTimestamp(a.evaluationPeriodStartDate ?? a.performanceCycleStartDate) ?? 0
      const dateB = toComparableTimestamp(b.evaluationPeriodStartDate ?? b.performanceCycleStartDate) ?? 0
      return dateB - dateA
    })

  return {
    performanceCycles
  }
}

export const flattenPerformanceEvaluations = (
  overview: EmployeePerformanceEvaluationsOverview | null
): FlattenedPerformanceEvaluationItem[] => {
  if (!overview?.performanceCycles?.length) return []

  return overview.performanceCycles.flatMap(cycle =>
    cycle.evaluations.map(evaluation => ({
      performanceCycleId: cycle.performanceCycleId,
      performanceCycleName: cycle.performanceCycleName,
      performanceCycleStartDate: cycle.performanceCycleStartDate,
      performanceCycleEndDate: cycle.performanceCycleEndDate,
      evaluation
    }))
  )
}

const toComparableTimestamp = (value: string | null): number | null => {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

export const getLatestComparableTimestamp = (item: FlattenedPerformanceEvaluationItem): number => {
  return (
    toComparableTimestamp(item.evaluation.actualCompletionDate) ??
    toComparableTimestamp(item.evaluation.startDate) ??
    -1
  )
}

export const findLatestPerformanceEvaluationId = (
  overview: EmployeePerformanceEvaluationsOverview | null
): string | null => {
  const flattenedItems = flattenPerformanceEvaluations(overview)
  if (!flattenedItems.length) return null

  const [firstItem, ...remainingItems] = flattenedItems
  const latestEvaluation = remainingItems.reduce((currentLatest, currentItem) => {
    const currentLatestTimestamp = getLatestComparableTimestamp(currentLatest)
    const currentItemTimestamp = getLatestComparableTimestamp(currentItem)
    return currentItemTimestamp > currentLatestTimestamp ? currentItem : currentLatest
  }, firstItem)

  return latestEvaluation.evaluation.evaluationId
}

export const getLatestEvaluationForCycle = (
  cycle: PerformanceCycleOverview
): PerformanceEvaluationOverviewItem | null => {
  if (!cycle.evaluations.length) return null

  const [firstEvaluation, ...remainingEvaluations] = cycle.evaluations
  return remainingEvaluations.reduce((currentLatest, currentItem) => {
    const currentLatestTimestamp =
      toComparableTimestamp(currentLatest.actualCompletionDate) ?? toComparableTimestamp(currentLatest.startDate) ?? -1
    const currentItemTimestamp =
      toComparableTimestamp(currentItem.actualCompletionDate) ?? toComparableTimestamp(currentItem.startDate) ?? -1
    return currentItemTimestamp > currentLatestTimestamp ? currentItem : currentLatest
  }, firstEvaluation)
}

export const findLatestPerformanceCycleId = (
  overview: EmployeePerformanceEvaluationsOverview | null
): string | null => {
  if (!overview?.performanceCycles?.length) return null

  return overview.performanceCycles[0].performanceCycleId
}

export const findLatestEvaluationIdByCycleId = (
  overview: EmployeePerformanceEvaluationsOverview | null,
  performanceCycleId: string | null
): string | null => {
  if (!overview?.performanceCycles?.length || !performanceCycleId) return null

  const selectedCycle = overview.performanceCycles.find(cycle => cycle.performanceCycleId === performanceCycleId)
  if (!selectedCycle) return null

  return getLatestEvaluationForCycle(selectedCycle)?.evaluationId ?? null
}
