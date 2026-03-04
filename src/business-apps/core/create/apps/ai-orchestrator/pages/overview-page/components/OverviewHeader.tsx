/**
 * Header component for Overview page
 * Displays hero section with title, description, and action buttons
 */

import React from 'react'
import { Sparkles, Plus, CheckSquare, X } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

export interface OverviewHeaderProps {
  onNewPlan: () => void
  hasPlans: boolean
  isSelectMode: boolean
  toggleSelectMode: () => void
  isDeleting: boolean
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  onNewPlan,
  hasPlans,
  isSelectMode,
  toggleSelectMode,
  isDeleting
}) => {
  return (
    <div className="gba:text-center gba:space-y-4">
      <div className="gba:inline-flex gba:p-4 gba:rounded-2xl gba:bg-primary/10">
        <Sparkles className="gba:w-12 gba:h-12 gba:text-primary" />
      </div>
      <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">AI Orchestrator</h1>
      <p className="gba:text-muted-foreground">
        Create build plans and generate screens, flows, and data models from a single prompt.
      </p>
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
        <Button size="lg" onClick={onNewPlan} className="gba:gap-2" data-testid="ai-orchestrator-new-plan">
          <Plus className="gba:w-4 gba:h-4" />
          New plan
        </Button>
        {hasPlans && (
          <Button
            size="lg"
            variant={isSelectMode ? 'default' : 'outline'}
            onClick={toggleSelectMode}
            className="gba:gap-2"
            disabled={isDeleting}
          >
            {isSelectMode ? (
              <>
                <X className="gba:w-4 gba:h-4" />
                Cancel
              </>
            ) : (
              <>
                <CheckSquare className="gba:w-4 gba:h-4" />
                Select
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
