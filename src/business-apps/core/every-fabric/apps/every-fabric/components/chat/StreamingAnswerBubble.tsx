import * as React from 'react'
import { StreamingMarkdown } from '@/common/components/markdown/StreamingMarkdown'
import type { EnterprisePresentationMode, PlanItem } from '../../types/enterpriseAgent'
import { ElegantStatusIndicator } from './ElegantStatusIndicator'
import { AgentThinkingStream } from './AgentThinkingStream'
import { AgentPlanReveal } from './AgentPlanReveal'
import { StreamingPreviewBubble } from './StreamingPreviewBubble'
import { useAnimatedGreeting } from './useAnimatedGreeting'

interface StreamingAnswerBubbleProps {
  greetingContent: string
  responseContent: string
  thinkingContent: string
  isStreaming: boolean
  statusMessage?: string | null
  planItems?: PlanItem[]
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
  planItems?: PlanItem[]
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
  planItems,
  activityLines,
  presentationMode
}) => {
  const streamingVariant = getStreamingVariant(presentationMode)
  const responseSpacingClass = getResponseSpacingClass(presentationMode, Boolean(greetingContent))
  // The plan card only renders when the agent has actually produced a
  // checklist; the static template ack ("Working on this. I'll draw on …")
  // is no longer surfaced as a primary block — the activity ticker
  // (StreamingPreviewBubble) and ElegantStatusIndicator carry that signal.
  const hasPlanContent = Boolean(planItems && planItems.length > 0)
  // Once the final answer is clearly streaming, collapse the plan reveal
  // card to a thin recap line so the user's eyes land on the actual answer.
  const isPlanCollapsing = Boolean(responseContent && responseContent.length > 40)

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
      {isStreaming ? <ElegantStatusIndicator statusText={statusMessage || 'Processing your request...'} /> : null}
      <StreamingPreviewBubble activityLines={activityLines} isStreaming={isStreaming} />
      {hasPlanContent ? <AgentPlanReveal items={planItems ?? []} isCollapsing={isPlanCollapsing} /> : null}
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
  planItems,
  activityLines,
  presentationMode = 'default'
}) => {
  const { animatedGreetingContent, isGreetingAnimating } = useAnimatedGreeting(greetingContent)

  if (!greetingContent && !responseContent && !isStreaming) return null

  const hasVisibleContent = Boolean(
    greetingContent ||
      responseContent ||
      statusMessage ||
      (planItems && planItems.length > 0) ||
      (activityLines && activityLines.length > 0) ||
      isStreaming
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
            planItems={planItems}
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
