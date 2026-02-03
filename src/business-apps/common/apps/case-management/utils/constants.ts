/**
 * Case Management Constants
 */

import { CaseStatus } from '../types'

export const CASE_STATUSES: Record<CaseStatus, { label: string; color: string; variant: string }> = {
  open: {
    label: 'Open',
    color: 'blue',
    variant: 'default'
  },
  in_progress: {
    label: 'In Progress',
    color: 'yellow',
    variant: 'warning'
  },
  blocked: {
    label: 'Blocked',
    color: 'red',
    variant: 'destructive'
  },
  completed: {
    label: 'Completed',
    color: 'green',
    variant: 'success'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'gray',
    variant: 'secondary'
  }
}

export const AUTO_REFRESH_INTERVAL = 30000 // 30 seconds

export const TERMINAL_FLOW_STATES = ['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT', 'CANCELED', 'SKIPPED']

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'red' }
]

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const ENTITY_TYPE_LABELS = {
  user: 'User',
  employee: 'Employee',
  organizationalUnit: 'Organizational Unit'
}
