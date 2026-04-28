import React from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { FlowStudioData } from '../../../../hooks/useFlowStudioData'
import { EventHandlerType, type TaskExpertHandlerConfig } from '@/common/data/flow/types/flowTemplate'

interface AgentHandlerSectionProps {
  handler: TaskExpertHandlerConfig
  studioData: FlowStudioData
  onChange: (next: TaskExpertHandlerConfig) => void
  testId: string
  subscriptionId: string
}

export const AgentHandlerSection: React.FC<AgentHandlerSectionProps> = ({
  handler,
  studioData,
  onChange,
  testId,
  subscriptionId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">AI agent</Label>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Agent</Label>
        <Select
          value={handler.promptId || ''}
          onValueChange={value =>
            onChange({
              ...handler,
              type: EventHandlerType.TASK_EXPERT,
              promptId: value
            })
          }
        >
          <SelectTrigger data-testid={`${testId}-events-agent-${subscriptionId}`}>
            <SelectValue placeholder={studioData.agentsLoading ? 'Loading…' : 'Select agent'} />
          </SelectTrigger>
          <SelectContent>
            {studioData.agents.length === 0 ? (
              <SelectItem value="__none__" disabled>
                {studioData.agentsLoading ? 'Loading…' : 'No agents found'}
              </SelectItem>
            ) : (
              studioData.agents.map(agent => (
                <SelectItem key={String(agent._id)} value={String(agent._id)}>
                  {agent.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
