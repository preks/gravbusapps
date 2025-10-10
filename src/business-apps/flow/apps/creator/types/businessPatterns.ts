/**
 * Business pattern definitions for wizard-based flow template creation
 */

import { FlowStepType, InputType, AssignmentMode } from './flowTemplate'

// Business pattern categories
export enum BusinessPatternCategory {
  APPROVAL = 'APPROVAL',
  INFORMATION = 'INFORMATION',
  TASK_COORDINATION = 'TASK_COORDINATION',
  DECISION_MAKING = 'DECISION_MAKING',
  SURVEY = 'SURVEY',
  REQUEST_RESPONSE = 'REQUEST_RESPONSE'
}

// Sub-pattern types for each category
export enum ApprovalPattern {
  SINGLE_APPROVER = 'SINGLE_APPROVER',
  APPROVAL_CHAIN = 'APPROVAL_CHAIN',
  APPROVAL_COMMITTEE = 'APPROVAL_COMMITTEE',
  ANY_APPROVER = 'ANY_APPROVER'
}

export enum InformationPattern {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  ACKNOWLEDGMENT_REQUIRED = 'ACKNOWLEDGMENT_REQUIRED',
  INFORMATION_WITH_FEEDBACK = 'INFORMATION_WITH_FEEDBACK',
  TRAINING_COMPLIANCE = 'TRAINING_COMPLIANCE'
}

export enum TaskCoordinationPattern {
  TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',
  WORK_DISTRIBUTION = 'WORK_DISTRIBUTION',
  COLLABORATIVE_TASKS = 'COLLABORATIVE_TASKS',
  TASK_CHAIN = 'TASK_CHAIN'
}

export enum DecisionMakingPattern {
  CONSULTATION = 'CONSULTATION',
  VOTING = 'VOTING',
  EXPERT_REVIEW = 'EXPERT_REVIEW',
  CONSENSUS_BUILDING = 'CONSENSUS_BUILDING'
}

export enum SurveyPattern {
  EMPLOYEE_SURVEY = 'EMPLOYEE_SURVEY',
  FEEDBACK_COLLECTION = 'FEEDBACK_COLLECTION',
  ASSESSMENT_SURVEY = 'ASSESSMENT_SURVEY',
  SATISFACTION_SURVEY = 'SATISFACTION_SURVEY'
}

export enum RequestResponsePattern {
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  RESOURCE_REQUEST = 'RESOURCE_REQUEST',
  PERMISSION_REQUEST = 'PERMISSION_REQUEST',
  INFORMATION_REQUEST = 'INFORMATION_REQUEST'
}

// Configuration requirements for each pattern
export interface PatternConfiguration {
  requiresApproval: boolean
  requiresAssignment: boolean
  requiresDeadline: boolean
  requiresEscalation: boolean
  allowsMultipleSteps: boolean
  recommendedFlowStepTypes: FlowStepType[]
  forbiddenFlowStepTypes: FlowStepType[]
  recommendedInputs: InputType[]
  minSteps: number
  maxSteps: number
}

// Business pattern definition
export interface BusinessPattern {
  id: string
  category: BusinessPatternCategory
  subPattern: string
  title: string
  description: string
  icon: string
  color: string
  useCases: string[]
  configuration: PatternConfiguration
  preConfiguredSteps: PreConfiguredStep[]
  validationRules: ValidationRule[]
}

// Pre-configured step for patterns
export interface PreConfiguredStep {
  title: string
  description: string
  type: FlowStepType
  inputs?: PreConfiguredInputBlock[]
  links?: any[]
  assignment?: {
    assignmentMode: AssignmentMode
    allowReassignment?: boolean
  }
}

export interface PreConfiguredInputBlock {
  type: InputType
  name: string
  label: string
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

// Validation rules for patterns
export interface ValidationRule {
  field: string
  rule: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
  customValidator?: (value: any, template: any) => boolean
}

// Wizard step configuration
export interface WizardStep {
  id: string
  title: string
  description: string
  component: string
  required: boolean
  canSkip: boolean
  nextStep?: string
  previousStep?: string
}

// Pattern selection result
export interface PatternSelection {
  pattern: BusinessPattern
  customizations: Record<string, any>
  selectedSteps: PreConfiguredStep[]
}

// Wizard state
export interface WizardState {
  currentStep: number
  steps: WizardStep[]
  selectedPattern?: BusinessPattern
  configuration: Record<string, any>
  isValid: boolean
  errors: Record<string, string>
}
