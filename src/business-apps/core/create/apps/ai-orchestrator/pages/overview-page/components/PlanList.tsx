/**
 * Plan list container component
 * Manages list rendering with loading, error, and empty states
 */

import React from 'react'
import { Loader2 } from 'lucide-react'
import { PlanCard } from './PlanCard'

interface PlanData {
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

interface PagingInfo {
  totalRecords: number
  limit: number
  offset: number
}

export interface PlanListProps {
  plans: PlanData[]
  loading: boolean
  error: string | null
  paging?: PagingInfo | null
  isSelectMode: boolean
  selectedPlanIds: Set<string>
  onToggleSelection: (jobId: string) => void
  onOpenPlan: (jobId: string) => void
  onDeleteSingle: (jobId: string, e: React.MouseEvent) => void
}

export const PlanList: React.FC<PlanListProps> = ({
  plans,
  loading,
  error,
  paging,
  isSelectMode,
  selectedPlanIds,
  onToggleSelection,
  onOpenPlan,
  onDeleteSingle
}) => {
  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8 gba:text-muted-foreground">
        <Loader2 className="gba:w-6 gba:h-6 gba:animate-spin gba:mr-2" />
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <p className="gba:text-destructive gba:py-4" data-testid="ai-orchestrator-list-error">
        {error}
      </p>
    )
  }

  if (plans.length === 0) {
    return <p className="gba:text-muted-foreground gba:py-4">No plans yet. Create one with &quot;New plan&quot;.</p>
  }

  return (
    <>
      <ul className="gba:space-y-2" data-testid="ai-orchestrator-plan-list">
        {plans.map(plan => (
          <li key={plan.jobId}>
            <PlanCard
              plan={plan}
              isSelectMode={isSelectMode}
              isSelected={selectedPlanIds.has(plan.jobId)}
              onToggleSelection={onToggleSelection}
              onOpen={onOpenPlan}
              onDelete={onDeleteSingle}
            />
          </li>
        ))}
      </ul>
      {paging && paging.totalRecords > plans.length && (
        <p className="gba:text-sm gba:text-muted-foreground">
          Showing {plans.length} of {paging.totalRecords} plans.
        </p>
      )}
    </>
  )
}
