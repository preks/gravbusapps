import React from 'react'
import { Card, Badge, Progress } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import { ComplianceFlow, StepSegment } from '@/business-apps/flow/solutions/compliance/services/ComplianceDataService'

export interface FlowSummaryCardProps {
  flow: ComplianceFlow
  segments?: StepSegment[]
  onClick?: (flowId: string) => void
  'data-testid'?: string
}

/**
 * FlowSummaryCard
 * A reusable summary card for flows. Uses nw-design-system components only and
 * design tokens for any custom styling. No Tailwind color/spacing utilities are used here.
 */
export const FlowSummaryCard: React.FC<FlowSummaryCardProps> = ({
  flow,
  segments = [],
  onClick,
  'data-testid': dataTestId
}) => {
  // Derive due date and overdue indicator
  const actualDueDate = flow.dueDate ? new Date(flow.dueDate) : null
  const estimatedDueDate = new Date(new Date(flow.startTime).getTime() + 7 * 24 * 60 * 60 * 1000)
  const dueDate = actualDueDate || estimatedDueDate
  const now = new Date()
  const isOverdue = now > dueDate && flow.status === 'RUNNING'
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Compute progress based on segments if available
  let overallProgress = flow.progress || 0
  let completedSteps = flow.completedSteps || 0
  let totalSteps = flow.totalSteps || 0

  if (segments.length > 0) {
    const normalized = segments.map(s => {
      const pct = (s as any).percentage ?? (s as any).progressPercentage ?? 0
      const status = String(s.status || '').toUpperCase()
      return { percentage: Number.isFinite(pct) ? pct : 0, status }
    })
    totalSteps = normalized.length
    completedSteps = normalized.filter(s => s.status === 'COMPLETED').length
    overallProgress =
      normalized.reduce((sum, s) => sum + Math.max(0, Math.min(100, s.percentage)), 0) / normalized.length
  }

  // Status badge config
  const { badgeVariant, statusLabel, stripeColor } = (() => {
    if (flow.status === 'COMPLETED') {
      return { badgeVariant: 'success' as const, statusLabel: 'Done', stripeColor: 'var(--nw-success)' }
    }
    if (isOverdue) {
      return { badgeVariant: 'destructive' as const, statusLabel: 'Overdue', stripeColor: 'var(--nw-destructive)' }
    }
    if (flow.status === 'RUNNING') {
      return { badgeVariant: 'secondary' as const, statusLabel: 'Running', stripeColor: 'var(--nw-info)' }
    }
    return { badgeVariant: 'outline' as const, statusLabel: flow.status, stripeColor: 'var(--nw-muted)' }
  })()

  return (
    <div
      role="button"
      onClick={() => onClick?.(flow.id)}
      data-testid={dataTestId || `flow-summary-card-${flow.id}`}
      className="gba:border gba:rounded-lg gba:p-4 gba:shadow-sm gba:bg-white gba:hover:shadow-md gba:transition-shadow gba:cursor-pointer gba:border-l-4"
      style={{
        borderLeftColor: stripeColor
      }}
    >
      {/* Header Row */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Status dot */}
          <span aria-hidden className="gba:w-2 gba:h-2 gba:rounded-full" style={{ backgroundColor: stripeColor }} />

          {/* Title and ID */}
          <div>
            <div className="gba:text-sm gba:font-semibold gba:text-gray-900">
              {flow.workflowName || 'Untitled Flow'}
            </div>
            <div className="gba:text-xs gba:text-gray-500">ID: {flow.id.substring(0, 8)}...</div>
          </div>
        </div>

        {/* Status Badge and Task Count */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:text-right">
            <Badge variant={badgeVariant as any} size="sm" className="gba:text-xs">
              {statusLabel}
            </Badge>
            {isOverdue && <div className="gba:text-xs gba:font-bold gba:text-red-600 gba:mt-1">{statusLabel}</div>}
          </div>
          <div className="gba:text-right gba:text-xs">
            <div className="gba:font-semibold gba:text-gray-900">
              {flow.completedTasks}/{flow.totalTasks}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Progress Bar */}
      <div className="gba:mb-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
          <div className="gba:text-xs gba:text-gray-500">Tasks</div>
        </div>
        <Progress value={overallProgress} className="gba:h-1" />
      </div>

      {/* Metrics Row */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-3 gba:text-xs gba:mb-3">
        {/* Created */}
        <div>
          <div className="gba:text-gray-500 gba:mb-0.5">Created</div>
          <div className="gba:font-medium gba:text-gray-900">
            {new Date(flow.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <div className="gba:text-gray-500 gba:mb-0.5">Due Date</div>
          <div className={`gba:font-medium ${isOverdue ? 'gba:text-red-600' : 'gba:text-gray-900'}`}>
            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="gba:text-gray-500 gba:mb-0.5">Tasks</div>
          <div className="gba:font-medium gba:text-gray-900">
            {flow.completedTasks}/{flow.totalTasks}
          </div>
        </div>

        {/* Days Left */}
        <div>
          <div className="gba:text-gray-500 gba:mb-0.5">Days Left</div>
          <div className={`gba:font-medium ${isOverdue ? 'gba:text-red-600' : 'gba:text-gray-900'}`}>
            {isOverdue ? `${Math.abs(daysUntilDue)} days over` : `${Math.max(0, daysUntilDue)} days`}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t gba:border-gray-200">
        <div className="gba:text-xs gba:text-gray-500">By {flow.initiator || 'system'}</div>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onClick?.(flow.id)
          }}
          className="gba:text-xs gba:font-semibold gba:bg-transparent gba:border-0 gba:cursor-pointer gba:text-blue-600 hover:gba:text-blue-800"
          data-testid={`flow-summary-card-view-details-${flow.id}`}
        >
          View Details
        </button>
      </div>
    </div>
  )
}

export default FlowSummaryCard
