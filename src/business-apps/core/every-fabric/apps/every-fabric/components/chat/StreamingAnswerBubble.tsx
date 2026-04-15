import { type FC, useEffect, useRef, useState } from 'react'
import { StreamingMarkdown } from '@/common/components/markdown/StreamingMarkdown'
import { ElegantStatusIndicator } from './ElegantStatusIndicator'

interface StreamingAnswerBubbleProps {
  greetingContent: string
  responseContent: string
  isStreaming: boolean
  statusMessage?: string | null
}

const GREETING_INITIAL_DELAY_MS = 70
const GREETING_STEP_MS = 18
const GREETING_MAX_STEPS = 48

const ThinkingIndicator: FC = () => (
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

export const StreamingAnswerBubble: FC<StreamingAnswerBubbleProps> = ({
  greetingContent,
  responseContent,
  isStreaming,
  statusMessage
}) => {
  const [animatedGreetingContent, setAnimatedGreetingContent] = useState(greetingContent)
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animatedGreetingRef = useRef('')

  useEffect(() => {
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current)
      greetingTimerRef.current = null
    }

    if (!greetingContent) {
      animatedGreetingRef.current = ''
      setAnimatedGreetingContent('')
      return
    }

    if (animatedGreetingRef.current === greetingContent) {
      setAnimatedGreetingContent(greetingContent)
      return
    }

    let visibleChars = 0
    const stepSize = Math.max(1, Math.ceil(greetingContent.length / GREETING_MAX_STEPS))

    const revealNextChunk = () => {
      visibleChars = Math.min(greetingContent.length, visibleChars + stepSize)
      const nextContent = greetingContent.slice(0, visibleChars)
      setAnimatedGreetingContent(nextContent)

      if (visibleChars < greetingContent.length) {
        greetingTimerRef.current = setTimeout(revealNextChunk, GREETING_STEP_MS)
        return
      }

      animatedGreetingRef.current = greetingContent
      greetingTimerRef.current = null
    }

    animatedGreetingRef.current = ''
    setAnimatedGreetingContent('')
    greetingTimerRef.current = setTimeout(revealNextChunk, GREETING_INITIAL_DELAY_MS)

    return () => {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current)
        greetingTimerRef.current = null
      }
    }
  }, [greetingContent])

  if (!greetingContent && !responseContent && !isStreaming) return null

  const isGreetingAnimating =
    animatedGreetingContent.length > 0 && animatedGreetingContent.length < greetingContent.length

  return (
    <div
      className="gba:w-full gba:overflow-hidden gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-200"
      data-testid="enterprise-agent-streaming-answer"
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
        {greetingContent || responseContent ? (
          <div className="gba:relative">
            {greetingContent ? (
              <div
                className={`gba:transition-opacity gba:duration-200 ${
                  animatedGreetingContent ? 'gba:opacity-100' : 'gba:opacity-0'
                }`}
              >
                <StreamingMarkdown content={animatedGreetingContent} isStreaming={isGreetingAnimating} />
              </div>
            ) : null}
            {isStreaming && statusMessage ? <ElegantStatusIndicator statusText={statusMessage} /> : null}
            {responseContent ? (
              <div className={greetingContent ? 'gba:mt-4' : undefined}>
                <StreamingMarkdown content={responseContent} isStreaming={isStreaming} />
              </div>
            ) : null}
          </div>
        ) : (
          <ThinkingIndicator />
        )}
      </div>
    </div>
  )
}
