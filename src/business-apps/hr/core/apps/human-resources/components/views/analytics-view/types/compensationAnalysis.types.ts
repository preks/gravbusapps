// Common interfaces for analysis runs
export interface AnalysisRun {
  id: string
  type: string
  status: string
  requestedAt: string
  completedAt: string | null
}

// Base response interfaces from GraphQL
export interface CompensationAnalysisRunResponse {
  CompensationAnalysisRun: Array<{
    id: string
    type: string
    status: string
    params: any
    requestedAt: string
    completedAt: string | null
    errorMessage: string | null
  }>
}

export interface CompensationCompressionResponse {
  CompensationCompression: Array<{
    id: string
    runId: string
    overallRiskScore: number
    totalCompressionCases: number
    totalEmployees: number
    tenureThresholdYears: number
    analysisDate: string
    analysisRun: AnalysisRun
    risks: Array<CompensationCompressionRisk>
  }>
}

export interface CompensationCompressionRisk {
  id: string
  parentId: string
  department: string
  jobLevelName: string
  veteranName: string
  veteranSalary: number
  veteranTenure: number
  newHireName: string
  newHireSalary: number
  compressionAmount: number
  compressionScore: number
}

export interface CompensationEquityHealthScoreResponse {
  CompensationEquityHealthScore: Array<{
    id: string
    runId: string
    score: number
    label: string
    weightedRisk: number
    unexplainedRisk: number
    totalGapRisk: number
    compressionRisk: number
    run: AnalysisRun
  }>
}

export interface CompensationGapExplanationResponse {
  CompensationGapExplanation: Array<{
    id: string
    runId: string
    analysisDate: string
    scope: string
    jobLevelId: string | null
    totalEmployees: number
    totalGapPct: number
    unexplainedPct: number
    unexplainedAbs: number
    tenureExplainedPct: number
    performanceExplainedPct: number
    otherPct: number
    run: AnalysisRun
  }>
}

export interface CompensationGapExplanationScenarioResponse {
  CompensationGapExplanationScenario: Array<{
    id: string
    parentId: string
    scenario: string
    gender: string
    employeeCount: number
    avgTenure: number
    avgPerformance: number
    avgSalary: number
  }>
}

export interface CompensationMarketBenchmarkResponse {
  CompensationMarketBenchmark: Array<{
    id: string
    runId: string
    analysisDate: string
    companyCompRatioP50: number
    companyAlignmentLabel: string
    run: AnalysisRun
  }>
}

export interface CompensationBenchmarkBucketResponse {
  CompensationBenchmarkBucket: Array<{
    id: string
    parentId: string
    jobLevelCode: string
    jobLevelName: string
    jobFamilyCode: string
    jobFamilyName: string
    geoZoneCode: string
    internalN: number
    internalP25: number
    internalP50: number
    internalP75: number
    marketP25: number
    marketP50: number
    marketP75: number
    compRatioP50: number
    alignmentLabel: string
  }>
}

// Domain types (transformed for business logic)
export interface CompressionAnalysisData {
  analysisId: string
  analysisName: string
  analysisDate: string
  tenureThresholdYears: number
  totalEmployeesAnalyzed: number
  totalCompressionCases: number
  overallRiskScore: number
  compressionRisks: CompressionRiskItem[]
  heatmap: any[]
  departmentSummary: any
  warnings: string[]
}

export interface CompressionRiskItem {
  id: string
  department: string
  jobLevelName: string
  veteranName: string
  veteranSalary: number
  veteranTenure: number
  newHireName: string
  newHireSalary: number
  compressionAmount: number
  compressionScore: number
}

export interface HealthScoreData {
  score: number
  label: string
  weightedRisk: number
  unexplainedRisk: number
  totalGapRisk: number
  compressionRisk: number
  weights: {
    total: number
    compression: number
    unexplained: number
  }
}

export interface GapExplanationData {
  analysisDate: string | null
  fiscalYear: string | null
  totalEmployees: number
  jobLevelId: string | null
  jobLevelName: string | null
  jobPositionId: string | null
  jobPositionName: string | null
  payGapPercentage: number
  tenureExplainedPercent: number
  performanceExplainedPercent: number
  unexplainedPercent: number
  unexplainedAbsolutePercent: number
  otherPercent: number
  scenarioBreakdowns: GapExplanationScenario[]
}

export interface GapExplanationScenario {
  scenario: string
  gender: string
  employeeCount: number
  avgTenure: number
  avgPerformance: number
  avgSalary: number
}

export interface MarketBenchmarkData {
  analysisDate: string
  companyCompRatioP50: number
  companyMarketAlignmentLabel: 'Above Market' | 'Below Market' | 'Near Market'
  results: MarketBenchmarkResult[]
  warnings: string[]
}

export interface MarketBenchmarkResult {
  jobPositionId: string
  jobLevelCode: string
  internalN: number
  internalP25: number
  internalP50: number
  internalP75: number
  marketP25: number
  marketP50: number
  marketP75: number
  compRatioP50: number
  marketAlignmentLabel: string
  flags: any[]
}

// Hook state interfaces
export interface CompensationDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseCompensationDataResult {
  compressionAnalysis: CompensationDataState<CompressionAnalysisData>
  healthScore: CompensationDataState<HealthScoreData>
  gapExplanation: CompensationDataState<GapExplanationData>
  marketBenchmark: CompensationDataState<MarketBenchmarkData>
  refetch: () => Promise<void>
}

// Risk level categorization
export interface RiskLevel {
  label: string
  color: string
}

export type RiskScore = number
