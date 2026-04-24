import {
  CompensationCompressionResponse,
  CompensationEquityHealthScoreResponse,
  CompensationGapExplanationResponse,
  CompensationGapExplanationScenarioResponse,
  CompensationMarketBenchmarkResponse,
  CompensationBenchmarkBucketResponse,
  CompressionAnalysisData,
  HealthScoreData,
  GapExplanationData,
  MarketBenchmarkData,
  RiskLevel,
  RiskScore,
  CompressionRiskItem
} from '../types/compensationAnalysis.types.ts'

/**
 * Transform compression analysis GraphQL response to domain model
 */
export const transformCompressionAnalysis = (
  response: CompensationCompressionResponse
): CompressionAnalysisData | null => {
  if (response.CompensationCompression.length === 0) {
    return null
  }

  const compression = response.CompensationCompression[0]

  return {
    analysisId: compression.analysisRun.id,
    analysisName: `Compression Analysis - ${compression.analysisDate}`,
    analysisDate: compression.analysisDate,
    tenureThresholdYears: compression.tenureThresholdYears,
    totalEmployeesAnalyzed: compression.totalEmployees,
    totalCompressionCases: compression.totalCompressionCases,
    overallRiskScore: compression.overallRiskScore,
    compressionRisks: compression.risks.map(risk => ({
      id: risk.id,
      department: risk.department,
      jobLevelName: risk.jobLevelName,
      veteranName: risk.veteranName,
      veteranSalary: risk.veteranSalary,
      veteranTenure: risk.veteranTenure,
      newHireName: risk.newHireName,
      newHireSalary: risk.newHireSalary,
      compressionAmount: risk.compressionAmount,
      compressionScore: risk.compressionScore
    })),
    heatmap: [], // Not implemented in current schema
    departmentSummary: {}, // Not implemented in current schema
    warnings: [] // Not implemented in current schema
  }
}

/**
 * Transform health score GraphQL response to domain model
 */
export const transformHealthScore = (response: CompensationEquityHealthScoreResponse): HealthScoreData | null => {
  if (response.CompensationEquityHealthScore.length === 0) {
    return null
  }

  const healthScore = response.CompensationEquityHealthScore[0]

  return {
    score: healthScore.score,
    label: healthScore.label,
    weightedRisk: healthScore.weightedRisk,
    unexplainedRisk: healthScore.unexplainedRisk,
    totalGapRisk: healthScore.totalGapRisk,
    compressionRisk: healthScore.compressionRisk,
    weights: {
      total: healthScore.totalGapRisk + healthScore.compressionRisk,
      compression: healthScore.compressionRisk,
      unexplained: healthScore.unexplainedRisk
    }
  }
}

/**
 * Transform gap explanation GraphQL response to domain model
 */
export const transformGapExplanation = async (
  gapResponse: CompensationGapExplanationResponse,
  scenariosResponse: CompensationGapExplanationScenarioResponse
): Promise<GapExplanationData | null> => {
  if (gapResponse.CompensationGapExplanation.length === 0) {
    return null
  }

  const gap = gapResponse.CompensationGapExplanation[0]

  return {
    analysisDate: gap.analysisDate,
    fiscalYear: new Date(gap.analysisDate).getFullYear().toString(),
    totalEmployees: gap.totalEmployees,
    jobLevelId: gap.jobLevelId,
    jobLevelName: null, // Not available in current schema
    jobPositionId: gap.jobPositionId,
    jobPositionName: null, // Not available in current schema
    payGapPercentage: gap.totalGapPct,
    tenureExplainedPercent: gap.tenureExplainedPct,
    performanceExplainedPercent: gap.performanceExplainedPct,
    unexplainedPercent: gap.unexplainedPct,
    unexplainedAbsolutePercent: gap.unexplainedAbs,
    otherPercent: gap.otherPct,
    scenarioBreakdowns: scenariosResponse.CompensationGapExplanationScenario.map(scenario => ({
      scenario: scenario.scenario,
      gender: scenario.gender,
      employeeCount: scenario.employeeCount,
      avgTenure: scenario.avgTenure,
      avgPerformance: scenario.avgPerformance,
      avgSalary: scenario.avgSalary
    }))
  }
}

/**
 * Transform market benchmark GraphQL response to domain model
 */
export const transformMarketBenchmark = async (
  benchmarkResponse: CompensationMarketBenchmarkResponse,
  bucketsResponse: CompensationBenchmarkBucketResponse
): Promise<MarketBenchmarkData | null> => {
  if (benchmarkResponse.CompensationMarketBenchmark.length === 0) {
    return null
  }

  const benchmark = benchmarkResponse.CompensationMarketBenchmark[0]

  return {
    analysisDate: benchmark.analysisDate,
    companyCompRatioP50: benchmark.companyCompRatioP50,
    companyMarketAlignmentLabel: benchmark.companyAlignmentLabel as 'Above Market' | 'Below Market' | 'Near Market',
    results: bucketsResponse.CompensationBenchmarkBucket.map(bucket => ({
      jobPositionId: `${bucket.jobLevelCode}-${bucket.jobFamilyCode}`, // Synthetic ID
      jobLevelCode: bucket.jobLevelCode,
      internalN: bucket.internalN,
      internalP25: bucket.internalP25,
      internalP50: bucket.internalP50,
      internalP75: bucket.internalP75,
      marketP25: bucket.marketP25,
      marketP50: bucket.marketP50,
      marketP75: bucket.marketP75,
      compRatioP50: bucket.compRatioP50,
      marketAlignmentLabel: bucket.alignmentLabel,
      flags: [] // Not implemented in current schema
    })),
    warnings: [] // Not implemented in current schema
  }
}

/**
 * Get risk level categorization based on compression score
 */
export const getRiskLevel = (score: RiskScore): RiskLevel => {
  if (score >= 40) return { label: 'High Risk', color: 'gba:text-red-600' }
  if (score >= 20) return { label: 'Medium Risk', color: 'gba:text-orange-600' }
  return { label: 'Low Risk', color: 'gba:text-green-600' }
}

/**
 * Sort compression risks by score in descending order
 */
export const sortCompressionRisksByScore = (risks: CompressionRiskItem[]): CompressionRiskItem[] => {
  return [...risks].sort((a, b) => b.compressionScore - a.compressionScore)
}

/**
 * Get high risk compression cases count
 */
export const getHighRiskCasesCount = (risks: CompressionRiskItem[]): number => {
  return risks.filter(risk => risk.compressionScore >= 40).length
}

/**
 * Format salary for display
 */
export const formatSalary = (amount: number): string => {
  return `$${amount.toLocaleString()}`
}

/**
 * Format salary in thousands for KPI cards
 */
export const formatSalaryInThousands = (amount: number): string => {
  return `${Math.round(amount / 1000)}K`
}

/**
 * Get pay gap risk color based on percentage
 */
export const getPayGapRiskColor = (percentage: number): string => {
  if (Math.abs(percentage) < 5) return 'gba:text-green-500'
  if (Math.abs(percentage) < 10) return 'gba:text-orange-500'
  return 'gba:text-red-500'
}

/**
 * Get market alignment color based on label
 */
export const getMarketAlignmentColor = (alignmentLabel: string): string => {
  switch (alignmentLabel) {
    case 'Above Market':
      return 'gba:text-green-500'
    case 'Near Market':
      return 'gba:text-blue-500'
    case 'Below Market':
      return 'gba:text-red-500'
    default:
      return 'gba:text-gray-500'
  }
}
