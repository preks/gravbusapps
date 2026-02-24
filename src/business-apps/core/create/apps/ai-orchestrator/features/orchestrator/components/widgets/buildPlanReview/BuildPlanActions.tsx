/**
 * BuildPlanActions - Action buttons for confirming or canceling build plans
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface BuildPlanActionsProps {
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
  isRefining?: boolean
  allQuestionsAnswered: boolean
  selectedCount?: number
  totalCount?: number
  variant?: 'simple' | 'withCounter'
}

export const BuildPlanActions: React.FC<BuildPlanActionsProps> = ({
  onConfirm,
  onCancel,
  isLoading,
  isRefining,
  allQuestionsAnswered,
  selectedCount,
  totalCount,
  variant = 'simple'
}) => {
  if (variant === 'withCounter' && selectedCount !== undefined && totalCount !== undefined) {
    return (
      <div className="gba:flex gba:items-center gba:justify-between gba:pt-6 gba:pb-4 gba:mt-10 gba:border-t gba:border-border gba:bg-background">
        <div className="gba:text-sm gba:text-muted-foreground gba:font-medium">
          {selectedCount} of {totalCount} component{totalCount === 1 ? '' : 's'} selected
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading} size="lg">
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={onConfirm}
            disabled={isLoading || !allQuestionsAnswered}
            className="gba:min-w-[160px]"
          >
            {isLoading ? <>{`... Building...`}</> : <>Start Build</>}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:pt-3 gba:border-t gba:border-border">
      <Button variant="ghost" onClick={onCancel} disabled={isLoading || isRefining}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={isLoading || isRefining || !allQuestionsAnswered}>
        {isLoading ? 'Starting...' : 'Start Building'}
      </Button>
    </div>
  )
}
