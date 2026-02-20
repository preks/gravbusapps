import React from 'react'
import { Sparkles } from 'lucide-react'
import type { DesignerMode } from '../../../types/studioTypes'

interface DecisionAIBannerProps {
  mode: DesignerMode
  'data-testid'?: string
}

export const DecisionAIBanner: React.FC<DecisionAIBannerProps> = ({
  mode,
  'data-testid': testId = 'flow-studio-decision-ai-banner'
}) => {
  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border gba:bg-muted gba:p-4 gba:overflow-hidden"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-background">
          <Sparkles className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
        </div>
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">AI Decision</span>
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">
            {mode === 'simple'
              ? 'Link a policy and let the AI evaluate outcomes with high confidence.'
              : 'Connect policies, prompts, and escalation to build traceable AI-driven branching.'}
          </div>
        </div>
      </div>
    </div>
  )
}
