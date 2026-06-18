/**
 * ModeToggle - Simple/Advanced mode switch for the Flow Studio.
 * Simple mode hides advanced features for business users.
 */

import React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system'
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
    <Tabs
      value={mode}
      onValueChange={next => onChange(next === 'advanced' ? 'advanced' : 'simple')}
      data-testid={testId}
    >
      <TabsList className="gba:h-auto gba:p-0.5">
        <TabsTrigger
          value="simple"
          startIcon={<Sparkles className="gba:h-3.5 gba:w-3.5" />}
          className="gba:px-3 gba:py-1.5 gba:text-sm"
          data-testid={`${testId}-simple`}
        >
          Simple
        </TabsTrigger>
        <TabsTrigger
          value="advanced"
          startIcon={<Settings2 className="gba:h-3.5 gba:w-3.5" />}
          className="gba:px-3 gba:py-1.5 gba:text-sm"
          data-testid={`${testId}-advanced`}
        >
          Advanced
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
