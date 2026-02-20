import React from 'react'
import { Label, Switch } from '@newwork/nw-design-system'
import type { InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
import { ExpressionEditor } from '@/common/components/flow/expression-editor'
import { useStudioExpressionSuggestions } from '../../hooks/useStudioExpressionSuggestions'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../utils/neutralSwitchClassName'

interface FormFieldDefaultValueSectionProps {
  mode: DesignerMode
  field: InputBlock
  onChange: (partial: Partial<InputBlock>) => void
  index: number
  testId: string
}

export const FormFieldDefaultValueSection: React.FC<FormFieldDefaultValueSectionProps> = ({
  mode,
  field,
  onChange,
  index,
  testId
}) => {
  // Keep existing behavior: default value configuration is an advanced feature,
  // but make it explicit via a toggle.
  if (mode !== 'advanced') return null

  const enabled = field.value !== undefined
  const suggestions = useStudioExpressionSuggestions()

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
        <ExpressionEditor
          value={field.value ?? ''}
          onChange={value => onChange({ value })}
          suggestions={suggestions}
          placeholder="Type {{ to pick an expression..."
          allowFreeText
          singleLine
          data-testid={`${testId}-${index}-default`}
        />
      )}
    </div>
  )
}
