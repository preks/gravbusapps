/**
 * EndConfigPanel - Summary fields configuration for the end node.
 */

import React, { useCallback } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator
} from '@newwork/nw-design-system'
import { Flag, Plus, Trash2 } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { useStudioExpressionSuggestions } from '../../hooks/useStudioExpressionSuggestions'
import type { EndNodeConfig, DesignerMode } from '../../types/studioTypes'
import { SummaryFieldVisibility, type SummaryField } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { ExpressionEditor } from '@/common/components/flow/expression-editor'

interface EndConfigPanelProps {
  nodeId: string
  config: EndNodeConfig
  mode: DesignerMode
  'data-testid'?: string
}

export const EndConfigPanel: React.FC<EndConfigPanelProps> = ({
  nodeId,
  config,
  mode,
  'data-testid': testId = 'flow-studio-end-config'
}) => {
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const suggestions = useStudioExpressionSuggestions()

  const fields = config.summaryFields ?? []

  const addField = useCallback(() => {
    const newField: SummaryField = {
      id: uuid(),
      label: '',
      value: '',
      visibility: SummaryFieldVisibility.PUBLIC
    }
    updateNodeConfig(nodeId, {
      summaryFields: [...fields, newField]
    })
  }, [nodeId, fields, updateNodeConfig])

  const updateField = useCallback(
    (index: number, partial: Partial<SummaryField>) => {
      const updated = [...fields]
      updated[index] = { ...updated[index], ...partial }
      updateNodeConfig(nodeId, { summaryFields: updated })
    },
    [nodeId, fields, updateNodeConfig]
  )

  const removeField = useCallback(
    (index: number) => {
      const updated = fields.filter((_, i) => i !== index)
      updateNodeConfig(nodeId, { summaryFields: updated })
    },
    [nodeId, fields, updateNodeConfig]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-success-secondary">
          <Flag className="gba:h-4 gba:w-4 gba:text-success-secondary-foreground" />
        </div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">End / Summary</h3>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:py-4 gba:pb-5">
          <p className="gba:text-xs gba:text-muted-foreground">
            Configure the fields shown in the flow summary when the workflow completes.
          </p>

          <Separator />

          {fields.map((field, index) => (
            <div
              key={field.id ?? index}
              className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted"
              data-testid={`${testId}-field-${index}`}
            >
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Field {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(index)}
                  data-testid={`${testId}-field-remove-${index}`}
                >
                  <Trash2 className="gba:h-3 gba:w-3" />
                </Button>
              </div>

              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs">Label</Label>
                <Input
                  value={field.label}
                  onChange={e => updateField(index, { label: e.target.value })}
                  placeholder="Field label"
                  data-testid={`${testId}-field-label-${index}`}
                />
              </div>

              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs">Value Expression</Label>
                <ExpressionEditor
                  value={field.value}
                  onChange={v => updateField(index, { value: v })}
                  suggestions={suggestions}
                  placeholder="Type {{ to pick an expression..."
                  allowFreeText={mode === 'advanced'}
                  data-testid={`${testId}-field-value-${index}`}
                />
              </div>

              {mode === 'advanced' && (
                <div className="gba:flex gba:flex-col gba:gap-1.5">
                  <Label className="gba:text-xs">Visibility</Label>
                  <Select
                    value={field.visibility}
                    onValueChange={v => updateField(index, { visibility: v as SummaryFieldVisibility })}
                  >
                    <SelectTrigger data-testid={`${testId}-field-visibility-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SummaryFieldVisibility.PUBLIC}>Public</SelectItem>
                      <SelectItem value={SummaryFieldVisibility.WORKFLOW_PARTICIPANTS}>
                        Workflow Participants
                      </SelectItem>
                      <SelectItem value={SummaryFieldVisibility.STEP_PARTICIPANTS}>Step Participants</SelectItem>
                      <SelectItem value={SummaryFieldVisibility.INITIATOR_ONLY}>Initiator Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addField} data-testid={`${testId}-add-field`}>
            <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
            Add summary field
          </Button>
        </div>
      </div>
    </div>
  )
}
