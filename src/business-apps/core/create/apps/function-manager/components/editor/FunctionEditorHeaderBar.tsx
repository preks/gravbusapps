import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeft, Bot } from 'lucide-react'

export interface FunctionEditorHeaderBarProps {
  mode: 'create' | 'edit'
  isSaving: boolean
  isValid: boolean
  assistantOpen: boolean
  onAssistantOpen: () => void
  onSave: () => void
  onBack?: () => void
  'data-testid'?: string
}

export const FunctionEditorHeaderBar: React.FC<FunctionEditorHeaderBarProps> = ({
  mode,
  isSaving,
  isValid,
  assistantOpen,
  onAssistantOpen,
  onSave,
  onBack,
  'data-testid': testId = 'function-editor-header-bar'
}) => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack} data-testid={`${testId}-back`}>
            <ArrowLeft className="gba:h-4 gba:w-4 gba:mr-2" />
            Back
          </Button>
        ) : null}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {!assistantOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={onAssistantOpen}
            disabled={isSaving}
            data-testid={`${testId}-assistant-open`}
          >
            <Bot className="gba:h-4 gba:w-4 gba:mr-2" />
            AI Assistant
          </Button>
        ) : null}
        <Button variant="default" onClick={onSave} disabled={!isValid || isSaving} data-testid={`${testId}-save`}>
          {isSaving ? 'Saving…' : mode === 'create' ? 'Create' : 'Create New Version'}
        </Button>
      </div>
    </div>
  )
}

export default FunctionEditorHeaderBar
