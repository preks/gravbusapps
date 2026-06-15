// Renders the captured result/output of a single flow step as a clean
// label/value list ("Captured data"), matching the platform Flow Detail task
// cards. Uses `StepResultData` which recursively formats nested objects/arrays
// (e.g. a FUNCTION step's `Response`) instead of dumping raw JSON, while reusing
// the platform leaf renderer for files and markdown. Shared by the workforce
// list view (row expansion) and map view (node detail panel).

import { Spinner } from '@newwork/nw-design-system'
import React from 'react'

import { formatTimestamp } from '../runDisplay'
import { StepResultData } from './StepResultData'
import type { FlowStepResultState } from './useFlowStepResult'

export interface FlowStepResultProps extends FlowStepResultState {
  accessToken?: string
  emptyLabel?: string
}

export const FlowStepResult: React.FC<FlowStepResultProps> = ({
  data,
  isLoading,
  error,
  accessToken,
  emptyLabel = 'No results captured for this step yet.'
}) => {
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:gap-2 gba:py-4 gba:text-xs gba:text-muted-foreground"
        data-testid="flow-step-result-loading"
      >
        <Spinner className="gba:h-4 gba:w-4" />
        Loading results…
      </div>
    )
  }

  if (error) {
    return (
      <p className="gba:py-3 gba:text-xs gba:text-destructive" data-testid="flow-step-result-error">
        {error}
      </p>
    )
  }

  const rows = data?.data ?? []
  if (rows.length === 0) {
    return (
      <p
        className="gba:rounded-md gba:border gba:border-dashed gba:border-border/60 gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-xs gba:text-muted-foreground"
        data-testid="flow-step-result-empty"
      >
        {emptyLabel}
      </p>
    )
  }

  const showActor = (userName?: string): boolean => Boolean(userName) && userName !== 'system'

  return (
    <div className="gba:space-y-3" data-testid="flow-step-result">
      <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Captured data</h4>
      {rows.map(row => (
        <div key={`${row.taskId}:${row.userId}`} className="gba:space-y-2">
          {(showActor(row.userName) || row.timestamp) && (
            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
              {showActor(row.userName) && (
                <span className="gba:text-xs gba:font-medium gba:text-foreground">{row.userName}</span>
              )}
              {row.timestamp && (
                <span className="gba:text-[11px] gba:text-muted-foreground">{formatTimestamp(row.timestamp)}</span>
              )}
            </div>
          )}
          <StepResultData formData={row.inputData ?? {}} accessToken={accessToken} />
        </div>
      ))}
    </div>
  )
}
