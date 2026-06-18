import React from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { EventHandlerType, type FunctionHandlerConfig } from '@/common/data/flow/types/flowTemplate'

interface FunctionHandlerSectionProps {
  handler: FunctionHandlerConfig
  studioData: FlowStudioData
  onChange: (next: FunctionHandlerConfig) => void
  testId: string
  subscriptionId: string
}

export const FunctionHandlerSection: React.FC<FunctionHandlerSectionProps> = ({
  handler,
  studioData,
  onChange,
  testId,
  subscriptionId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Function</Label>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Function</Label>
        <Select
          value={handler.functionId || ''}
          onValueChange={value =>
            onChange({
              ...handler,
              type: EventHandlerType.FUNCTION,
              functionId: value
            })
          }
        >
          <SelectTrigger data-testid={`${testId}-events-function-${subscriptionId}`}>
            <SelectValue placeholder={studioData.functionsLoading ? 'Loading…' : 'Select function'} />
          </SelectTrigger>
          <SelectContent>
            {studioData.functions.length === 0 ? (
              <SelectItem value="__none__" disabled>
                {(() => {
                  if (studioData.functionsLoading) return 'Loading…'
                  if (studioData.functionsError) return 'Failed to load functions'
                  return 'No functions found'
                })()}
              </SelectItem>
            ) : (
              studioData.functions.map(fn => (
                <SelectItem key={String(fn.id)} value={String(fn.id)}>
                  {fn.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
