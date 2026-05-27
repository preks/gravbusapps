export interface CompleteAnalysisRequest {
  tenureThresholdYears: number
  minGroupSize: number
  scope: string
  analysisDate: string
  jobLevelId?: string
}

export interface CompleteAnalysisRequestOptions {
  tenureThresholdYears?: number
  minGroupSize?: number
  scope?: string
  analysisDate?: string
  jobLevelId?: string
}

export interface CompleteAnalysisResponse {
  runId?: string
  status?: string
}
