import React, { useRef, useState } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { FolderTree, Network } from 'lucide-react'
import {
  ExpressionEditor,
  type ExpressionEditorHandle,
  type ExpressionEditorProps,
  type ExpressionSuggestionItem
} from '@/common/components/flow/expression-editor'
import { FlowContextExplorer } from './FlowContextExplorer'
import { FlowContextBrowserDialog, type FlowContextBrowserDialogProps } from './FlowContextBrowserDialog'

type FlowContextExpressionEditorProps = Omit<ExpressionEditorProps, 'flowContextExplorer'> & {
  suggestions?: ExpressionSuggestionItem[]
  showFlowContext?: boolean
  dataSources?: FlowContextBrowserDialogProps['dataSources']
}

export const FlowContextExpressionEditor: React.FC<FlowContextExpressionEditorProps> = ({
  suggestions = [],
  showFlowContext = true,
  dataSources,
  disabled,
  'data-testid': testId = 'flow-context-expression-editor',
  ...props
}) => {
  const editorRef = useRef<ExpressionEditorHandle>(null)
  const [open, setOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)

  const enabled = showFlowContext && suggestions.length > 0

  const trigger = enabled ? (
    <React.Fragment>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={Boolean(disabled)}
            aria-label="Flow context"
            title="Flow context"
            data-testid={`${testId}-flow-context-trigger`}
          >
            <Network className="gba:h-4 gba:w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-96 gba:p-0" align="end" data-testid={`${testId}-flow-context-popover`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-2 gba:border-b gba:border-border">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">Flow context</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                setBrowseOpen(true)
              }}
              disabled={Boolean(disabled)}
              data-testid={`${testId}-flow-context-browse`}
            >
              <FolderTree className="gba:h-4 gba:w-4 gba:mr-2" />
              Browse
            </Button>
          </div>
          <FlowContextExplorer
            items={suggestions}
            onSelect={item => {
              editorRef.current?.insertSuggestion(item)
              setOpen(false)
            }}
            data-testid={`${testId}-flow-context`}
          />
        </PopoverContent>
      </Popover>

      <FlowContextBrowserDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        items={suggestions}
        dataSources={dataSources}
        onSelect={item => {
          editorRef.current?.insertSuggestion(item)
          setBrowseOpen(false)
        }}
        data-testid={`${testId}-flow-context-browser`}
      />
    </React.Fragment>
  ) : null

  return (
    <ExpressionEditor
      ref={editorRef}
      suggestions={suggestions}
      flowContextExplorer={trigger}
      disabled={disabled}
      data-testid={testId}
      {...props}
    />
  )
}
