import * as React from 'react'
import { StreamingMarkdown } from '@/common/components/markdown/StreamingMarkdown'
import type { EnterprisePresentationMode } from '../../types/enterpriseAgent'
import { AgentThinkingStream } from './AgentThinkingStream'
import { AgentActivityTimeline } from './AgentActivityTimeline'
import { useAnimatedGreeting } from './useAnimatedGreeting'

interface StreamingAnswerBubbleProps {
  greetingContent: string
  responseContent: string
  thinkingContent: string
  isStreaming: boolean
  statusMessage?: string | null
  activityLines?: readonly string[]
  presentationMode?: EnterprisePresentationMode
}

const ThinkingIndicator: React.FC = () => (
  <div className="gba:flex gba:items-center gba:gap-2.5">
    <div className="gba:flex gba:items-center gba:gap-1.5">
      <span
        className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary/70"
        style={{ animation: 'thinking-dot 1.4s ease-in-out infinite' }}
      />
      <span
        className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary/50"
        style={{ animation: 'thinking-dot 1.4s ease-in-out 0.2s infinite' }}
      />
      <span
        className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary/30"
        style={{ animation: 'thinking-dot 1.4s ease-in-out 0.4s infinite' }}
      />
    </div>
    <span className="gba:text-sm gba:text-muted-foreground gba:font-medium">Thinking...</span>
  </div>
)

const getStreamingVariant = (presentationMode: EnterprisePresentationMode): 'default' | 'enterprise' =>
  presentationMode === 'enterprise_agents' ? 'enterprise' : 'default'

const getResponseSpacingClass = (
  presentationMode: EnterprisePresentationMode,
  hasGreetingContent: boolean
): string | undefined => {
  if (!hasGreetingContent) return undefined
  return presentationMode === 'enterprise_agents' ? 'gba:mt-5' : 'gba:mt-4'
}

interface StreamingAnswerContentProps {
  greetingContent: string
  animatedGreetingContent: string
  isGreetingAnimating: boolean
  responseContent: string
  thinkingContent: string
  isStreaming: boolean
  statusMessage?: string | null
  activityLines?: readonly string[]
  presentationMode: EnterprisePresentationMode
}

const StreamingAnswerContent: React.FC<StreamingAnswerContentProps> = ({
  greetingContent,
  animatedGreetingContent,
  isGreetingAnimating,
  responseContent,
  thinkingContent,
  isStreaming,
  statusMessage,
  activityLines,
  presentationMode
}) => {
  const streamingVariant = getStreamingVariant(presentationMode)
  const responseSpacingClass = getResponseSpacingClass(presentationMode, Boolean(greetingContent))

  return (
    <div className="gba:relative">
      {greetingContent ? (
        <div
          className={`gba:transition-opacity gba:duration-200 ${
            animatedGreetingContent ? 'gba:opacity-100' : 'gba:opacity-0'
          }`}
        >
          <StreamingMarkdown
            content={animatedGreetingContent}
            isStreaming={isGreetingAnimating}
            variant={streamingVariant}
          />
        </div>
      ) : null}
      {thinkingContent ? <AgentThinkingStream thinkingText={thinkingContent} isStreaming={isStreaming} /> : null}
      {isStreaming ? (
        <AgentActivityTimeline
          activityLines={activityLines}
          currentStatus={statusMessage || 'Processing your request...'}
          isStreaming={isStreaming}
        />
      ) : null}
      {responseContent ? (
        <div className={responseSpacingClass}>
          <StreamingMarkdown content={responseContent} isStreaming={isStreaming} variant={streamingVariant} />
        </div>
      ) : null}
    </div>
  )
}

export const StreamingAnswerBubble: React.FC<StreamingAnswerBubbleProps> = ({
  greetingContent,
  responseContent,
  thinkingContent,
  isStreaming,
  statusMessage,
  activityLines,
  presentationMode = 'default'
}) => {
  const { animatedGreetingContent, isGreetingAnimating } = useAnimatedGreeting(greetingContent)

  if (!greetingContent && !responseContent && !isStreaming) return null

  const hasVisibleContent = Boolean(
    greetingContent || responseContent || statusMessage || (activityLines && activityLines.length > 0) || isStreaming
  )

  return (
    <div
      className="gba:w-full gba:overflow-hidden gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-200"
      data-testid="enterprise-agent-streaming-answer"
      data-presentation-mode={presentationMode}
    >
      <style>{`
        @keyframes thinking-dot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>

      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <span className="gba:text-[12px] gba:font-bold gba:tracking-[0.01em] gba:text-foreground">
          NEWWORK Enterprise Agents
        </span>
        <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground">
          <span className="gba:relative gba:flex gba:h-2 gba:w-2">
            <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-primary gba:opacity-75" />
            <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-primary" />
          </span>{' '}
          Generating response
        </span>
      </div>

      <div className="gba:border-t gba:border-border/70" />

      <div className="gba:pt-5 gba:min-h-[2.5rem]">
        {hasVisibleContent ? (
          <StreamingAnswerContent
            greetingContent={greetingContent}
            animatedGreetingContent={animatedGreetingContent}
            isGreetingAnimating={isGreetingAnimating}
            responseContent={responseContent}
            thinkingContent={thinkingContent}
            isStreaming={isStreaming}
            statusMessage={statusMessage}
            activityLines={activityLines}
            presentationMode={presentationMode}
          />
        ) : (
          <ThinkingIndicator />
        )}
      </div>
    </div>
  )
}
