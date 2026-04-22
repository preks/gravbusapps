import React from 'react'
import { Label } from '@newwork/nw-design-system'

export interface DebugStep {
  order: number
  method: string
  endpoint: string
  payload: unknown
  note?: string
}

export interface DebugSectionProps {
  steps: DebugStep[]
  'data-testid'?: string
}

export const DebugSection: React.FC<DebugSectionProps> = ({ steps, 'data-testid': dataTestId = 'debug-section' }) => {
  const sorted = [...steps].sort((a, b) => a.order - b.order)

  return (
    <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-border gba:space-y-2" data-testid={dataTestId}>
      <Label className="gba:text-muted-foreground gba:font-medium">Debug: API calls (order and payloads)</Label>
      <div className="gba:space-y-2 gba:rounded gba:bg-muted/30 gba:p-3 gba:font-mono gba:text-xs">
        {sorted.length === 0 ? (
          <p className="gba:text-muted-foreground">No calls yet. Fill the form to see planned endpoints.</p>
        ) : (
          sorted.map((step, index) => (
            <div
              key={`${step.order}-${index}`}
              className="gba:border-b gba:border-border/50 gba:pb-2 gba:last:border-0 gba:last:pb-0"
            >
              <div className="gba:font-semibold gba:text-foreground">
                {step.order}. {step.method} {step.endpoint}
              </div>
              {step.note && <div className="gba:text-amber-600 gba:mt-0.5">{step.note}</div>}
              <pre className="gba:mt-1 gba:overflow-x-auto gba:whitespace-pre-wrap gba:break-words gba:text-muted-foreground">
                {JSON.stringify(step.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
