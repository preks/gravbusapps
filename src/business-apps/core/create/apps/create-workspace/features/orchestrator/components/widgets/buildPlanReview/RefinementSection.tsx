/**
 * RefinementSection - UI for refining build plans with feedback
 */

import React from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'

interface RefinementSectionProps {
  feedback: string
  onFeedbackChange: (feedback: string) => void
  onRefine: () => void
  onClear: () => void
  isRefining: boolean
  isLoading: boolean
  refinementSummary?: string | null
  refineError?: string | null
}

export const RefinementSection: React.FC<RefinementSectionProps> = ({
  feedback,
  onFeedbackChange,
  onRefine,
  onClear,
  isRefining,
  isLoading,
  refinementSummary,
  refineError
}) => {
  return (
    <div className="gba:space-y-2.5 gba:pt-3 gba:border-t gba:border-border">
      <div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
          <Sparkles className="gba:w-4 gba:h-4" />
          Refine Your Plan
        </h3>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
          Describe any changes you'd like in plain English
        </p>
      </div>

      {refinementSummary && !refineError && (
        <div className="gba:bg-success-secondary gba:border gba:border-success-secondary gba:rounded-lg gba:p-2.5">
          <p className="gba:text-sm gba:text-success-secondary-foreground">
            <span className="gba:font-medium">Changes applied:</span> {refinementSummary}
          </p>
        </div>
      )}

      <div className="gba:space-y-2">
        <Textarea
          value={feedback}
          onChange={e => onFeedbackChange(e.target.value)}
          placeholder='e.g., "Add export to PDF" or "Remove the status filter"'
          disabled={isRefining || isLoading}
          rows={3}
          maxLength={2000}
          className="gba:resize-none gba:text-sm"
        />
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs gba:text-muted-foreground">{feedback.length}/2000 characters</span>
          <div className="gba:flex gba:gap-2">
            <Button variant="ghost" size="sm" onClick={onClear} disabled={!feedback || isRefining || isLoading}>
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefine}
              disabled={feedback.trim().length < 3 || isRefining || isLoading}
            >
              {isRefining ? 'Refining...' : 'Refine Plan'}
            </Button>
          </div>
        </div>
      </div>

      {refineError && (
        <div className="gba:bg-destructive/10 gba:border gba:border-destructive/20 gba:rounded-lg gba:p-2.5">
          <p className="gba:text-sm gba:text-destructive gba:whitespace-pre-line">{refineError}</p>
        </div>
      )}
    </div>
  )
}
