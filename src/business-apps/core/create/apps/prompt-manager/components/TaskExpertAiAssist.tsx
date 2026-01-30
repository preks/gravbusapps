/**
 * AI Assist component for Task Expert creation
 *
 * Allows users to describe what kind of expert they want in natural language
 * and have AI generate the system prompt, user prompt, response schema, etc.
 */

import React, { useState, useCallback } from 'react'
import {
  AiButton,
  Button,
  Popover,
  PopoverContent,
  PopoverAnchor,
  Spinner,
  Label,
  Badge,
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton
} from '@newwork/nw-design-system'
import {
  SparkleIcon,
  PaperPlaneTiltIcon,
  ArrowLeftIcon,
  CheckIcon,
  XIcon,
  ArrowClockwiseIcon,
  InfoIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskExpertAiGenerate, GeneratedTaskExpert } from '../hooks/useTaskExpertAiGenerate'
import type { AgentType } from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface TaskExpertAiAssistProps extends BusinessAppContextProps {
  agentType: AgentType
  onApply: (result: GeneratedTaskExpert) => void
  'data-testid'?: string
}

type ViewState = 'input' | 'loading' | 'preview'

export const TaskExpertAiAssist: React.FC<TaskExpertAiAssistProps> = ({
  agentType,
  onApply,
  'data-testid': testId = 'task-expert-ai-assist',
  ...context
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ViewState>('input')
  const [prompt, setPrompt] = useState('')
  const { isGenerating, error, result, generate, reset } = useTaskExpertAiGenerate(context)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    setView('loading')
    const generatedResult = await generate(prompt.trim(), agentType)

    if (generatedResult) {
      setView('preview')
    } else {
      setView('input')
    }
  }, [prompt, agentType, generate])

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result)
      handleClose()
    }
  }, [result, onApply])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setView('input')
    setPrompt('')
    reset()
  }, [reset])

  const handleRetry = useCallback(() => {
    setView('input')
    reset()
  }, [reset])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
        e.preventDefault()
        handleGenerate()
      }
    },
    [prompt, handleGenerate]
  )

  const getAgentTypeDescription = (type: AgentType): string => {
    switch (type) {
      case 'flow':
        return 'For process automation and workflows'
      case 'everyai':
        return 'For chat conversations with specialized knowledge'
      case 'general':
        return 'For general-purpose standalone use'
      default:
        return ''
    }
  }

  const renderInputView = () => (
    <div className="gba:flex gba:flex-col" data-testid={`${testId}-input-view`}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:pt-4 gba:pb-3 gba:border-b gba:border-border">
        <SparkleIcon size={20} className="gba:text-primary" />
        <div className="gba:text-sm gba:font-semibold">AI Assist</div>
        <Badge variant="info" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:ml-auto">
          {agentType.toUpperCase()}
        </Badge>
      </div>

      {/* Info Banner */}
      <div className="gba:px-4 gba:pt-3">
        <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-muted gba:border gba:border-border gba:rounded-lg">
          <InfoIcon size={16} className="gba:text-primary gba:flex-shrink-0 gba:mt-0.5" />
          <div className="gba:text-xs gba:text-foreground">
            <strong>Describe what you want</strong> and AI will generate the system prompt, user prompt, response
            schema, and other settings for you.
            <br />
            <span className="gba:text-muted-foreground">{getAgentTypeDescription(agentType)}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="gba:px-4 gba:pt-3">
          <div className="gba:p-3 gba:bg-destructive/10 gba:border gba:border-destructive/20 gba:rounded-lg gba:text-sm gba:text-destructive">
            {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="gba:p-4">
        <InputGroup>
          <InputGroupTextarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={getPlaceholder(agentType)}
            onKeyDown={handleKeyDown}
            data-testid={`${testId}-prompt-input`}
            autoFocus
            rows={5}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="default"
              className="gba:rounded-full"
              size="iconXs"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              data-testid={`${testId}-generate-button`}
              type="button"
            >
              <PaperPlaneTiltIcon size={16} />
              <span className="gba:sr-only">Generate</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Examples */}
      <div className="gba:px-4 gba:pb-4">
        <Label className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:block">Examples:</Label>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {getExamples(agentType).map((example, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(example)}
              className="gba:text-xs gba:px-2 gba:py-1 gba:rounded gba:bg-muted hover:gba:bg-accent gba:transition-colors gba:text-left"
              data-testid={`${testId}-example-${idx}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderLoadingView = () => (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-12"
      data-testid={`${testId}-loading`}
    >
      <Spinner className="gba:w-10 gba:h-10" />
      <div className="gba:mt-4 gba:text-sm gba:font-medium">Generating your expert...</div>
      <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">This may take a few seconds</div>
    </div>
  )

  const renderPreviewView = () => {
    if (!result) return null

    return (
      <div className="gba:flex gba:flex-col" data-testid={`${testId}-preview-view`}>
        {/* Header */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:pt-4 gba:pb-3 gba:border-b gba:border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetry}
            className="gba:h-8 gba:w-8"
            data-testid={`${testId}-back-button`}
          >
            <ArrowLeftIcon size={16} />
          </Button>
          <div className="gba:text-sm gba:font-semibold">Preview Generated Expert</div>
        </div>

        {/* Preview Content */}
        <div className="gba:p-4 gba:max-h-[500px] gba:overflow-y-auto gba:space-y-4">
          {/* Name & Description */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Label className="gba:text-xs gba:text-muted-foreground">Name</Label>
              <Badge variant="secondary" className="gba:text-[10px]">
                {result.name}
              </Badge>
            </div>
            {result.description && <div className="gba:text-sm gba:text-muted-foreground">{result.description}</div>}
          </div>

          {/* System Prompt */}
          <div className="gba:space-y-2">
            <Label className="gba:text-xs gba:text-muted-foreground">System Prompt</Label>
            <div className="gba:text-xs gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:max-h-32 gba:overflow-y-auto gba:whitespace-pre-wrap gba:font-mono">
              {result.systemContent || <span className="gba:text-muted-foreground gba:italic">None</span>}
            </div>
          </div>

          {/* User Prompt */}
          <div className="gba:space-y-2">
            <Label className="gba:text-xs gba:text-muted-foreground">User Prompt Template</Label>
            <div className="gba:text-xs gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:max-h-32 gba:overflow-y-auto gba:whitespace-pre-wrap gba:font-mono">
              {result.userContent || <span className="gba:text-muted-foreground gba:italic">None</span>}
            </div>
          </div>

          {/* Response Schema */}
          {result.responseSchema && (
            <div className="gba:space-y-2">
              <Label className="gba:text-xs gba:text-muted-foreground">Response Schema (JSON)</Label>
              <div className="gba:text-xs gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:max-h-32 gba:overflow-y-auto gba:whitespace-pre-wrap gba:font-mono">
                {result.responseSchema}
              </div>
            </div>
          )}

          {/* Recommended Tools */}
          {result.recommendedTools && result.recommendedTools.length > 0 && (
            <div className="gba:space-y-2">
              <Label className="gba:text-xs gba:text-muted-foreground">Recommended Tools</Label>
              <div className="gba:flex gba:flex-wrap gba:gap-1">
                {result.recommendedTools.map((toolId, idx) => (
                  <Badge key={idx} variant="info" className="gba:text-[10px]">
                    {toolId.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              <div className="gba:text-[10px] gba:text-muted-foreground gba:italic">
                These tools will be auto-selected when you apply this configuration
              </div>
            </div>
          )}

          {/* EveryAI specific fields */}
          {agentType === 'everyai' && (
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">Specialty</Label>
                <div className="gba:text-sm">{result.specialty || '-'}</div>
              </div>
              <div className="gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">Response Style</Label>
                <Badge variant="secondary" className="gba:text-[10px]">
                  {result.responseStyle}
                </Badge>
              </div>
              <div className="gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">Citation Mode</Label>
                <Badge variant="secondary" className="gba:text-[10px]">
                  {result.citationMode}
                </Badge>
              </div>
              {result.tags.length > 0 && (
                <div className="gba:space-y-1">
                  <Label className="gba:text-xs gba:text-muted-foreground">Tags</Label>
                  <div className="gba:flex gba:flex-wrap gba:gap-1">
                    {result.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="gba:text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-4 gba:py-3 gba:border-t gba:border-border">
          <Button variant="ghost" size="sm" onClick={handleClose} data-testid={`${testId}-discard-button`}>
            <XIcon size={16} className="gba:mr-2" />
            Discard
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRetry} data-testid={`${testId}-retry-button`}>
            <ArrowClockwiseIcon size={16} className="gba:mr-2" />
            Regenerate
          </Button>
          <Button variant="default" size="sm" onClick={handleApply} data-testid={`${testId}-apply-button`}>
            <CheckIcon size={16} className="gba:mr-2" />
            Apply
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={open => {
        if (!open && isGenerating) return // Don't close while generating
        if (!open) handleClose()
        else setIsOpen(true)
      }}
    >
      <PopoverAnchor asChild>
        <AiButton
          variant="default"
          size="sm"
          showIcon={true}
          icon={<SparkleIcon size={16} />}
          autoExecuteSingleAction={false}
          emptyStateBehavior="enable"
          onClick={() => setIsOpen(true)}
          data-testid={`${testId}-trigger-button`}
        >
          AI Assist
        </AiButton>
      </PopoverAnchor>
      <PopoverContent side="bottom" align="start" className="gba:w-[500px] gba:p-0 gba:rounded-lg" sideOffset={8}>
        {view === 'input' && renderInputView()}
        {view === 'loading' && renderLoadingView()}
        {view === 'preview' && renderPreviewView()}
      </PopoverContent>
    </Popover>
  )
}

// Helper functions
function getPlaceholder(agentType: AgentType): string {
  switch (agentType) {
    case 'flow':
      return 'e.g., "An expert that extracts invoice data and returns structured JSON with invoice number, date, amount, and vendor details"'
    case 'everyai':
      return 'e.g., "A legal expert specializing in contract review and compliance questions, friendly but professional tone"'
    case 'general':
      return 'e.g., "A data analysis expert that can summarize reports and provide insights from business data"'
    default:
      return 'Describe what kind of AI expert you want to create...'
  }
}

function getExamples(agentType: AgentType): string[] {
  switch (agentType) {
    case 'flow':
      return [
        'Lead capture assistant that creates CRM leads from conversations',
        'Sales pipeline manager that creates opportunities',
        'Extract invoice data into structured JSON',
        'CRM data entry assistant for leads and contacts'
      ]
    case 'everyai':
      return [
        'HR expert for employee questions',
        'Sales assistant that can capture lead information',
        'IT support helpdesk agent',
        'Product documentation expert'
      ]
    case 'general':
      return [
        'Data analysis and reporting',
        'Lead qualification expert',
        'Code review helper',
        'Customer relationship assistant'
      ]
    default:
      return []
  }
}

export default TaskExpertAiAssist
