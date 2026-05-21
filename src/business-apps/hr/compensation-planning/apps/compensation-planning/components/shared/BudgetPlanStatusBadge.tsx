import React, { type ComponentProps } from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'
import translations from '../../_i18n'

type BudgetStatusBadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>

/** Maps API status to badge variants. Sent back uses muted `secondary` (grey). */
const STATUS_VARIANTS: Record<BudgetPlanStatusApi, BudgetStatusBadgeVariant> = {
  UNKOWN_BUDGET_STATUS: 'outline',
  BUDGET_PLAN_DRAFT: 'secondary',
  BUDGET_PLAN_SUBMITTED: 'warning',
  BUDGET_PLAN_APPROVED: 'success',
  BUDGET_PLAN_REJECTED: 'destructive',
  BUDGET_PLAN_SENT_BACK: 'secondary',
  BUDGET_PLAN_EXECUTED: 'info'
}

const STATUS_LABEL_KEYS: Record<BudgetPlanStatusApi, string> = {
  UNKOWN_BUDGET_STATUS: 'budget-plan-status-unknown',
  BUDGET_PLAN_DRAFT: 'budget-plan-status-draft',
  BUDGET_PLAN_SUBMITTED: 'budget-plan-status-submitted',
  BUDGET_PLAN_APPROVED: 'budget-plan-status-approved',
  BUDGET_PLAN_REJECTED: 'budget-plan-status-rejected',
  BUDGET_PLAN_SENT_BACK: 'budget-plan-status-sent-back',
  BUDGET_PLAN_EXECUTED: 'budget-plan-status-executed'
}

interface BudgetPlanStatusBadgeProps {
  status: string
  /** When set (e.g. translated "Allocated" for org-unit DRAFT), shown instead of the default English label. */
  label?: string
}

export const BudgetPlanStatusBadge: React.FC<BudgetPlanStatusBadgeProps> = ({ status, label }) => {
  const { t } = useTranslation(translations)
  const variant = STATUS_VARIANTS[status as BudgetPlanStatusApi] ?? 'outline'
  const labelKey = STATUS_LABEL_KEYS[status as BudgetPlanStatusApi]
  const labelText = label ?? (labelKey ? t(labelKey) : status)
  return <Badge variant={variant}>{labelText}</Badge>
}
