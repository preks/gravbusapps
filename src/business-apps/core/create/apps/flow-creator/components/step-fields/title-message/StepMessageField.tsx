import React from 'react'
import { Label } from '@newwork/nw-design-system'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextExpressionEditor } from '../../shared/FlowContextExpressionEditor'
import type { FlowContextBrowserDialogProps } from '../../shared/FlowContextBrowserDialog'

interface StepMessageFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  suggestions: ExpressionSuggestionItem[]
  dataSources: FlowContextBrowserDialogProps['dataSources']
  'data-testid': string
}

export const StepMessageField: React.FC<StepMessageFieldProps> = ({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  dataSources,
  'data-testid': testId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5">
      <Label className="gba:text-xs gba:font-medium gba:text-foreground">{label}</Label>
      <FlowContextExpressionEditor
        value={value}
        onChange={onChange}
        suggestions={suggestions}
        dataSources={dataSources}
        placeholder={placeholder}
        multiline
        data-testid={testId}
      />
    </div>
  )
}
