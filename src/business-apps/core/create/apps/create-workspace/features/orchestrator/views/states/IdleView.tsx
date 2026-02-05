/**
 * IdleView - Initial prompt input state
 */

import React from 'react'
import { Button, Card, CardContent, cn } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'

export interface IdleViewProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  onAnalyze: () => void
  'data-testid'?: string
}

export const IdleView: React.FC<IdleViewProps> = ({ prompt, onPromptChange, onAnalyze, 'data-testid': testId }) => {
  return (
    <Card className="gba:border-dashed">
      <CardContent className="gba:p-8">
        <div className="gba:space-y-4">
          <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
            What do you want to build?
          </label>
          <textarea
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            placeholder="Describe what you need... For example: 'Create a lead management system with a capture form, AI qualification assistant, and approval workflow'"
            className={cn(
              'gba:w-full gba:min-h-[150px] gba:p-4 gba:rounded-lg',
              'gba:border gba:border-input gba:bg-background',
              'gba:text-foreground gba:placeholder-muted-foreground',
              'gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring',
              'gba:resize-none'
            )}
            data-testid={testId}
          />
          <div className="gba:flex gba:justify-end">
            <Button onClick={onAnalyze} disabled={!prompt.trim()} className="gba:min-w-[150px]">
              <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
              Analyze & Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
