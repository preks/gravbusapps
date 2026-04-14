import type { FC } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { StreamingMarkdown } from '@/common/components/markdown/StreamingMarkdown'

interface StreamingAnswerBubbleProps {
  content: string
  isStreaming: boolean
}

const StreamingCursor: FC = () => (
  <span
    className="gba:inline-block gba:w-[3px] gba:h-[1.1em] gba:bg-primary gba:rounded-[1px] gba:ml-0.5 gba:align-text-bottom"
    style={{
      animation: 'cursor-blink 1s ease-in-out infinite'
    }}
    aria-hidden="true"
  />
)

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

export const StreamingAnswerBubble: FC<StreamingAnswerBubbleProps> = ({ content, isStreaming }) => {
  const [displayedContent, setDisplayedContent] = useState('')
  const targetContentRef = useRef(content)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef(0)
  const isAnimatingRef = useRef(false)

  const runAnimation = useCallback(() => {
    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastUpdateRef.current
      if (elapsed < 12) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }
      lastUpdateRef.current = timestamp

      const target = targetContentRef.current
      setDisplayedContent(prev => {
        if (prev.length >= target.length) {
          isAnimatingRef.current = false
          return target
        }

        const remaining = target.length - prev.length
        const speed = Math.max(2, Math.min(8, Math.ceil(remaining / 15)))
        const charsToAdd = Math.min(speed, remaining)
        const next = target.slice(0, prev.length + charsToAdd)

        if (next.length < target.length) {
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          isAnimatingRef.current = false
        }

        return next
      })
    }

    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [])

  useEffect(() => {
    targetContentRef.current = content

    if (!content) {
      setDisplayedContent('')
      return
    }

    if (content.length > displayedContent.length) {
      runAnimation()
    } else if (content !== displayedContent) {
      setDisplayedContent(content)
    }
  }, [content, displayedContent, runAnimation])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  if (!content && !isStreaming) return null

  const showCursor = isStreaming || displayedContent.length < content.length

  return (
    <div
      className="gba:w-full gba:overflow-hidden gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-200"
      data-testid="enterprise-agent-streaming-answer"
    >
      <style>{`
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
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
        {displayedContent ? (
          <div className="gba:relative">
            <StreamingMarkdown content={displayedContent} isStreaming={isStreaming} />
            {showCursor && <StreamingCursor />}
          </div>
        ) : (
          <ThinkingIndicator />
        )}
      </div>
    </div>
  )
}
