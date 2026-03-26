import type { ChatMessage } from '../../types/enterpriseAgent'
import { Brain, WarningCircle } from '@phosphor-icons/react'
import { PlanRenderer } from '../renderers/PlanRenderer'
import { ToolCallRenderer } from '../renderers/ToolCallRenderer'
import { ToolResultRenderer } from '../renderers/ToolResultRenderer'
import { ReflectionRenderer } from '../renderers/ReflectionRenderer'
import { ExpertCallRenderer } from '../renderers/ExpertCallRenderer'
import { HumanInterruptCard } from '../renderers/HumanInterruptCard'
import { FinalAnswerRenderer } from '../renderers/FinalAnswerRenderer'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

interface MessageBubbleProps {
  message: ChatMessage
  sessionId: string
  onReply?: (answer: string) => void
}

export const MessageBubble = ({ message, sessionId, onReply }: MessageBubbleProps) => {
  switch (message.type) {
    case 'user_input': {
      const content = message.content as string
      return (
        <div className="gba:flex gba:justify-end gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:max-w-3xl gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:rounded-tr-md gba:px-4 gba:py-2.5 gba:text-sm">
            {content}
          </div>
        </div>
      )
    }

    case 'agent_thinking': {
      const content = message.content as string
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:bg-muted/50 gba:border gba:border-border/60 gba:px-4 gba:py-3 gba:max-w-4xl">
            <Brain className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:mt-0.5 gba:shrink-0" />
            <div className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">
              <MarkdownWithChipsRenderer content={content} />
            </div>
          </div>
        </div>
      )
    }

    case 'plan': {
      const { todos } = message.content as { todos: Parameters<typeof PlanRenderer>[0]['todos'] }
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <PlanRenderer todos={todos} isLive={!!message.isStreaming} />
        </div>
      )
    }

    case 'tool_call': {
      const content = message.content as Parameters<typeof ToolCallRenderer>[0]
      return (
        <div className="gba:px-4 gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ToolCallRenderer {...content} />
        </div>
      )
    }

    case 'tool_result': {
      const content = message.content as Parameters<typeof ToolResultRenderer>[0]
      return (
        <div className="gba:px-4 gba:py-0.5" data-testid={`msg-${message.id}`}>
          <ToolResultRenderer {...content} />
        </div>
      )
    }

    case 'reflection': {
      const content = message.content as Parameters<typeof ReflectionRenderer>[0]['result']
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <ReflectionRenderer result={content} />
        </div>
      )
    }

    case 'expert_call': {
      const content = message.content as Parameters<typeof ExpertCallRenderer>[0]
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <ExpertCallRenderer {...content} />
        </div>
      )
    }

    case 'human_interrupt': {
      const { question } = message.content as { question: string }
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <HumanInterruptCard question={question} sessionId={sessionId} onAnswer={onReply ?? (() => undefined)} />
        </div>
      )
    }

    case 'final_answer': {
      const content = message.content as Parameters<typeof FinalAnswerRenderer>[0]
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <FinalAnswerRenderer {...content} />
        </div>
      )
    }

    case 'error': {
      const { message: errMsg } = message.content as { message: string }
      return (
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-4 gba:py-3">
            <WarningCircle className="gba:h-4 gba:w-4 gba:text-destructive gba:flex-shrink-0 gba:mt-0.5" />
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
        <div className="gba:px-4 gba:py-1" data-testid={`msg-${message.id}`}>
          <div className="gba:rounded-xl gba:bg-muted gba:px-4 gba:py-3 gba:text-sm gba:max-w-3xl">
            {typeof content === 'string' ? <MarkdownWithChipsRenderer content={content} /> : null}
          </div>
        </div>
      )
    }
  }
}
