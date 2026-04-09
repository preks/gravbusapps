import { useCallback, useMemo, useState } from 'react'
import { BrainIcon, CaretDownIcon, CaretUpIcon, CheckIcon, CopyIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { ChatMessage, StructuredInputRequestEvent } from '../../types/enterpriseAgent'
import { PlanRenderer } from '../renderers/PlanRenderer'
import { ToolCallRenderer } from '../renderers/ToolCallRenderer'
import { ToolResultRenderer } from '../renderers/ToolResultRenderer'
import { ReflectionRenderer } from '../renderers/ReflectionRenderer'
import { ExpertCallRenderer } from '../renderers/ExpertCallRenderer'
import { StructuredInputForm } from '../renderers/StructuredInputForm'
import { FinalAnswerRenderer } from '../renderers/FinalAnswerRenderer'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

const formatMessageTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const USER_PROMPT_COLLAPSE_CHARS = 260

const AssistantLockup = ({ trailing }: { trailing?: React.ReactNode }) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:mb-3">
    <span className="gba:text-[12px] gba:font-bold gba:tracking-[0.01em] gba:text-foreground">
      NEWWORK Enterprise Agents
    </span>
    {trailing}
  </div>
)

const UserMessageBubble = ({ message }: { message: ChatMessage }) => {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const content = message.content as string
  const timestampLabel = useMemo(() => formatMessageTimestamp(message.timestamp), [message.timestamp])
  const isCollapsible = content.length > USER_PROMPT_COLLAPSE_CHARS
  const visibleContent =
    isCollapsible && !expanded ? `${content.slice(0, USER_PROMPT_COLLAPSE_CHARS).trimEnd()}…` : content

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 1800)
    })
  }, [content])

  return (
    <div className="gba:flex gba:flex-col gba:items-end gba:py-2" data-testid={`msg-${message.id}`}>
      <div className="gba:max-w-[85%] gba:rounded-[1.15rem] gba:bg-muted/40 gba:px-4 gba:py-2.5 gba:text-[14px] gba:leading-6 gba:font-normal gba:text-foreground">
        {visibleContent}
      </div>
      <div className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:px-1">
        <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground">You</span>
        {timestampLabel && <span className="gba:text-[11px] gba:text-muted-foreground/70">{timestampLabel}</span>}
        {isCollapsible && (
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:h-6 gba:px-2 gba:rounded-full gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            aria-label={expanded ? 'Collapse prompt' : 'Expand prompt'}
            data-testid={`toggle-${message.id}`}
          >
            <span>{expanded ? 'Less' : 'More'}</span>
            {expanded ? <CaretUpIcon className="gba:h-3 gba:w-3" /> : <CaretDownIcon className="gba:h-3 gba:w-3" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          aria-label="Copy prompt"
          data-testid={`copy-${message.id}`}
        >
          {copied ? (
            <CheckIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          ) : (
            <CopyIcon className="gba:h-3.5 gba:w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  sessionId: string
  onReply?: (answer?: string, structuredInput?: Record<string, any>) => void
  onViewArtifact?: (artifactName: string) => void
}

export const MessageBubble = ({ message, onReply, onViewArtifact }: MessageBubbleProps) => {
  switch (message.type) {
    case 'user_input': {
      return <UserMessageBubble message={message} />
    }

    case 'agent_thinking': {
      const content = message.content as string
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:rounded-2xl gba:border gba:border-border/45 gba:bg-background gba:px-5 gba:py-4 gba:shadow-[0_4px_16px_rgba(15,23,42,0.035)]">
            <AssistantLockup
              trailing={<span className="gba:text-[11px] gba:text-muted-foreground">Working on it</span>}
            />
            <div className="gba:flex gba:items-start gba:gap-3">
              <BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:mt-0.5 gba:shrink-0" />
              <div className="gba:text-[15px] gba:text-foreground/88 gba:leading-7">
                <MarkdownWithChipsRenderer content={content} />
              </div>
            </div>
          </div>
        </div>
      )
    }

    case 'plan': {
      const { todos } = message.content as { todos: Parameters<typeof PlanRenderer>[0]['todos'] }
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <PlanRenderer todos={todos} isLive={!!message.isStreaming} />
        </div>
      )
    }

    case 'tool_call': {
      const content = message.content as Parameters<typeof ToolCallRenderer>[0]
      return (
        <div className="gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ToolCallRenderer {...content} />
        </div>
      )
    }

    case 'tool_result': {
      const content = message.content as Parameters<typeof ToolResultRenderer>[0]
      return (
        <div className="gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ToolResultRenderer {...content} />
        </div>
      )
    }

    case 'reflection': {
      const content = message.content as Parameters<typeof ReflectionRenderer>[0]['result']
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <ReflectionRenderer result={content} />
        </div>
      )
    }

    case 'expert_call': {
      const content = message.content as Parameters<typeof ExpertCallRenderer>[0]
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <ExpertCallRenderer {...content} />
        </div>
      )
    }

    case 'structured_input_request': {
      const formData = message.content as StructuredInputRequestEvent
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <StructuredInputForm
            formId={formData.form_id}
            title={formData.title}
            description={formData.description}
            fields={formData.fields}
            allowPartialSubmit={formData.allow_partial_submit}
            onSubmit={(values, aiDelegated) => {
              if (onReply) {
                const structuredPayload = aiDelegated.length > 0 ? { ...values, _ai_should_fill: aiDelegated } : values
                onReply(undefined, structuredPayload)
              }
            }}
          />
        </div>
      )
    }

    case 'final_answer': {
      const content = message.content as Parameters<typeof FinalAnswerRenderer>[0]
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <FinalAnswerRenderer {...content} onViewArtifact={onViewArtifact} />
        </div>
      )
    }

    case 'error': {
      const { message: errMsg } = message.content as { message: string }
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-2xl gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-5 gba:py-4">
            <WarningCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive gba:shrink-0 gba:mt-0.5" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-destructive gba:mb-0.5">Session failed</p>
              <p className="gba:text-sm gba:text-muted-foreground">{errMsg}</p>
            </div>
          </div>
        </div>
      )
    }

    default: {
      const content = message.content as string | undefined
      return (
        <div className="gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:rounded-2xl gba:bg-muted/45 gba:px-5 gba:py-4 gba:text-[15px] gba:leading-7">
            {typeof content === 'string' ? <MarkdownWithChipsRenderer content={content} /> : null}
          </div>
        </div>
      )
    }
  }
}
