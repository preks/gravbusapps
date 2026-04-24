import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { Bot, GitBranch, Plug } from 'lucide-react'
import { FUNCTION_CATEGORIES, type FunctionCategory } from '@/common/network/functions/FunctionsServiceClient'
import { getSubcategorySuggestions } from '../../config/categorySuggestions'

export interface BasicInformationCardProps {
  mode: 'create' | 'edit'
  name: string
  description: string
  category: FunctionCategory
  subcategory: string
  agentEnabled: boolean
  workflowEnabled: boolean
  connectorEnabled: boolean
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onCategoryChange: (v: FunctionCategory) => void
  onSubcategoryChange: (v: string) => void
  onAgentEnabledChange: (v: boolean) => void
  onWorkflowEnabledChange: (v: boolean) => void
  onConnectorEnabledChange: (v: boolean) => void
  'data-testid'?: string
}

export const BasicInformationCard: React.FC<BasicInformationCardProps> = ({
  mode,
  name,
  description,
  category,
  subcategory,
  agentEnabled,
  workflowEnabled,
  connectorEnabled,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onSubcategoryChange,
  onAgentEnabledChange,
  onWorkflowEnabledChange,
  onConnectorEnabledChange,
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

        <div className="gba:grid gba:gap-4 gba:sm:grid-cols-2">
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-category`}>Category *</Label>
            <Select value={category} onValueChange={v => onCategoryChange(v as FunctionCategory)}>
              <SelectTrigger id={`${testId}-category`} data-testid={`${testId}-category-input`}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {FUNCTION_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} data-testid={`${testId}-category-option-${c}`}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-subcategory`}>Subcategory</Label>
            <Input
              id={`${testId}-subcategory`}
              value={subcategory}
              onChange={e => onSubcategoryChange(e.target.value)}
              placeholder="e.g. employees, time-off"
              list={`${testId}-subcategory-suggestions`}
              data-testid={`${testId}-subcategory-input`}
            />
            <datalist id={`${testId}-subcategory-suggestions`}>
              {getSubcategorySuggestions(category).map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
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

            <Button
              type="button"
              variant={connectorEnabled ? 'default' : 'outline'}
              size="lg"
              onClick={() => onConnectorEnabledChange(!connectorEnabled)}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`${testId}-connector-enabled`}
            >
              <Plug className="gba:w-5 gba:h-5" />
              <span className="gba:font-medium">Board Connector</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BasicInformationCard
