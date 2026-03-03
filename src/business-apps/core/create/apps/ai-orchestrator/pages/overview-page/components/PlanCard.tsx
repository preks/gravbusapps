/**
 * Individual plan card component
 * Displays plan info with optional selection checkbox and delete button
 */

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Card, Checkbox } from '@newwork/nw-design-system'
import { AppIconBadge } from '../../../features/orchestrator/components/ui/AppIconBadge'
import { planTitle } from '../utils/planFormatters'

interface PlanCardData {
  jobId: string
  status: string
  createdAt?: string
  appMetadata?: {
    name?: string
    icon?: string
  }
  userSummary?: {
    title?: string
  }
  originalPrompt?: string
}

export interface PlanCardProps {
  plan: PlanCardData
  isSelectMode: boolean
  isSelected: boolean
  onToggleSelection: (jobId: string) => void
  onOpen: (jobId: string) => void
  onDelete: (jobId: string, e: React.MouseEvent) => void
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isSelectMode,
  isSelected,
  onToggleSelection,
  onOpen,
  onDelete
}) => {
  const handleCardClick = () => {
    if (isSelectMode) {
      onToggleSelection(plan.jobId)
    } else {
      onOpen(plan.jobId)
    }
  }

  return (
    <Card
      className={`gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/50 gba:relative ${
        isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20 gba:bg-primary/5' : ''
      }`}
      onClick={handleCardClick}
      data-testid={`ai-orchestrator-plan-${plan.jobId}`}
    >
      {isSelectMode && (
        <div className="gba:absolute gba:top-4 gba:left-4 gba:z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(plan.jobId)}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className={`gba:flex gba:items-center gba:gap-3 gba:p-4 ${isSelectMode ? 'gba:pl-12' : ''}`}>
        <AppIconBadge iconName={plan.appMetadata?.icon} size="sm" />
        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:font-medium gba:text-foreground gba:truncate">
            {plan.appMetadata?.name || planTitle(plan)}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">
            {plan.status} · {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : ''}
          </p>
        </div>
        {!isSelectMode && (
          <button
            type="button"
            onClick={e => onDelete(plan.jobId, e)}
            className="gba:shrink-0 gba:text-muted-foreground hover:gba:text-destructive gba:p-1.5 gba:rounded gba:transition-colors"
            title="Delete plan"
          >
            <Trash2 className="gba:w-4 gba:h-4" />
          </button>
        )}
      </div>
    </Card>
  )
}
