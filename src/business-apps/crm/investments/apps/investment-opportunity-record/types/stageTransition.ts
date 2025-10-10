/**
 * Stage Transition Types
 *
 * Type definitions for opportunity stage transition conditions and workflow integration
 */

/**
 * Assignment target interface for workflow assignments
 */
export interface AssignmentTarget {
  users?: string[] | ['ANY']
  organizationalUnits?: string[] | ['ANY']
  matrixTeams?: string[] | ['ANY']
  companies?: string[] | ['ANY']
  siteLocations?: string[] | ['ANY']
  costCenters?: string[] | ['ANY']
  capabilities?: string[] | ['ANY']
}

/**
 * Individual condition within a stage transition
 */
export interface StageTransitionConditionItem {
  type: 'APPROVAL' | 'TASK_COMPLETION' | 'DATA_VALIDATION'
  flowTemplateId: string
  requiredAssignments?: AssignmentTarget
  autoAssign?: boolean
  timeoutMinutes?: number
  title?: string
  description?: string
}

/**
 * Complete stage transition condition definition
 */
export interface StageTransitionCondition {
  id: string
  fromStage: string
  toStage: string
  pipelineId: string
  conditions: StageTransitionConditionItem[]
  isActive: boolean
  description?: string
}

/**
 * Workflow execution parameters for stage transitions
 */
export interface WorkflowExecutionParams {
  opportunityId: string
  opportunityName: string
  opportunityValue: number
  currency: string
  fromStage: string
  toStage: string
  ownerEmployeeId: string
  pipelineId: string
  conditionId: string
}

/**
 * Workflow step status
 */
export interface WorkflowStep {
  id: string
  name: string
  status: 'SCHEDULED' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING'
  type?: string
  message?: string
  dueDate?: string
  expectedStartAt?: string
  expectedFinishAt?: string
  assignmentMode?: string
  allowReassignment?: boolean
  assignmentTargets?: any
}

/**
 * Workflow status from custom-flow-engine
 */
export interface WorkflowStatus {
  id: string
  templateId: string
  name?: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TERMINATED'
  createdAt: string
  progress: number
  steps: WorkflowStep[]
  input?: {
    runtimeParameters?: WorkflowExecutionParams
    context?: {
      entityType: string
      entityId: string
      transitionType: string
      conditionId: string
    }
  }
  currentStep?: number
  totalSteps?: number
  completedSteps?: number
}

/**
 * Result of workflow execution
 */
export interface WorkflowExecutionResult {
  workflowId: string
  templateId: string
  workflowName: string
  status: string
}

/**
 * Active workflows query result
 */
export interface ActiveWorkflowsResult {
  workflows: WorkflowStatus[]
  totalCount: number
}

/**
 * Workflow details with task information
 */
export interface WorkflowDetails {
  id: string
  name: string
  status: string
  input: any
  tasks: {
    id: string
    name: string
    status: string
    assignedTo?: string
    dueDate?: string
    completedAt?: string
  }[]
  startTime: string
  endTime?: string
}
