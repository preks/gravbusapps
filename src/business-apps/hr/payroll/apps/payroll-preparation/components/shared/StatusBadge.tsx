import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ReadinessStatus, IssueSeverity, PayrollRunStatus } from '../../types/payrollTypes'

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

type TranslateFn = (key: string) => string

const READINESS_VARIANTS: Record<ReadinessStatus, { labelKey: string; variant: BadgeVariant }> = {
  ready: { labelKey: 'readiness-ready', variant: 'success' },
  warning: { labelKey: 'readiness-warning', variant: 'warning' },
  blocked: { labelKey: 'readiness-blocked', variant: 'destructive' },
  excluded: { labelKey: 'readiness-excluded', variant: 'secondary' }
}

const SEVERITY_VARIANTS: Record<IssueSeverity, { labelKey: string; variant: BadgeVariant }> = {
  blocker: { labelKey: 'severity-blocker', variant: 'destructive' },
  warning: { labelKey: 'severity-warning', variant: 'warning' },
  info: { labelKey: 'severity-info', variant: 'secondary' }
}

const RUN_STATUS_VARIANTS: Record<PayrollRunStatus, { labelKey: string; variant: BadgeVariant }> = {
  PAYROLL_IN_PROGRESS: { labelKey: 'status-in-progress', variant: 'outline' },
  PAYROLL_READY_FOR_REVIEW: { labelKey: 'status-ready-for-review', variant: 'warning' },
  PAYROLL_APPROVED_FOR_EXPORT: { labelKey: 'status-approved', variant: 'success' },
  PAYROLL_EXPORTED: { labelKey: 'status-exported', variant: 'success' },
  PAYROLL_CLOSED: { labelKey: 'status-closed', variant: 'secondary' }
}

function resolveLabel(labelKey: string, translatedLabel: string | undefined, t: TranslateFn | undefined): string {
  if (translatedLabel) {
    return translatedLabel
  }

  if (t) {
    return t(labelKey)
  }

  return labelKey
}

interface ReadinessStatusBadgeProps {
  status: ReadinessStatus
  translatedLabel?: string
  t?: TranslateFn
}

export const ReadinessStatusBadge: React.FC<ReadinessStatusBadgeProps> = ({ status, translatedLabel, t }) => {
  const config = READINESS_VARIANTS[status]
  return <Badge variant={config.variant}>{resolveLabel(config.labelKey, translatedLabel, t)}</Badge>
}

interface SeverityBadgeProps {
  severity: IssueSeverity
  translatedLabel?: string
  t?: TranslateFn
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, translatedLabel, t }) => {
  const config = SEVERITY_VARIANTS[severity]
  return <Badge variant={config.variant}>{resolveLabel(config.labelKey, translatedLabel, t)}</Badge>
}

interface PayrollRunStatusBadgeProps {
  status: PayrollRunStatus
  translatedLabel?: string
  t?: TranslateFn
}

export const PayrollRunStatusBadge: React.FC<PayrollRunStatusBadgeProps> = ({ status, translatedLabel, t }) => {
  const config = RUN_STATUS_VARIANTS[status]
  return <Badge variant={config.variant}>{resolveLabel(config.labelKey, translatedLabel, t)}</Badge>
}

interface ChangedBadgeProps {
  changed: boolean
  label: string
}

export const ChangedBadge: React.FC<ChangedBadgeProps> = ({ changed, label }) => {
  if (!changed) return null
  return <Badge variant="outline">{label}</Badge>
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
  missingLabel: string
}

export const FieldStatusBadge: React.FC<FieldStatusBadgeProps> = ({ present, label, missingLabel }) => {
  if (present) return <Badge variant="success">{label || '✓'}</Badge>
  return <Badge variant="destructive">{missingLabel}</Badge>
}
