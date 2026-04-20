import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'

const STATUS_VARIANTS: Record<BudgetPlanStatusApi, 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  UNKOWN_BUDGET_STATUS: 'outline',
  BUDGET_PLAN_DRAFT: 'secondary',
  BUDGET_PLAN_SUBMITTED: 'warning',
  BUDGET_PLAN_APPROVED: 'success',
  BUDGET_PLAN_REJECTED: 'destructive',
  BUDGET_PLAN_SENT_BACK: 'warning',
  BUDGET_PLAN_EXECUTED: 'success'
}

const STATUS_LABELS: Record<BudgetPlanStatusApi, string> = {
  UNKOWN_BUDGET_STATUS: 'Unknown',
  BUDGET_PLAN_DRAFT: 'Draft',
  BUDGET_PLAN_SUBMITTED: 'Submitted',
  BUDGET_PLAN_APPROVED: 'Approved',
  BUDGET_PLAN_REJECTED: 'Rejected',
  BUDGET_PLAN_SENT_BACK: 'Sent Back',
  BUDGET_PLAN_EXECUTED: 'Executed'
}

interface BudgetPlanStatusBadgeProps {
  status: string
  /** When set (e.g. translated "Allocated" for org-unit DRAFT), shown instead of the default English label. */
  label?: string
}

export const BudgetPlanStatusBadge: React.FC<BudgetPlanStatusBadgeProps> = ({ status, label }) => {
  const variant = STATUS_VARIANTS[status as BudgetPlanStatusApi] ?? 'outline'
  const labelText = label ?? STATUS_LABELS[status as BudgetPlanStatusApi] ?? status
  return <Badge variant={variant}>{labelText}</Badge>
}
