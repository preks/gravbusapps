import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupMentionInput,
  InputGroupMentionTextarea,
  InputGroupText,
  Popover,
  PopoverContent,
  PopoverTrigger,
  getMentionChipLabel,
  serializeMentionToken
} from '@newwork/nw-design-system'
import { AtIcon, TreeStructureIcon } from '@phosphor-icons/react'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextExplorer } from './FlowContextExplorer'
import { FlowContextBrowserDialog, type FlowContextBrowserDialogProps } from './FlowContextBrowserDialog'
import {
  FLOW_EXPRESSION_MENTION_CONFIG,
  mapExpressionSuggestionToMentionOption,
  mapExpressionSuggestionsToMentionOptions
} from './mapExpressionSuggestionsToMentionOptions'

export interface FlowContextExpressionEditorProps {
  value: string
  onChange: (value: string) => void
  suggestions?: ExpressionSuggestionItem[]
  placeholder?: string
  multiline?: boolean
  disabled?: boolean
  className?: string
  showFlowContext?: boolean
  dataSources?: FlowContextBrowserDialogProps['dataSources']
  'data-testid'?: string
}

type FlowContextPopoverProps = {
  disabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestions: ExpressionSuggestionItem[]
  testId: string
  onSelect: (item: ExpressionSuggestionItem) => void
  onBrowse: () => void
  buttonClassName?: string
}

const FlowContextPopover: React.FC<FlowContextPopoverProps> = ({
  disabled,
  open,
  onOpenChange,
  suggestions,
  testId,
  onSelect,
  onBrowse,
  buttonClassName
}) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <InputGroupButton
        type="button"
        variant="ghost"
        size="iconXs"
        disabled={disabled}
        aria-label="Flow context"
        title="Flow context"
        className={buttonClassName}
        data-testid={`${testId}-flow-context-trigger`}
      >
        <AtIcon />
      </InputGroupButton>
    </PopoverTrigger>
    <PopoverContent className="gba:w-96 gba:p-0" align="end" data-testid={`${testId}-flow-context-popover`}>
      <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-2 gba:border-b gba:border-border">
        <span className="gba:text-xs gba:font-medium gba:text-foreground">Flow context</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBrowse}
          disabled={disabled}
          data-testid={`${testId}-flow-context-browse`}
        >
          <TreeStructureIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          Browse
        </Button>
      </div>
      <FlowContextExplorer
        items={suggestions}
        onSelect={item => {
          onSelect(item)
          onOpenChange(false)
        }}
        data-testid={`${testId}-flow-context`}
      />
    </PopoverContent>
  </Popover>
)

export const FlowContextExpressionEditor: React.FC<FlowContextExpressionEditorProps> = ({
  value,
  onChange,
  suggestions = [],
  placeholder,
  disabled,
  multiline = false,
  className,
  showFlowContext = true,
  dataSources,
  'data-testid': testId = 'flow-context-expression-editor'
}) => {
  const [open, setOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)

  const enabled = showFlowContext && suggestions.length > 0
  const isDisabled = Boolean(disabled)
  const addonAlign = multiline ? 'block-end' : 'inline-end'
  const mentions = useMemo(() => mapExpressionSuggestionsToMentionOptions(suggestions), [suggestions])

  const appendExpressionMention = useCallback(
    (item: ExpressionSuggestionItem) => {
      const option = mapExpressionSuggestionToMentionOption(item)
      const token = serializeMentionToken(FLOW_EXPRESSION_MENTION_CONFIG.markup, option.id, getMentionChipLabel(option))
      const spacer = FLOW_EXPRESSION_MENTION_CONFIG.appendSpaceOnAdd ? ' ' : ''
      onChange(`${value}${token}${spacer}`)
    },
    [onChange, value]
  )

  const mentionEditorProps = {
    value,
    onChange,
    mentions,
    mention: FLOW_EXPRESSION_MENTION_CONFIG,
    placeholder,
    disabled,
    className,
    'data-testid': testId
  }

  const flowContextPopover = enabled ? (
    <FlowContextPopover
      disabled={isDisabled}
      open={open}
      onOpenChange={setOpen}
      suggestions={suggestions}
      testId={testId}
      onSelect={appendExpressionMention}
      onBrowse={() => {
        setOpen(false)
        setBrowseOpen(true)
      }}
      buttonClassName={multiline ? 'gba:ml-auto gba:mr-[-0.4rem]' : undefined}
    />
  ) : null

  return (
    <>
      <InputGroup
        disabled={isDisabled}
        className={multiline ? 'gba:h-auto' : undefined}
        data-testid={`${testId}-input-group`}
      >
        {multiline ? (
          <InputGroupMentionTextarea {...mentionEditorProps} />
        ) : (
          <InputGroupMentionInput {...mentionEditorProps} />
        )}
        {flowContextPopover ? (
          <InputGroupAddon align={addonAlign} className={multiline ? 'gba:border-t gba:cursor-default' : undefined}>
            {multiline ? <InputGroupText className="gba:text-xs">{value.length} characters</InputGroupText> : null}
            {flowContextPopover}
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {enabled ? (
        <FlowContextBrowserDialog
          open={browseOpen}
          onOpenChange={setBrowseOpen}
          items={suggestions}
          dataSources={dataSources}
          onSelect={item => {
            appendExpressionMention(item)
            setBrowseOpen(false)
          }}
          data-testid={`${testId}-flow-context-browser`}
        />
      ) : null}
    </>
  )
}
