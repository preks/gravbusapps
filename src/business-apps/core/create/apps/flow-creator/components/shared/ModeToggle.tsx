/**
 * ModeToggle - Simple/Advanced mode switch for the Flow Studio.
 * Simple mode hides advanced features for business users.
 */

import React from 'react'
import { Sparkles, Settings2 } from 'lucide-react'
import type { DesignerMode } from '../../types/studioTypes'

interface ModeToggleProps {
  mode: DesignerMode
  onChange: (mode: DesignerMode) => void
  'data-testid'?: string
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onChange,
  'data-testid': testId = 'flow-studio-mode-toggle'
}) => {
  return (
    <div
      className="gba:flex gba:items-center gba:rounded-lg gba:border gba:border-border gba:bg-muted/50 gba:p-0.5"
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => onChange('simple')}
        data-testid={`${testId}-simple`}
        className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-all ${
          mode === 'simple'
            ? 'gba:bg-card gba:text-foreground gba:shadow-sm'
            : 'gba:text-muted-foreground gba:hover:text-foreground'
        }`}
      >
        <Sparkles className="gba:h-3.5 gba:w-3.5" />
        Simple
      </button>
      <button
        type="button"
        onClick={() => onChange('advanced')}
        data-testid={`${testId}-advanced`}
        className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-all ${
          mode === 'advanced'
            ? 'gba:bg-card gba:text-foreground gba:shadow-sm'
            : 'gba:text-muted-foreground gba:hover:text-foreground'
        }`}
      >
        <Settings2 className="gba:h-3.5 gba:w-3.5" />
        Advanced
      </button>
    </div>
  )
}
