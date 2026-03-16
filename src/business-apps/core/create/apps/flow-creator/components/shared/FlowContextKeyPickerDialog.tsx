import React from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextExplorer } from './FlowContextExplorer'

interface FlowContextKeyPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ExpressionSuggestionItem[]
  onSelect: (item: ExpressionSuggestionItem) => void
  title?: string
  description?: string
  'data-testid'?: string
}

export const FlowContextKeyPickerDialog: React.FC<FlowContextKeyPickerDialogProps> = ({
  open,
  onOpenChange,
  items,
  onSelect,
  title = 'Choose key expression',
  description = 'Pick a flow-context value used as the lookup key.',
  'data-testid': testId = 'flow-context-key-picker'
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:text-sm">{title}</DialogTitle>
          <DialogDescription className="gba:text-xs">{description}</DialogDescription>
        </DialogHeader>

        <div className="gba:flex gba:flex-col gba:gap-3">
          <FlowContextExplorer
            items={items}
            onSelect={item => onSelect(item)}
            placeholder="Search flow context…"
            data-testid={`${testId}-explorer`}
          />

          <div className="gba:flex gba:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid={`${testId}-cancel`}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
