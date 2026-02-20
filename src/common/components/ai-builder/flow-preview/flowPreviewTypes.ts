/**
 * Local flow types for the flow preview. Do not import from flow app or extend shared types here.
 */

export const FLOW_PREVIEW_STEP_TYPE = {
  TASK: 'TASK',
  APPROVAL: 'APPROVAL',
  INFORMATION: 'INFORMATION',
  ACKNOWLEDGE: 'ACKNOWLEDGE',
  GATEWAY: 'GATEWAY',
  FUNCTION: 'FUNCTION',
  AI_AGENT: 'AI_AGENT',
  AI_TASK_EXPERT: 'AI_TASK_EXPERT'
} as const

export type FlowPreviewStepType = (typeof FLOW_PREVIEW_STEP_TYPE)[keyof typeof FLOW_PREVIEW_STEP_TYPE]

export const FLOW_PREVIEW_TRIGGER_TYPE = {
  MANUAL_FORM: 'MANUAL_FORM',
  WEBHOOK: 'WEBHOOK',
  EVENT: 'EVENT',
  SCHEDULE: 'SCHEDULE',
  API_SCHEMA: 'API_SCHEMA'
} as const

export type FlowPreviewTriggerType = (typeof FLOW_PREVIEW_TRIGGER_TYPE)[keyof typeof FLOW_PREVIEW_TRIGGER_TYPE]

export interface FlowPreviewTrigger {
  id: string
  type: FlowPreviewTriggerType
  name: string
  config: Record<string, unknown>
}

export interface FlowPreviewStartConfig {
  triggers: FlowPreviewTrigger[]
}

export interface FlowPreviewInputOption {
  value: string
  label: string
}

export interface FlowPreviewInputBlock {
  type: string
  name: string
  label: string
  required?: boolean
  options?: FlowPreviewInputOption[]
}

export interface FlowPreviewLink {
  name: string
  url: string
  type?: string
}

export interface FlowPreviewTaskAssignment {
  targets: unknown
  assignmentMode: string
  allowReassignment?: boolean
}

export interface FlowPreviewStep {
  id?: string
  title: string
  message?: string
  type: FlowPreviewStepType | string
  dueInMinutes?: number
  form?: FlowPreviewInputBlock[]
  inputs?: FlowPreviewInputBlock[]
  links?: FlowPreviewLink[]
  assignment?: FlowPreviewTaskAssignment
  nextStep?: number | null
  branches?: { condition: string; nextStep: number }[]
  defaultNextStep?: number | null
}

export interface FlowPreviewTemplate {
  id?: string
  type: 'TEMPLATE' | 'SELF_SERVICE'
  name: string
  description?: string
  version: number
  steps: FlowPreviewStep[]
  start?: FlowPreviewStartConfig
}
