import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ReadinessStatus, IssueSeverity, PayrollRunStatus } from '../../types/payrollTypes'

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

const READINESS_VARIANTS: Record<ReadinessStatus, { label: string; variant: BadgeVariant }> = {
  ready: { label: 'Ready', variant: 'success' },
  warning: { label: 'Warning', variant: 'warning' },
  blocked: { label: 'Blocked', variant: 'destructive' },
  excluded: { label: 'Excluded', variant: 'secondary' }
}

const SEVERITY_VARIANTS: Record<IssueSeverity, { label: string; variant: BadgeVariant }> = {
  blocker: { label: 'Blocker', variant: 'destructive' },
  warning: { label: 'Warning', variant: 'warning' },
  info: { label: 'Info', variant: 'secondary' }
}

const RUN_STATUS_VARIANTS: Record<PayrollRunStatus, { label: string; variant: BadgeVariant }> = {
  PAYROLL_IN_PROGRESS: { label: 'In Progress', variant: 'outline' },
  PAYROLL_READY_FOR_REVIEW: { label: 'Ready for Review', variant: 'warning' },
  PAYROLL_APPROVED_FOR_EXPORT: { label: 'Approved', variant: 'success' },
  PAYROLL_EXPORTED: { label: 'Exported', variant: 'success' },
  PAYROLL_CLOSED: { label: 'Closed', variant: 'secondary' }
}

interface ReadinessStatusBadgeProps {
  status: ReadinessStatus
  translatedLabel?: string
}

export const ReadinessStatusBadge: React.FC<ReadinessStatusBadgeProps> = ({ status, translatedLabel }) => {
  const config = READINESS_VARIANTS[status]
  return <Badge variant={config.variant}>{translatedLabel || config.label}</Badge>
}

interface SeverityBadgeProps {
  severity: IssueSeverity
  translatedLabel?: string
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, translatedLabel }) => {
  const config = SEVERITY_VARIANTS[severity]
  return <Badge variant={config.variant}>{translatedLabel || config.label}</Badge>
}

interface PayrollRunStatusBadgeProps {
  status: PayrollRunStatus
  translatedLabel?: string
}

export const PayrollRunStatusBadge: React.FC<PayrollRunStatusBadgeProps> = ({ status, translatedLabel }) => {
  const config = RUN_STATUS_VARIANTS[status]
  return <Badge variant={config.variant}>{translatedLabel || config.label}</Badge>
}

interface ChangedBadgeProps {
  changed: boolean
}

export const ChangedBadge: React.FC<ChangedBadgeProps> = ({ changed }) => {
  if (!changed) return null
  return <Badge variant="outline">Changed</Badge>
}

interface IssueCountBadgeProps {
  count: number
  hasBlockers: boolean
}

export const IssueCountBadge: React.FC<IssueCountBadgeProps> = ({ count, hasBlockers }) => {
  if (count === 0) return <Badge variant="secondary">0</Badge>
  return <Badge variant={hasBlockers ? 'destructive' : 'warning'}>{count}</Badge>
}

interface FieldStatusBadgeProps {
  present: boolean
  label?: string
}

export const FieldStatusBadge: React.FC<FieldStatusBadgeProps> = ({ present, label }) => {
  if (present) return <Badge variant="success">{label || '✓'}</Badge>
  return <Badge variant="destructive">Missing</Badge>
}
