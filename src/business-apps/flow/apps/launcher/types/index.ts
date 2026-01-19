// FlowTemplate interface matching the custom flow engine API
export interface FlowTemplate {
  id?: string
  name: string
  description: string
  steps: any[]
  type?: string
  version?: number
  isPublished?: boolean
  metadata?: any
}

export interface LaunchParameters {
  [key: string]: string
}

export interface ExecutionAssignment {
  stepIndex: number
  stepTitle: string
  assignmentMode: string
  assignedUsers: string[]
}

export interface FlowLauncherProps {
  accessToken: string
  userInfo?: any
  'data-testid'?: string
}
