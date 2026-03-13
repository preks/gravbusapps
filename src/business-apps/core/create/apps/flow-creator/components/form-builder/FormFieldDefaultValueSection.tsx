import React from 'react'
import { Label, Switch } from '@newwork/nw-design-system'
import type { InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
import { useStudioExpressionSuggestions } from '../../hooks/useStudioExpressionSuggestions'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../utils/neutralSwitchClassName'
import { FlowContextExpressionEditor } from '../shared/FlowContextExpressionEditor'

interface FormFieldDefaultValueSectionProps {
  mode: DesignerMode
  field: InputBlock
  onChange: (partial: Partial<InputBlock>) => void
  index: number
  dataSources?: React.ComponentProps<typeof FlowContextExpressionEditor>['dataSources']
  testId: string
}

export const FormFieldDefaultValueSection: React.FC<FormFieldDefaultValueSectionProps> = ({
  mode,
  field,
  onChange,
  index,
  dataSources,
  testId
}) => {
  const enabled = field.value !== undefined
  const suggestions = useStudioExpressionSuggestions()

  // Default value configuration is an advanced feature.
  if (mode !== 'advanced') return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Default value</Label>
        <Switch
          checked={enabled}
          onCheckedChange={checked => {
            onChange({ value: checked ? (field.value ?? '') : undefined })
          }}
          className={NEUTRAL_SWITCH_CLASSNAME}
          data-testid={`${testId}-${index}-default-toggle`}
        />
      </div>

      {enabled && (
        <FlowContextExpressionEditor
          value={field.value ?? ''}
          onChange={value => onChange({ value })}
          suggestions={suggestions}
          dataSources={dataSources}
          placeholder="Type {{ to insert flow context…"
          allowFreeText
          singleLine
          data-testid={`${testId}-${index}-default`}
        />
      )}
    </div>
  )
}
