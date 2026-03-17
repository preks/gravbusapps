import type { SpreadsheetAutomation } from '../../types/automation'

export interface AutomationRun {
  id: string
  automationId: string
  spreadsheetAppId: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' | 'CANCELLED'
  recipientCount: number
  completedCount: number
  message?: string
  recipients: string[]
  startedAt: string
  completedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AutomationWithRuns extends SpreadsheetAutomation {
  spreadsheetAppId?: string
  spreadsheetAppName?: string
  recentRuns?: AutomationRun[]
}

export interface RunSubmission {
  id: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  copyAppName: string
  copyAppUrl: string
  status: 'COMPLETED' | 'SENT'
  completedAt?: string
}

export interface RecipientProfile {
  recipientName: string
  recipientAvatar?: string
}

export interface EmployeeLightResult {
  Employee?: Array<{ displayName: string; pictureThumbnail?: string }>
}

export interface SpreadsheetAutomationsSectionProps {
  accessToken: string
  'data-testid'?: string
}

export type TranslateFn = (key: string) => string
