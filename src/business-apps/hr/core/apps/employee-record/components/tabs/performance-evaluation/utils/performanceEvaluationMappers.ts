import {
  EmployeePerformanceEvaluationsAnalysisResponse,
  EmployeePerformanceEvaluationsOverview,
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
  const performanceCycles = (response.performanceCycles ?? []).map(cycle => {
    const mappedEvaluations = (cycle.evaluations ?? []).map(mapEvaluation)
    const completedEvaluations = mappedEvaluations.filter(item => item.statusCode === 'COMPLETED').length
    const inProgressEvaluations = mappedEvaluations.filter(item => item.statusCode === 'IN_PROGRESS').length

    return {
      performanceCycleId: cycle.performanceCycleId,
      performanceCycleName: cycle.performanceCycleName || '-',
      performanceCycleStartDate: cycle.performanceCycleStartDate,
      performanceCycleEndDate: cycle.performanceCycleEndDate,
      totalEvaluations: mappedEvaluations.length,
      completedEvaluations,
      inProgressEvaluations,
      evaluations: mappedEvaluations
    }
  })

  return {
    performanceCycles
  }
}
