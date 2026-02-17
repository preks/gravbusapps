import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@newwork/nw-design-system'
import { Bot, GitBranch } from 'lucide-react'

export interface BasicInformationCardProps {
  mode: 'create' | 'edit'
  name: string
  description: string
  agentEnabled: boolean
  workflowEnabled: boolean
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onAgentEnabledChange: (v: boolean) => void
  onWorkflowEnabledChange: (v: boolean) => void
  'data-testid'?: string
}

export const BasicInformationCard: React.FC<BasicInformationCardProps> = ({
  mode,
  name,
  description,
  agentEnabled,
  workflowEnabled,
  onNameChange,
  onDescriptionChange,
  onAgentEnabledChange,
  onWorkflowEnabledChange,
  'data-testid': testId = 'function-editor-basic-info'
}) => {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-name`}>Name *</Label>
          <Input
            id={`${testId}-name`}
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder="function-name"
            disabled={mode === 'edit'}
            data-testid={`${testId}-name-input`}
          />
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-description`}>Description</Label>
          <Textarea
            id={`${testId}-description`}
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="Function description"
            rows={3}
            data-testid={`${testId}-description-input`}
          />
        </div>

        <div className="gba:space-y-2">
          <Label>Integration Options</Label>
          <div className="gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row">
            <Button
              type="button"
              variant={agentEnabled ? 'default' : 'outline'}
              size="lg"
              onClick={() => onAgentEnabledChange(!agentEnabled)}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`${testId}-agent-enabled`}
            >
              <Bot className="gba:w-5 gba:h-5" />
              <span className="gba:font-medium">Agent Enabled</span>
            </Button>

            <Button
              type="button"
              variant={workflowEnabled ? 'default' : 'outline'}
              size="lg"
              onClick={() => onWorkflowEnabledChange(!workflowEnabled)}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`${testId}-workflow-enabled`}
            >
              <GitBranch className="gba:w-5 gba:h-5" />
              <span className="gba:font-medium">Workflow Enabled</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BasicInformationCard
