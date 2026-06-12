export interface FlowTestStepStatus {
  rootTaskIndex?: number
  rootTaskReference?: string
  rootTaskTitle?: string
  stepType?: string
  stepStatus?: string
  stepProgressPercentage?: number
  assignmentMode?: string
  [key: string]: unknown
}

export interface FlowTestStepOutcome {
  stepReference: string
  stepTitle: string
  status?: string
  timestamp?: string
  taskType?: string
  inputData?: Record<string, unknown>
  formData?: Record<string, unknown>
  outputData?: unknown
  executionDetails?: Record<string, unknown>
  fields: Array<{ label: string; value: unknown }>
}

export interface FlowTestExecutionSnapshot {
  workflowId: string
  status: string | null
  progress: number | null
  timedOut: boolean
  steps: FlowTestStepStatus[]
  outcomes: Record<string, FlowTestStepOutcome>
  summaryData: Array<{ label: string; value: unknown }>
  reachableStepIndexes?: number[]
}
