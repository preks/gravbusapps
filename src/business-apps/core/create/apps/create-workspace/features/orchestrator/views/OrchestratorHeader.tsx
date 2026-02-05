/**
 * OrchestratorHeader - Header component with title and actions
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Sparkles, ArrowLeft, RotateCcw } from 'lucide-react'
import type { OrchestratorViewState } from '../types'

export interface OrchestratorHeaderProps {
  viewState: OrchestratorViewState
  onBack?: () => void
  onReset: () => void
}

export const OrchestratorHeader: React.FC<OrchestratorHeaderProps> = ({ viewState, onBack, onReset }) => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:mb-8">
      <div className="gba:flex gba:items-center gba:gap-3">
        {onBack && viewState === 'idle' && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-1" />
            Back
          </Button>
        )}
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-foreground gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-6 gba:h-6 gba:text-info" />
            AI Orchestrator
          </h1>
          <p className="gba:text-muted-foreground">Describe what you want to build and let AI create it for you</p>
        </div>
      </div>

      {viewState !== 'idle' && viewState !== 'analyzing' && (
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="gba:w-4 gba:h-4 gba:mr-2" />
          Start Over
        </Button>
      )}
    </div>
  )
}
