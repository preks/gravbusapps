export interface CompensationAnalysisRun {
  id: string
  type: string
  status: string
  params: unknown
  requestedAt: string
  completedAt: string | null
  errorMessage: string | null
}
